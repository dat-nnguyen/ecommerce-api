import { jest } from '@jest/globals';
import productService from '../../src/services/product.service.js';
import * as productController from '../../src/controllers/product.controller.js';

describe('Product Controller (Unit Tests)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {}, validatedData: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('listProducts should return 200 with items and pagination metadata', async () => {
    const mockResult = {
      items: [{ id: 'p1', name: 'Product 1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    jest.spyOn(productService, 'listProducts').mockResolvedValue(mockResult);

    await productController.listProducts(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockResult.items,
      pagination: mockResult.pagination,
    });
  });

  it('getProduct should return 200 with single product', async () => {
    req.params = { id: 'p1' };
    const mockProduct = { id: 'p1', name: 'Product 1' };
    jest.spyOn(productService, 'getProductById').mockResolvedValue(mockProduct);

    await productController.getProduct(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockProduct,
    });
  });

  it('createProduct should return 201 Created with created product', async () => {
    const payload = { name: 'New Product', price: 99.99 };
    req.body = payload;
    const mockCreated = { id: 'p1', ...payload };
    jest.spyOn(productService, 'createProduct').mockResolvedValue(mockCreated);

    await productController.createProduct(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Product created successfully',
      data: mockCreated,
    });
  });

  it('updateProduct should return 200 with updated product', async () => {
    req.params = { id: 'p1' };
    req.body = { price: 79.99 };
    const mockUpdated = { id: 'p1', price: 79.99 };
    jest.spyOn(productService, 'updateProduct').mockResolvedValue(mockUpdated);

    await productController.updateProduct(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Product updated successfully',
      data: mockUpdated,
    });
  });

  it('deleteProduct should return 200 with deletion message', async () => {
    req.params = { id: 'p1' };
    jest.spyOn(productService, 'deleteProduct').mockResolvedValue();

    await productController.deleteProduct(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Product deleted successfully',
    });
  });

  it('should forward errors to next middleware', async () => {
    const error = new Error('Database error');
    jest.spyOn(productService, 'listProducts').mockRejectedValue(error);

    await productController.listProducts(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
