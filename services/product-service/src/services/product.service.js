import { NotFoundError, ConflictError } from '@ecommerce/common-errors';
import productRepository from '../repositories/product.repository.js';

/**
 * TODO 4.3.1: Product Domain Service Layer
 *
 * Requirements:
 * Implement business logic & validation rules:
 * - createProduct(data): Enforces SKU uniqueness, creates product.
 * - getProductById(id): Retrieves product or throws NotFoundError.
 * - listProducts(queryParams): Formats filter (category, minPrice, maxPrice, search text), sorting, and pagination.
 * - updateProduct(id, updateData): Validates existence and SKU conflicts if SKU changed.
 * - deleteProduct(id): Soft-deletes product.
 */

export async function createProduct(data) {
  // TODO: Check SKU uniqueness, throw ConflictError if taken
  const existing = await productRepository.findProductBySku(data.sku);
  if (existing) {
    throw new ConflictError(`Product with SKU '${data.sku}' already exists`);
  }

  return productRepository.createProduct(data);
}

export async function getProductById(id) {
  // TODO: Find product or throw NotFoundError
  const product = await productRepository.findProductById(id);
  if (!product || !product.isActive) {
    throw new NotFoundError(`Product with id '${id}' not found`);
  }
  return product;
}

export async function listProducts(query = {}) {
  // TODO: Build MongoDB filter from query params (category, search, price range)
  const filter = { isActive: true };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice);
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

  return productRepository.findProducts({ filter, page, limit });
}

export async function updateProduct(id, updateData) {
  // TODO: Validate product exists, check SKU conflicts, apply updates
  const product = await productRepository.findProductById(id);
  if (!product || !product.isActive) {
    throw new NotFoundError(`Product with id '${id}' not found`);
  }

  if (updateData.sku && updateData.sku.toUpperCase() !== product.sku) {
    const existing = await productRepository.findProductBySku(updateData.sku);
    if (existing && existing.id !== id) {
      throw new ConflictError(`Product with SKU '${updateData.sku}' already exists`);
    }
  }

  return productRepository.updateProduct(id, updateData);
}

export async function deleteProduct(id) {
  // TODO: Soft delete product
  const product = await productRepository.findProductById(id);
  if (!product || !product.isActive) {
    throw new NotFoundError(`Product with id '${id}' not found`);
  }

  return productRepository.deleteProduct(id);
}

export default {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  deleteProduct,
};
