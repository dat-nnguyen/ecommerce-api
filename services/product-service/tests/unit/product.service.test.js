import { jest } from '@jest/globals';
import { NotFoundError, ConflictError } from '@ecommerce/common-errors';
import productRepository from '../../src/repositories/product.repository.js';
import productService from '../../src/services/product.service.js';

describe('Product Domain Service (Unit Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createProduct', () => {
    it('should create product when SKU is unique', async () => {
      const payload = { name: 'Monitor', sku: 'MON-01', price: 299 };
      jest.spyOn(productRepository, 'findProductBySku').mockResolvedValue(null);
      jest.spyOn(productRepository, 'createProduct').mockResolvedValue({ id: 'p1', ...payload });

      const result = await productService.createProduct(payload);

      expect(productRepository.findProductBySku).toHaveBeenCalledWith('MON-01');
      expect(productRepository.createProduct).toHaveBeenCalledWith(payload);
      expect(result.id).toBe('p1');
    });

    it('should throw ConflictError if SKU is already taken', async () => {
      const payload = { name: 'Monitor', sku: 'MON-01', price: 299 };
      jest.spyOn(productRepository, 'findProductBySku').mockResolvedValue({ id: 'p2', sku: 'MON-01' });

      await expect(productService.createProduct(payload)).rejects.toThrow(ConflictError);
      expect(productRepository.findProductBySku).toHaveBeenCalledWith('MON-01');
    });
  });

  describe('getProductById', () => {
    it('should return product if found and active', async () => {
      const mockProduct = { id: 'p1', name: 'Keyboard', isActive: true };
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue(mockProduct);

      const result = await productService.getProductById('p1');

      expect(productRepository.findProductById).toHaveBeenCalledWith('p1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundError if product does not exist', async () => {
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue(null);

      await expect(productService.getProductById('p1')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if product is inactive (soft-deleted)', async () => {
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue({ id: 'p1', isActive: false });

      await expect(productService.getProductById('p1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listProducts', () => {
    it('should construct MongoDB filter for search, category, and price range', async () => {
      const mockResult = { items: [{ id: 'p1' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
      jest.spyOn(productRepository, 'findProducts').mockResolvedValue(mockResult);

      const query = {
        category: 'Electronics',
        search: 'wireless',
        minPrice: 50,
        maxPrice: 200,
        page: 2,
        limit: 10,
      };

      const result = await productService.listProducts(query);

      expect(productRepository.findProducts).toHaveBeenCalledWith({
        filter: {
          isActive: true,
          category: 'Electronics',
          $text: { $search: 'wireless' },
          price: { $gte: 50, $lte: 200 },
        },
        page: 2,
        limit: 10,
      });
      expect(result).toEqual(mockResult);
    });

    it('should default pagination to page 1 and limit 20 when omitted', async () => {
      jest.spyOn(productRepository, 'findProducts').mockResolvedValue({ items: [], pagination: {} });

      await productService.listProducts({});

      expect(productRepository.findProducts).toHaveBeenCalledWith({
        filter: { isActive: true },
        page: 1,
        limit: 20,
      });
    });
  });

  describe('updateProduct', () => {
    it('should update product when product exists and SKU is unchanged', async () => {
      const existing = { id: 'p1', sku: 'KEY-01', isActive: true };
      const updateData = { price: 99.99 };
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue(existing);
      jest.spyOn(productRepository, 'updateProduct').mockResolvedValue({ ...existing, ...updateData });

      const result = await productService.updateProduct('p1', updateData);

      expect(productRepository.updateProduct).toHaveBeenCalledWith('p1', updateData);
      expect(result.price).toBe(99.99);
    });

    it('should throw ConflictError if updated SKU is taken by another product', async () => {
      const existing = { id: 'p1', sku: 'KEY-01', isActive: true };
      const conflictProduct = { id: 'p2', sku: 'KEY-NEW' };
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue(existing);
      jest.spyOn(productRepository, 'findProductBySku').mockResolvedValue(conflictProduct);

      await expect(productService.updateProduct('p1', { sku: 'KEY-NEW' })).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError if updating a non-existent product', async () => {
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue(null);

      await expect(productService.updateProduct('p1', { price: 100 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteProduct', () => {
    it('should soft-delete product when active', async () => {
      const existing = { id: 'p1', isActive: true };
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue(existing);
      jest.spyOn(productRepository, 'deleteProduct').mockResolvedValue({ id: 'p1', isActive: false });

      const result = await productService.deleteProduct('p1');

      expect(productRepository.deleteProduct).toHaveBeenCalledWith('p1');
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundError if product is already inactive or not found', async () => {
      jest.spyOn(productRepository, 'findProductById').mockResolvedValue(null);

      await expect(productService.deleteProduct('p1')).rejects.toThrow(NotFoundError);
    });
  });
});
