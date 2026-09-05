import {
  ORDER_STATUS,
  ORDER_STATUS_LIST,
  ALLOWED_TRANSITIONS,
  isValidStatusTransition,
  isTerminalStatus,
} from '../../src/models/order.model.js';

describe('Order Model & State Machine (Unit Tests)', () => {
  describe('ORDER_STATUS enum', () => {
    it('should define all 6 required order statuses', () => {
      expect(ORDER_STATUS).toEqual({
        PENDING: 'PENDING',
        PAYMENT_PENDING: 'PAYMENT_PENDING',
        CONFIRMED: 'CONFIRMED',
        SHIPPED: 'SHIPPED',
        DELIVERED: 'DELIVERED',
        CANCELLED: 'CANCELLED',
      });
    });

    it('should be deeply immutable', () => {
      expect(() => {
        ORDER_STATUS.NEW_STATUS = 'TEST';
      }).toThrow();
    });
  });

  describe('ORDER_STATUS_LIST', () => {
    it('should contain all enum values', () => {
      expect(ORDER_STATUS_LIST).toEqual([
        'PENDING',
        'PAYMENT_PENDING',
        'CONFIRMED',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
      ]);
    });
  });

  describe('ALLOWED_TRANSITIONS', () => {
    it('should define transitions for all statuses', () => {
      expect(Object.keys(ALLOWED_TRANSITIONS)).toHaveLength(6);
      expect(ALLOWED_TRANSITIONS[ORDER_STATUS.PENDING]).toEqual(['PAYMENT_PENDING', 'CANCELLED']);
      expect(ALLOWED_TRANSITIONS[ORDER_STATUS.PAYMENT_PENDING]).toEqual(['CONFIRMED', 'CANCELLED']);
      expect(ALLOWED_TRANSITIONS[ORDER_STATUS.CONFIRMED]).toEqual(['SHIPPED', 'CANCELLED']);
      expect(ALLOWED_TRANSITIONS[ORDER_STATUS.SHIPPED]).toEqual(['DELIVERED', 'CANCELLED']);
      expect(ALLOWED_TRANSITIONS[ORDER_STATUS.DELIVERED]).toEqual([]);
      expect(ALLOWED_TRANSITIONS[ORDER_STATUS.CANCELLED]).toEqual([]);
    });
  });

  describe('isValidStatusTransition', () => {
    it('should allow valid forward transitions', () => {
      expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PAYMENT_PENDING)).toBe(true);
      expect(isValidStatusTransition(ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.CONFIRMED)).toBe(true);
      expect(isValidStatusTransition(ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED)).toBe(true);
      expect(isValidStatusTransition(ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED)).toBe(true);
    });

    it('should allow cancellation from intermediate non-terminal states', () => {
      expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED)).toBe(true);
      expect(isValidStatusTransition(ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.CANCELLED)).toBe(true);
      expect(isValidStatusTransition(ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED)).toBe(true);
      expect(isValidStatusTransition(ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED)).toBe(true);
    });

    it('should reject transitions from terminal states', () => {
      expect(isValidStatusTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.PENDING)).toBe(false);
      expect(isValidStatusTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED)).toBe(false);
      expect(isValidStatusTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.PENDING)).toBe(false);
      expect(isValidStatusTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.CONFIRMED)).toBe(false);
    });

    it('should reject invalid or out-of-order transitions', () => {
      expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.DELIVERED)).toBe(false);
      expect(isValidStatusTransition(ORDER_STATUS.CONFIRMED, ORDER_STATUS.PENDING)).toBe(false);
      expect(isValidStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PENDING)).toBe(false);
    });

    it('should return false for unrecognized statuses', () => {
      expect(isValidStatusTransition('UNKNOWN', ORDER_STATUS.CONFIRMED)).toBe(false);
      expect(isValidStatusTransition(ORDER_STATUS.PENDING, 'INVALID')).toBe(false);
      expect(isValidStatusTransition(null, undefined)).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for DELIVERED and CANCELLED', () => {
      expect(isTerminalStatus(ORDER_STATUS.DELIVERED)).toBe(true);
      expect(isTerminalStatus(ORDER_STATUS.CANCELLED)).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalStatus(ORDER_STATUS.PENDING)).toBe(false);
      expect(isTerminalStatus(ORDER_STATUS.PAYMENT_PENDING)).toBe(false);
      expect(isTerminalStatus(ORDER_STATUS.CONFIRMED)).toBe(false);
      expect(isTerminalStatus(ORDER_STATUS.SHIPPED)).toBe(false);
      expect(isTerminalStatus('NON_EXISTENT')).toBe(false);
      expect(isTerminalStatus(null)).toBe(false);
    });
  });
});
