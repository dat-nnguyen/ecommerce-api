import {
  productIdParamSchema,
  addItemSchema,
  updateQuantitySchema,
  mergeCartSchema,
} from '../../src/validators/cart.validator.js';

describe('Cart Request Validation Schemas (Unit Tests)', () => {
  describe('productIdParamSchema', () => {
    it('should validate a valid 24-hex MongoDB ObjectId', async () => {
      const payload = { params: { productId: '507f1f77bcf86cd799439011' } };
      const result = await productIdParamSchema.safeParseAsync(payload);

      expect(result.success).toBe(true);
      expect(result.data.params.productId).toBe('507f1f77bcf86cd799439011');
    });

    it('should reject invalid or non-hexadecimal productId', async () => {
      const payload = { params: { productId: 'invalid-id-xyz' } };
      const result = await productIdParamSchema.safeParseAsync(payload);

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Invalid product ID format');
    });

    it('should reject missing productId parameter', async () => {
      const payload = { params: {} };
      const result = await productIdParamSchema.safeParseAsync(payload);

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Product ID is required');
    });
  });

  describe('addItemSchema', () => {
    const validBody = {
      productId: '507f1f77bcf86cd799439011',
      name: 'Mechanical Gaming Keyboard',
      price: 99.99,
      quantity: 2,
      image: 'https://example.com/keyboard.jpg',
    };

    it('should validate valid cart item payload', async () => {
      const result = await addItemSchema.safeParseAsync({ body: validBody });

      expect(result.success).toBe(true);
      expect(result.data.body.name).toBe('Mechanical Gaming Keyboard');
      expect(result.data.body.quantity).toBe(2);
    });

    it('should default quantity to 1 if omitted', async () => {
      const withoutQuantity = { ...validBody };
      delete withoutQuantity.quantity;
      const result = await addItemSchema.safeParseAsync({ body: withoutQuantity });

      expect(result.success).toBe(true);
      expect(result.data.body.quantity).toBe(1);
    });

    it('should reject negative price', async () => {
      const payload = { body: { ...validBody, price: -10 } };
      const result = await addItemSchema.safeParseAsync(payload);

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Price must be non-negative');
    });

    it('should allow large quantities and reject quantity below 1', async () => {
      const largeQty = await addItemSchema.safeParseAsync({
        body: { ...validBody, quantity: 250 },
      });
      const zeroQty = await addItemSchema.safeParseAsync({
        body: { ...validBody, quantity: 0 },
      });

      expect(largeQty.success).toBe(true);
      expect(largeQty.data.body.quantity).toBe(250);
      expect(zeroQty.success).toBe(false);
      expect(zeroQty.error.issues[0].message).toContain('at least 1');
    });

    it('should reject invalid image URL string', async () => {
      const payload = { body: { ...validBody, image: 'not-a-valid-url' } };
      const result = await addItemSchema.safeParseAsync(payload);

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('valid URL string');
    });
  });

  describe('updateQuantitySchema', () => {
    it('should validate non-negative integer quantity including large quantities', async () => {
      const validZero = await updateQuantitySchema.safeParseAsync({ body: { quantity: 0 } });
      const validFive = await updateQuantitySchema.safeParseAsync({ body: { quantity: 5 } });
      const validLarge = await updateQuantitySchema.safeParseAsync({ body: { quantity: 500 } });

      expect(validZero.success).toBe(true);
      expect(validZero.data.body.quantity).toBe(0);
      expect(validFive.success).toBe(true);
      expect(validFive.data.body.quantity).toBe(5);
      expect(validLarge.success).toBe(true);
      expect(validLarge.data.body.quantity).toBe(500);
    });

    it('should reject negative quantity', async () => {
      const negative = await updateQuantitySchema.safeParseAsync({ body: { quantity: -1 } });

      expect(negative.success).toBe(false);
      expect(negative.error.issues[0].message).toContain('non-negative');
    });

    it('should reject non-integer quantity', async () => {
      const floatQty = await updateQuantitySchema.safeParseAsync({ body: { quantity: 3.5 } });

      expect(floatQty.success).toBe(false);
      expect(floatQty.error.issues[0].message).toContain('must be an integer');
    });
  });

  describe('mergeCartSchema', () => {
    it('should validate non-empty guestSessionId', async () => {
      const payload = { body: { guestSessionId: 'guest-session-uuid-123' } };
      const result = await mergeCartSchema.safeParseAsync(payload);

      expect(result.success).toBe(true);
      expect(result.data.body.guestSessionId).toBe('guest-session-uuid-123');
    });

    it('should reject empty or missing guestSessionId', async () => {
      const empty = await mergeCartSchema.safeParseAsync({ body: { guestSessionId: '   ' } });
      const missing = await mergeCartSchema.safeParseAsync({ body: {} });

      expect(empty.success).toBe(false);
      expect(empty.error.issues[0].message).toContain('cannot be empty');
      expect(missing.success).toBe(false);
      expect(missing.error.issues[0].message).toContain('Guest session ID is required');
    });
  });
});
