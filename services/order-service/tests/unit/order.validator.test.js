import {
  orderIdParamSchema,
  createOrderSchema,
  queryOrdersSchema,
  listOrderQuerySchema,
  cancelOrderSchema,
} from '../../src/validators/order.validator.js';

describe('Order Request Validation Schemas (Unit Tests)', () => {
  describe('orderIdParamSchema', () => {
    it('should accept a valid UUID in params.id', () => {
      const validParams = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      };
      const result = orderIdParamSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID strings in params.id', () => {
      const invalidParams = { params: { id: 'invalid-order-id' } };
      const result = orderIdParamSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('must be a valid UUID');
    });
  });

  describe('createOrderSchema', () => {
    const validItem = {
      productId: '507f1f77bcf86cd799439011',
      name: 'Mechanical Keyboard',
      price: 99.99,
      quantity: 1,
    };

    it('should validate and parse a valid order creation body', () => {
      const validBody = {
        body: {
          items: [validItem],
          currency: 'USD',
        },
      };

      const result = createOrderSchema.safeParse(validBody);
      expect(result.success).toBe(true);
      expect(result.data.body.currency).toBe('USD');
    });

    it('should default currency to USD when omitted', () => {
      const bodyWithoutCurrency = {
        body: {
          items: [validItem],
        },
      };

      const result = createOrderSchema.safeParse(bodyWithoutCurrency);
      expect(result.success).toBe(true);
      expect(result.data.body.currency).toBe('USD');
    });

    it('should reject empty items array', () => {
      const emptyItemsBody = { body: { items: [] } };
      const result = createOrderSchema.safeParse(emptyItemsBody);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('At least one item must be provided');
    });

    it('should reject invalid MongoDB ObjectId in productId', () => {
      const invalidProductBody = {
        body: {
          items: [{ ...validItem, productId: 'short-id' }],
        },
      };
      const result = createOrderSchema.safeParse(invalidProductBody);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('24-character hex ObjectId');
    });

    it('should reject negative or zero prices and quantities', () => {
      const invalidNumbersBody = {
        body: {
          items: [
            { ...validItem, price: 0, quantity: -1 },
          ],
        },
      };
      const result = createOrderSchema.safeParse(invalidNumbersBody);
      expect(result.success).toBe(false);
    });
  });

  describe('queryOrdersSchema & listOrderQuerySchema', () => {
    it('should accept valid query parameters and coerce string numbers', () => {
      const validQuery = {
        query: {
          status: 'PENDING',
          page: '2',
          limit: '15',
        },
      };

      const result = queryOrdersSchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      expect(result.data.query).toEqual({
        status: 'PENDING',
        page: 2,
        limit: 15,
      });
    });

    it('should default page to 1 and limit to 20 when omitted', () => {
      const emptyQuery = { query: {} };
      const result = listOrderQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.limit).toBe(20);
    });

    it('should reject unrecognized order status values', () => {
      const invalidStatusQuery = {
        query: { status: 'UNKNOWN_STATUS' },
      };
      const result = queryOrdersSchema.safeParse(invalidStatusQuery);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const excessiveLimitQuery = {
        query: { limit: '200' },
      };
      const result = queryOrdersSchema.safeParse(excessiveLimitQuery);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('cannot exceed 100');
    });
  });

  describe('cancelOrderSchema', () => {
    it('should accept an optional cancellation reason', () => {
      const bodyWithReason = {
        body: { reason: 'Found cheaper elsewhere' },
      };
      const result = cancelOrderSchema.safeParse(bodyWithReason);
      expect(result.success).toBe(true);
      expect(result.data.body.reason).toBe('Found cheaper elsewhere');
    });

    it('should accept empty body when reason is not provided', () => {
      const emptyBody = { body: {} };
      const result = cancelOrderSchema.safeParse(emptyBody);
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding 255 characters', () => {
      const tooLongReason = {
        body: { reason: 'a'.repeat(256) },
      };
      const result = cancelOrderSchema.safeParse(tooLongReason);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('cannot exceed 255 characters');
    });
  });
});
