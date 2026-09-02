import productService from '../services/product.service.js';

/**
 * Handles product listing with query filters and pagination (GET /api/v1/products).
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function listProducts(req, res, next) {
  try {
    const query = req.validatedData?.query || req.query;
    const result = await productService.listProducts(query);

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles single product lookup by ID (GET /api/v1/products/:id).
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles product creation (POST /api/v1/products).
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function createProduct(req, res, next) {
  try {
    const payload = req.validatedData?.body || req.body;
    const product = await productService.createProduct(payload);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles partial product updates (PATCH /api/v1/products/:id).
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const payload = req.validatedData?.body || req.body;
    const product = await productService.updateProduct(id, payload);

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles product soft deletion (DELETE /api/v1/products/:id).
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export default {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
