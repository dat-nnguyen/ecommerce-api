import {
  processPaymentSchema,
  paymentIdParamSchema,
  orderIdParamSchema,
  refundPaymentSchema,
} from '../../src/validators/payment.validator.js';

describe('Payment Validators (Unit Tests)', () => {
  const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  describe('processPaymentSchema', () => {
    it('should validate and parse valid payment body with defaults', async () => {
      const input = {
        body: {
          orderId: validUUID,
          amount: 99.99,
        },
      };

      const parsed = await processPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(true);
      expect(parsed.data.body).toEqual({
        orderId: validUUID,
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'card',
      });
    });

    it('should uppercase custom currency and trim fields', async () => {
      const input = {
        body: {
          orderId: validUUID,
          amount: 49.5,
          currency: ' eur ',
          paymentMethod: ' paypal ',
        },
      };

      const parsed = await processPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(true);
      expect(parsed.data.body.currency).toBe('EUR');
      expect(parsed.data.body.paymentMethod).toBe('paypal');
    });

    it('should reject invalid UUID for orderId', async () => {
      const input = {
        body: {
          orderId: 'not-a-uuid',
          amount: 10,
        },
      };

      const parsed = await processPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toEqual(['body', 'orderId']);
    });

    it('should reject non-positive amount', async () => {
      const input = {
        body: {
          orderId: validUUID,
          amount: -5,
        },
      };

      const parsed = await processPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toEqual(['body', 'amount']);
    });

    it('should reject invalid currency length', async () => {
      const input = {
        body: {
          orderId: validUUID,
          amount: 25,
          currency: 'US',
        },
      };

      const parsed = await processPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toEqual(['body', 'currency']);
    });
  });

  describe('paymentIdParamSchema', () => {
    it('should accept valid payment UUID param', async () => {
      const input = { params: { id: validUUID } };
      const parsed = await paymentIdParamSchema.safeParseAsync(input);
      expect(parsed.success).toBe(true);
      expect(parsed.data.params.id).toBe(validUUID);
    });

    it('should reject invalid payment UUID param', async () => {
      const input = { params: { id: 'invalid-id' } };
      const parsed = await paymentIdParamSchema.safeParseAsync(input);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toEqual(['params', 'id']);
    });
  });

  describe('orderIdParamSchema', () => {
    it('should accept valid order UUID param', async () => {
      const input = { params: { orderId: validUUID } };
      const parsed = await orderIdParamSchema.safeParseAsync(input);
      expect(parsed.success).toBe(true);
      expect(parsed.data.params.orderId).toBe(validUUID);
    });

    it('should reject invalid order UUID param', async () => {
      const input = { params: { orderId: '12345' } };
      const parsed = await orderIdParamSchema.safeParseAsync(input);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toEqual(['params', 'orderId']);
    });
  });

  describe('refundPaymentSchema', () => {
    it('should accept valid refund with defaults', async () => {
      const input = {
        params: { id: validUUID },
        body: {},
      };

      const parsed = await refundPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(true);
      expect(parsed.data.body.reason).toBe('customer_requested');
      expect(parsed.data.body.amount).toBeUndefined();
    });

    it('should accept partial refund amount and custom reason', async () => {
      const input = {
        params: { id: validUUID },
        body: {
          amount: 25.0,
          reason: 'Defective item returned',
        },
      };

      const parsed = await refundPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(true);
      expect(parsed.data.body.amount).toBe(25.0);
      expect(parsed.data.body.reason).toBe('Defective item returned');
    });

    it('should reject negative refund amount', async () => {
      const input = {
        params: { id: validUUID },
        body: {
          amount: -10,
        },
      };

      const parsed = await refundPaymentSchema.safeParseAsync(input);
      expect(parsed.success).toBe(false);
      expect(parsed.error.issues[0].path).toEqual(['body', 'amount']);
    });
  });
});
