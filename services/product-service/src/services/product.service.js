import { NotFoundError, ConflictError } from '@ecommerce/common-errors';
import productRepository from '../repositories/product.repository.js';

/**
 * Creates a new product in the catalog after verifying SKU uniqueness.
 *
 * @param {object} data - Product creation payload.
 * @param {string} data.sku - Unique SKU code.
 * @returns {Promise<object>} Created product document.
 * @throws {ConflictError} If a product with the same SKU already exists.
 */
export async function createProduct(data) {
  const existing = await productRepository.findProductBySku(data.sku);
  if (existing) {
    throw new ConflictError(`Product with SKU '${data.sku}' already exists`);
  }

  return productRepository.createProduct(data);
}

/**
 * Retrieves an active product by its unique ObjectId.
 *
 * @param {string} id - Product ObjectId.
 * @returns {Promise<object>} Active product document.
 * @throws {NotFoundError} If the product does not exist or is inactive.
 */
export async function getProductById(id) {
  const product = await productRepository.findProductById(id);
  if (!product || !product.isActive) {
    throw new NotFoundError(`Product with id '${id}' not found`);
  }
  return product;
}

/**
 * Lists products from the catalog with optional search, category filter, price range, and pagination.
 *
 * @param {object} [query={}] - Query parameters.
 * @param {string} [query.category] - Filter by category.
 * @param {string} [query.search] - Full-text search term across name and description.
 * @param {number|string} [query.minPrice] - Minimum price boundary.
 * @param {number|string} [query.maxPrice] - Maximum price boundary.
 * @param {number|string} [query.page=1] - 1-based page number.
 * @param {number|string} [query.limit=20] - Items per page.
 * @returns {Promise<{ items: Array<object>, pagination: object }>}
 */
export async function listProducts(query = {}) {
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

/**
 * Updates an existing product's fields with SKU uniqueness validation.
 *
 * @param {string} id - Product ObjectId.
 * @param {object} updateData - Updated product fields.
 * @returns {Promise<object>} Updated product document.
 * @throws {NotFoundError} If the product does not exist or is inactive.
 * @throws {ConflictError} If the updated SKU is already taken by another product.
 */
export async function updateProduct(id, updateData) {
  const product = await productRepository.findProductById(id);
  if (!product || !product.isActive) {
    throw new NotFoundError(`Product with id '${id}' not found`);
  }

  if (updateData.sku && updateData.sku.toUpperCase() !== product.sku) {
    const existing = await productRepository.findProductBySku(updateData.sku);
    const existingId = existing?.id || existing?._id?.toString();
    if (existing && existingId !== id) {
      throw new ConflictError(`Product with SKU '${updateData.sku}' already exists`);
    }
  }

  return productRepository.updateProduct(id, updateData);
}

/**
 * Soft-deletes a product by setting its isActive status to false.
 *
 * @param {string} id - Product ObjectId.
 * @returns {Promise<object>} Soft-deleted product document.
 * @throws {NotFoundError} If the product does not exist or is already inactive.
 */
export async function deleteProduct(id) {
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
