import Product from '../models/product.model.js';

/**
 * Creates and persists a new product document in MongoDB.
 *
 * @param {object} data - Product creation payload.
 * @returns {Promise<import('mongoose').Document>} Created product document.
 */
export async function createProduct(data) {
  return Product.create(data);
}

/**
 * Finds a product document by its MongoDB ObjectId.
 *
 * @param {string} id - 24-character hexadecimal ObjectId.
 * @returns {Promise<import('mongoose').Document|null>} Product document or null.
 */
export async function findProductById(id) {
  return Product.findById(id);
}

/**
 * Finds a product document by its unique SKU (case-insensitive).
 *
 * @param {string} sku - Product SKU.
 * @returns {Promise<import('mongoose').Document|null>} Product document or null.
 */
export async function findProductBySku(sku) {
  return Product.findOne({ sku: sku.toUpperCase() });
}

/**
 * Queries product catalog with filtering, sorting, and pagination.
 *
 * @param {object} [options] - Query options.
 * @param {object} [options.filter={}] - MongoDB query filter.
 * @param {object} [options.sort={ createdAt: -1 }] - Sort criteria.
 * @param {number} [options.page=1] - 1-based page number.
 * @param {number} [options.limit=20] - Page size limit.
 * @returns {Promise<{ items: Array<object>, pagination: { page: number, limit: number, total: number, totalPages: number } }>}
 */
export async function findProducts({
  filter = {},
  sort = { createdAt: -1 },
  page = 1,
  limit = 20,
} = {}) {
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
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

/**
 * Updates a product document by ID with validation.
 *
 * @param {string} id - Product ObjectId.
 * @param {object} updateData - Updated fields.
 * @returns {Promise<import('mongoose').Document|null>} Updated product or null.
 */
export async function updateProduct(id, updateData) {
  return Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
}

/**
 * Soft-deletes a product by setting isActive to false.
 *
 * @param {string} id - Product ObjectId.
 * @returns {Promise<import('mongoose').Document|null>} Soft-deleted product or null.
 */
export async function deleteProduct(id) {
  return Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

/**
 * Atomically decrements product stock conditional on sufficient available inventory.
 *
 * @param {string} id - Product ObjectId.
 * @param {number} quantity - Quantity to decrement.
 * @returns {Promise<import('mongoose').Document|null>} Updated product if decrement succeeded, null if insufficient stock.
 */
export async function decrementStock(id, quantity) {
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
