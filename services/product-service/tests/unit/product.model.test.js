import mongoose from 'mongoose';
import Product from '../../src/models/product.model.js';

describe('Product Model & Schema (Unit Tests)', () => {
  it('should validate a complete valid product document', () => {
    const product = new Product({
      name: 'Mechanical Keyboard',
      description: 'Customizable RGB mechanical gaming keyboard with hot-swappable switches.',
      price: 129.99,
      category: 'Peripherals',
      stock: 30,
      sku: 'KEYBOARD-RGB-01',
      images: ['https://example.com/keyboard.jpg'],
      isActive: true,
    });

    const error = product.validateSync();
    expect(error).toBeUndefined();
    expect(product.name).toBe('Mechanical Keyboard');
    expect(product.sku).toBe('KEYBOARD-RGB-01');
    expect(product.isActive).toBe(true);
    expect(product.stock).toBe(30);
  });

  it('should require mandatory fields (name, description, price, category, sku)', () => {
    const product = new Product({});
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.description).toBeDefined();
    expect(error.errors.price).toBeDefined();
    expect(error.errors.category).toBeDefined();
    expect(error.errors.sku).toBeDefined();
  });

  it('should enforce non-negative price and default stock to 0', () => {
    const product = new Product({
      name: 'Wireless Mouse',
      description: 'Ergonomic optical gaming mouse with ultra-fast sensor.',
      price: -15,
      category: 'Peripherals',
      sku: 'MOUSE-WL-01',
    });

    const error = product.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.price).toBeDefined();
    expect(product.stock).toBe(0);
    expect(product.images).toEqual([]);
    expect(product.isActive).toBe(true);
  });

  it('should format toJSON output with id and remove _id, __v', () => {
    const rawId = new mongoose.Types.ObjectId();
    const product = new Product({
      _id: rawId,
      name: 'Gaming Monitor 27"',
      description: '144Hz 1ms IPS gaming display.',
      price: 349.99,
      category: 'Displays',
      stock: 12,
      sku: 'MONITOR-144-27',
    });

    const json = product.toJSON();
    expect(json.id).toBe(rawId.toString());
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
  });

  it('should have compound and text indexes configured', () => {
    const indexes = Product.schema.indexes();
    const hasTextIndex = indexes.some(
      ([fields]) => fields.name === 'text' && fields.description === 'text'
    );
    const hasCategoryPriceIndex = indexes.some(
      ([fields]) => fields.category === 1 && fields.price === 1
    );
    const hasActiveCreatedIndex = indexes.some(
      ([fields]) => fields.isActive === 1 && fields.createdAt === -1
    );

    expect(hasTextIndex).toBe(true);
    expect(hasCategoryPriceIndex).toBe(true);
    expect(hasActiveCreatedIndex).toBe(true);
  });
});
