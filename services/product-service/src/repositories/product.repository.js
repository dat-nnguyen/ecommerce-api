import Product from '../models/product.model.js';

/**
 * TODO 4.2.2: Product Repository Layer
 *
 * Requirements:
 * Implement data access methods isolating Mongoose queries from domain logic:
 * - createProduct(data): Persist a new product.
 * - findProductById(id): Find active or any product by MongoDB ObjectId.
 * - findProductBySku(sku): Find by unique SKU code.
 * - findProducts({ filter, sort, page, limit }): Paginated product query with filtering.
 * - updateProduct(id, updateData): Update product fields.
 * - deleteProduct(id): Soft-delete (set isActive = false) or hard delete.
 * - decrementStock(id, quantity): Atomic decrement with stock availability check.
 */

export async function createProduct(data) {
  // TODO: Implement createProduct
  return Product.create(data);
}

export async function findProductById(id) {
  // TODO: Implement findProductById
  return Product.findById(id);
}

export async function findProductBySku(sku) {
  // TODO: Implement findProductBySku
  return Product.findOne({ sku: sku.toUpperCase() });
}

export async function findProducts({
  filter = {},
  sort = { createdAt: -1 },
  page = 1,
  limit = 20,
} = {}) {
  // TODO: Implement paginated findProducts with countDocuments
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateProduct(id, updateData) {
  // TODO: Implement updateProduct
  return Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
}

export async function deleteProduct(id) {
  // TODO: Implement soft delete (isActive: false)
  return Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

export async function decrementStock(id, quantity) {
  // TODO: Atomic update: decrement stock only if stock >= quantity
  return Product.findOneAndUpdate(
    { _id: id, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
}

export default {
  createProduct,
  findProductById,
  findProductBySku,
  findProducts,
  updateProduct,
  deleteProduct,
  decrementStock,
};
