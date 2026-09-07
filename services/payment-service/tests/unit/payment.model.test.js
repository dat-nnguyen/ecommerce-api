import {
  PAYMENT_STATUS,
  PAYMENT_STATUS_LIST,
  IDEMPOTENCY_STATUS,
  IDEMPOTENCY_STATUS_LIST,
  ALLOWED_TRANSITIONS,
  isValidPaymentTransition,
  isTerminalPaymentStatus,
  mapRowToPayment,
  mapRowToIdempotency,
} from '../../src/models/payment.model.js';

describe('Payment Model & Lifecycle Transitions (Unit Tests)', () => {
  describe('Enums and Constants', () => {
    it('should define all expected payment statuses', () => {
      expect(PAYMENT_STATUS).toEqual({
        PENDING: 'PENDING',
        PROCESSING: 'PROCESSING',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED',
        REFUNDED: 'REFUNDED',
      });
      expect(PAYMENT_STATUS_LIST).toEqual([
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'REFUNDED',
      ]);
      expect(Object.isFrozen(PAYMENT_STATUS)).toBe(true);
    });

    it('should define all expected idempotency statuses', () => {
      expect(IDEMPOTENCY_STATUS).toEqual({
        STARTED: 'STARTED',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED',
      });
      expect(IDEMPOTENCY_STATUS_LIST).toEqual(['STARTED', 'COMPLETED', 'FAILED']);
      expect(Object.isFrozen(IDEMPOTENCY_STATUS)).toBe(true);
    });
  });

  describe('Allowed State Transitions', () => {
    it('should define a frozen transitions map', () => {
      expect(Object.isFrozen(ALLOWED_TRANSITIONS)).toBe(true);
      expect(ALLOWED_TRANSITIONS[PAYMENT_STATUS.COMPLETED]).toEqual([PAYMENT_STATUS.REFUNDED]);
    });

    it('should allow valid transitions through the payment lifecycle', () => {
      expect(isValidPaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING)).toBe(true);
      expect(isValidPaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED)).toBe(true);
      expect(isValidPaymentTransition(PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.COMPLETED)).toBe(true);
      expect(isValidPaymentTransition(PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.FAILED)).toBe(true);
      expect(isValidPaymentTransition(PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.REFUNDED)).toBe(true);
      expect(isValidPaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PENDING)).toBe(true);
    });

    it('should reject invalid payment transitions', () => {
      expect(isValidPaymentTransition(PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.PENDING)).toBe(false);
      expect(isValidPaymentTransition(PAYMENT_STATUS.FAILED, PAYMENT_STATUS.COMPLETED)).toBe(false);
      expect(isValidPaymentTransition(PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PROCESSING)).toBe(false);
      expect(isValidPaymentTransition('UNKNOWN', PAYMENT_STATUS.COMPLETED)).toBe(false);
    });

    it('should identify terminal statuses', () => {
      expect(isTerminalPaymentStatus(PAYMENT_STATUS.FAILED)).toBe(true);
      expect(isTerminalPaymentStatus(PAYMENT_STATUS.REFUNDED)).toBe(true);
      expect(isTerminalPaymentStatus(PAYMENT_STATUS.PENDING)).toBe(false);
      expect(isTerminalPaymentStatus(PAYMENT_STATUS.COMPLETED)).toBe(false);
    });
  });

  describe('Row Mappers', () => {
    describe('mapRowToPayment', () => {
      it('should map snake_case database row to camelCase domain payment object', () => {
        const rawRow = {
          id: 'pay-uuid-1',
          order_id: 'order-uuid-1',
          user_id: 'user-123',
          amount: '99.99',
          currency: 'USD',
          status: 'COMPLETED',
          payment_method: 'card',
          transaction_id: 'pi_test_123',
          error_message: null,
          created_at: '2026-09-07T12:00:00.000Z',
          updated_at: '2026-09-07T12:00:05.000Z',
        };

        const result = mapRowToPayment(rawRow);

        expect(result).toEqual({
          id: 'pay-uuid-1',
          orderId: 'order-uuid-1',
          userId: 'user-123',
          amount: 99.99,
          currency: 'USD',
          status: 'COMPLETED',
          paymentMethod: 'card',
          transactionId: 'pi_test_123',
          errorMessage: null,
          createdAt: '2026-09-07T12:00:00.000Z',
          updatedAt: '2026-09-07T12:00:05.000Z',
        });
      });

      it('should return null when row is falsy', () => {
        expect(mapRowToPayment(null)).toBeNull();
        expect(mapRowToPayment(undefined)).toBeNull();
      });
    });

    describe('mapRowToIdempotency', () => {
      it('should map snake_case database row to camelCase domain idempotency object', () => {
        const rawRow = {
          key: 'idemp-key-1',
          user_id: 'user-123',
          request_path: '/api/v1/payments/process',
          request_params_hash: 'hash-abc',
          response_code: 201,
          response_body: { success: true },
          status: 'COMPLETED',
          locked_at: '2026-09-07T12:00:00.000Z',
          created_at: '2026-09-07T12:00:00.000Z',
          updated_at: '2026-09-07T12:00:01.000Z',
        };

        const result = mapRowToIdempotency(rawRow);

        expect(result).toEqual({
          key: 'idemp-key-1',
          userId: 'user-123',
          requestPath: '/api/v1/payments/process',
          requestParamsHash: 'hash-abc',
          responseCode: 201,
          responseBody: { success: true },
          status: 'COMPLETED',
          lockedAt: '2026-09-07T12:00:00.000Z',
          createdAt: '2026-09-07T12:00:00.000Z',
          updatedAt: '2026-09-07T12:00:01.000Z',
        });
      });

      it('should return null when row is falsy', () => {
        expect(mapRowToIdempotency(null)).toBeNull();
        expect(mapRowToIdempotency(undefined)).toBeNull();
      });
    });
  });
});
