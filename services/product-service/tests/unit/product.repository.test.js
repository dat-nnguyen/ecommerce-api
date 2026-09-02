import { jest } from '@jest/globals';
import Product from '../../src/models/product.model.js';
import productRepository from '../../src/repositories/product.repository.js';

describe('Product Repository Layer (Unit Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('createProduct should invoke Product.create with payload', async () => {
    const payload = { name: 'Monitor', price: 299, sku: 'MON-01' };
    const mockCreated = { id: '507f1f77bcf86cd799439011', ...payload };
    jest.spyOn(Product, 'create').mockResolvedValue(mockCreated);

    const result = await productRepository.createProduct(payload);

    expect(Product.create).toHaveBeenCalledWith(payload);
    expect(result).toEqual(mockCreated);
  });

  it('findProductById should invoke Product.findById with id', async () => {
    const mockProduct = { id: '507f1f77bcf86cd799439011', name: 'Monitor' };
    jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

    const result = await productRepository.findProductById('507f1f77bcf86cd799439011');

    expect(Product.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(result).toEqual(mockProduct);
  });

  it('findProductBySku should query with uppercase SKU', async () => {
    const mockProduct = { id: '507f1f77bcf86cd799439011', sku: 'MON-01' };
    jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);

    const result = await productRepository.findProductBySku('mon-01');

    expect(Product.findOne).toHaveBeenCalledWith({ sku: 'MON-01' });
    expect(result).toEqual(mockProduct);
  });

  it('findProducts should paginate and sort query results', async () => {
    const mockItems = [{ id: '1', name: 'Keyboard' }, { id: '2', name: 'Mouse' }];
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(mockItems),
    };

    jest.spyOn(Product, 'find').mockReturnValue(mockQuery);
    jest.spyOn(Product, 'countDocuments').mockResolvedValue(15);

    const result = await productRepository.findProducts({
      filter: { category: 'Peripherals' },
      page: 2,
      limit: 5,
    });

    expect(Product.find).toHaveBeenCalledWith({ category: 'Peripherals' });
    expect(mockQuery.skip).toHaveBeenCalledWith(5);
    expect(mockQuery.limit).toHaveBeenCalledWith(5);
    expect(result.items).toEqual(mockItems);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 15,
      totalPages: 3,
    });
  });

  it('updateProduct should invoke findByIdAndUpdate with runValidators: true', async () => {
    const updateData = { price: 199.99 };
    const mockUpdated = { id: '507f1f77bcf86cd799439011', price: 199.99 };
    jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(mockUpdated);

    const result = await productRepository.updateProduct('507f1f77bcf86cd799439011', updateData);

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      updateData,
      { new: true, runValidators: true }
    );
    expect(result).toEqual(mockUpdated);
  });

  it('deleteProduct should set isActive to false for soft deletion', async () => {
    const mockSoftDeleted = { id: '507f1f77bcf86cd799439011', isActive: false };
    jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(mockSoftDeleted);

    const result = await productRepository.deleteProduct('507f1f77bcf86cd799439011');

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { isActive: false },
      { new: true }
    );
    expect(result).toEqual(mockSoftDeleted);
  });

  it('decrementStock should atomically decrement stock when inventory >= quantity', async () => {
    const mockProduct = { id: '507f1f77bcf86cd799439011', stock: 8 };
    jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(mockProduct);

    const result = await productRepository.decrementStock('507f1f77bcf86cd799439011', 2);

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', stock: { $gte: 2 } },
      { $inc: { stock: -2 } },
      { new: true }
    );
    expect(result).toEqual(mockProduct);
  });
});
