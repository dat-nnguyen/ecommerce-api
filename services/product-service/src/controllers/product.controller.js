import productService from '../services/product.service.js';

/**
 * TODO 4.4.2: Product HTTP Controllers
 *
 * Controllers:
 * - listProducts: GET /api/v1/products
 * - getProduct: GET /api/v1/products/:id
 * - createProduct: POST /api/v1/products (Admin)
 * - updateProduct: PATCH /api/v1/products/:id (Admin)
 * - deleteProduct: DELETE /api/v1/products/:id (Admin)
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
