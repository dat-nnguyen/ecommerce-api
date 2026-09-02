import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import productService from '../../src/services/product.service.js';

describe('Product Service HTTP Routes (Integration Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/products', () => {
    it('should return 200 with catalog listing', async () => {
      const mockData = {
        items: [{ id: '507f1f77bcf86cd799439011', name: 'Product 1', price: 99 }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      jest.spyOn(productService, 'listProducts').mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/products?category=Electronics&page=1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockData.items);
      expect(res.body.pagination).toEqual(mockData.pagination);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return 200 for valid ObjectId', async () => {
      const mockProduct = { id: '507f1f77bcf86cd799439011', name: 'Product 1' };
      jest.spyOn(productService, 'getProductById').mockResolvedValue(mockProduct);

      const res = await request(app).get('/api/v1/products/507f1f77bcf86cd799439011');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockProduct);
    });

    it('should return 400 when given invalid ObjectId format', async () => {
      const res = await request(app).get('/api/v1/products/not-an-object-id');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/products', () => {
    it('should return 201 when creating valid product', async () => {
      const payload = {
        name: 'Gaming Mouse',
        description: 'High performance RGB gaming mouse with 16000 DPI.',
        price: 59.99,
        category: 'Peripherals',
        stock: 100,
        sku: 'MOUSE-RGB-100',
        images: ['https://example.com/mouse.jpg'],
      };
      const mockCreated = { id: '507f1f77bcf86cd799439011', ...payload };
      jest.spyOn(productService, 'createProduct').mockResolvedValue(mockCreated);

      const res = await request(app).post('/api/v1/products').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockCreated);
    });

    it('should return 400 on invalid payload (missing fields)', async () => {
      const res = await request(app).post('/api/v1/products').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('should return 200 on valid partial update', async () => {
      const updatePayload = { price: 49.99 };
      const mockUpdated = { id: '507f1f77bcf86cd799439011', price: 49.99 };
      jest.spyOn(productService, 'updateProduct').mockResolvedValue(mockUpdated);

      const res = await request(app)
        .patch('/api/v1/products/507f1f77bcf86cd799439011')
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockUpdated);
    });

    it('should return 400 on empty update body', async () => {
      const res = await request(app).patch('/api/v1/products/507f1f77bcf86cd799439011').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('should return 200 on successful deletion', async () => {
      jest.spyOn(productService, 'deleteProduct').mockResolvedValue();

      const res = await request(app).delete('/api/v1/products/507f1f77bcf86cd799439011');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
