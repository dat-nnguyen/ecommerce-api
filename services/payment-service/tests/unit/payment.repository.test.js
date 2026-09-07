import { jest } from '@jest/globals';
import dbManager from '../../src/config/db.js';
import paymentRepository from '../../src/repositories/payment.repository.js';

describe('Payment Repository (Unit Tests)', () => {
  const mockRow = {
    id: 'pay-uuid-1',
    order_id: 'order-uuid-1',
    user_id: 'user-123',
    amount: '150.00',
    currency: 'USD',
    status: 'PENDING',
    payment_method: 'card',
    transaction_id: 'pi_test_123',
    error_message: null,
    created_at: '2026-09-07T12:00:00.000Z',
    updated_at: '2026-09-07T12:00:00.000Z',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createPayment', () => {
    it('should insert payment using dbManager when client is not passed', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [mockRow] });

      const result = await paymentRepository.createPayment({
        orderId: 'order-uuid-1',
        userId: 'user-123',
        amount: 150.0,
        currency: 'USD',
        paymentMethod: 'card',
        transactionId: 'pi_test_123',
        status: 'PENDING',
      });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payments'),
        ['order-uuid-1', 'user-123', 150.0, 'USD', 'card', 'pi_test_123', 'PENDING']
      );
      expect(result.id).toBe('pay-uuid-1');
      expect(result.amount).toBe(150.0);
      expect(result.orderId).toBe('order-uuid-1');
    });

    it('should use provided transaction client when passed', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [mockRow] }),
      };

      const result = await paymentRepository.createPayment(
        {
          orderId: 'order-uuid-1',
          userId: 'user-123',
          amount: 150.0,
        },
        mockClient
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payments'),
        ['order-uuid-1', 'user-123', 150.0, 'USD', 'card', null, 'PENDING']
      );
      expect(result.id).toBe('pay-uuid-1');
    });
  });

  describe('findPaymentById', () => {
    it('should return mapped payment by id', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [mockRow] });

      const result = await paymentRepository.findPaymentById('pay-uuid-1');

      expect(dbManager.query).toHaveBeenCalledWith(
        'SELECT * FROM payments WHERE id = $1',
        ['pay-uuid-1']
      );
      expect(result.id).toBe('pay-uuid-1');
      expect(result.userId).toBe('user-123');
    });

    it('should return null when payment is not found', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [] });

      const result = await paymentRepository.findPaymentById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findPaymentByOrderId', () => {
    it('should return latest payment for order id', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [mockRow] });

      const result = await paymentRepository.findPaymentByOrderId('order-uuid-1');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE order_id = $1'),
        ['order-uuid-1']
      );
      expect(result.orderId).toBe('order-uuid-1');
    });
  });

  describe('findPaymentByTransactionId', () => {
    it('should return payment by gateway transaction ID', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [mockRow] });

      const result = await paymentRepository.findPaymentByTransactionId('pi_test_123');

      expect(dbManager.query).toHaveBeenCalledWith(
        'SELECT * FROM payments WHERE transaction_id = $1',
        ['pi_test_123']
      );
      expect(result.transactionId).toBe('pi_test_123');
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update status, transactionId, and errorMessage', async () => {
      const updatedRow = {
        ...mockRow,
        status: 'COMPLETED',
        transaction_id: 'pi_confirmed_999',
        error_message: null,
      };
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [updatedRow] });

      const result = await paymentRepository.updatePaymentStatus('pay-uuid-1', {
        status: 'COMPLETED',
        transactionId: 'pi_confirmed_999',
      });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payments'),
        ['COMPLETED', 'pi_confirmed_999', null, 'pay-uuid-1']
      );
      expect(result.status).toBe('COMPLETED');
      expect(result.transactionId).toBe('pi_confirmed_999');
    });
  });
});
