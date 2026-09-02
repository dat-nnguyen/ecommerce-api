import {
  productIdParamSchema,
  createProductSchema,
  updateProductSchema,
  queryProductsSchema,
} from '../../src/validators/product.validator.js';

describe('Product Validation Schemas (Unit Tests)', () => {
  describe('productIdParamSchema', () => {
    it('should validate a valid 24-character hexadecimal ObjectId', async () => {
      const validPayload = {
        params: { id: '507f1f77bcf86cd799439011' },
      };
      const result = await productIdParamSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject non-ObjectId parameter strings', async () => {
      const invalidPayload = {
        params: { id: 'invalid-id-123' },
      };
      const result = await productIdParamSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Invalid product ID format');
    });
  });

  describe('createProductSchema', () => {
    const validProductBody = {
      name: 'Wireless Noise-Canceling Headphones',
      description: 'Premium over-ear headphones with superior audio clarity and ANC.',
      price: 299.99,
      category: 'Electronics',
      stock: 50,
      sku: 'HEADPHONE-PRO-01',
      images: ['https://example.com/images/hp1.jpg'],
    };

    it('should validate a valid product creation payload', async () => {
      const result = await createProductSchema.safeParseAsync({ body: validProductBody });
      expect(result.success).toBe(true);
      expect(result.data.body.sku).toBe('HEADPHONE-PRO-01');
    });

    it('should reject missing required fields', async () => {
      const result = await createProductSchema.safeParseAsync({ body: {} });
      expect(result.success).toBe(false);
      expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
    });

    it('should reject negative price or negative stock', async () => {
      const invalidPayload = {
        body: {
          ...validProductBody,
          price: -10,
          stock: -5,
        },
      };
      const result = await createProductSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues.some((i) => i.message.includes('non-negative'))).toBe(true);
    });

    it('should reject invalid image URLs', async () => {
      const invalidPayload = {
        body: {
          ...validProductBody,
          images: ['not-a-valid-url'],
        },
      };
      const result = await createProductSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('valid URL');
    });
  });

  describe('updateProductSchema', () => {
    it('should validate partial product updates', async () => {
      const validPayload = {
        body: { price: 249.99, stock: 45 },
      };
      const result = await updateProductSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
      expect(result.data.body.price).toBe(249.99);
    });

    it('should reject empty update body', async () => {
      const result = await updateProductSchema.safeParseAsync({ body: {} });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('At least one field must be provided');
    });
  });

  describe('queryProductsSchema', () => {
    it('should validate and coerce query parameters with defaults', async () => {
      const queryPayload = {
        query: {
          search: 'headphones',
          category: 'Electronics',
          minPrice: '50',
          maxPrice: '300',
          page: '2',
          limit: '15',
        },
      };
      const result = await queryProductsSchema.safeParseAsync(queryPayload);
      expect(result.success).toBe(true);
      expect(result.data.query.minPrice).toBe(50);
      expect(result.data.query.page).toBe(2);
      expect(result.data.query.limit).toBe(15);
    });

    it('should assign default pagination if not specified', async () => {
      const result = await queryProductsSchema.safeParseAsync({ query: {} });
      expect(result.success).toBe(true);
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.limit).toBe(20);
    });
  });
});
