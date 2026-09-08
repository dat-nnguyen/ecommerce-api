import { jest } from '@jest/globals';
import paymentService from '../../src/services/payment.service.js';
import {
  processPayment,
  getPaymentById,
  getPaymentByOrderId,
  refundPayment,
} from '../../src/controllers/payment.controller.js';

describe('Payment Controller (Unit Tests)', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', role: 'CUSTOMER' },
      body: {},
      validatedData: {},
      params: {},
      headers: {},
      originalUrl: '/api/v1/payments/process',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment and return 200 with formatted envelope', async () => {
      const mockPayment = {
        id: 'pay-123',
        orderId: 'order-456',
        amount: 100,
        status: 'COMPLETED',
      };

      mockReq.validatedData = {
        body: {
          orderId: 'order-456',
          amount: 100,
          currency: 'USD',
          paymentMethod: 'card',
        },
      };
      mockReq.idempotencyKey = 'idem-key-1';

      jest.spyOn(paymentService, 'processPayment').mockResolvedValue(mockPayment);

      await processPayment(mockReq, mockRes, mockNext);

      expect(paymentService.processPayment).toHaveBeenCalledWith({
        orderId: 'order-456',
        userId: 'user-123',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'card',
        idempotencyKey: 'idem-key-1',
        requestPath: '/api/v1/payments/process',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Payment processed successfully',
        data: mockPayment,
      });
    });

    it('should forward error to next() on failure', async () => {
      const error = new Error('Service failure');
      jest.spyOn(paymentService, 'processPayment').mockRejectedValue(error);

      await processPayment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getPaymentById', () => {
    it('should return payment and status 200', async () => {
      const mockPayment = { id: 'pay-123', userId: 'user-123' };
      mockReq.params.id = 'pay-123';

      jest.spyOn(paymentService, 'getPaymentById').mockResolvedValue(mockPayment);

      await getPaymentById(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentById).toHaveBeenCalledWith({
        paymentId: 'pay-123',
        userId: 'user-123',
        isAdmin: false,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment,
      });
    });

    it('should forward error to next() if service fails', async () => {
      const error = new Error('Payment not found');
      mockReq.params.id = 'unknown-id';
      jest.spyOn(paymentService, 'getPaymentById').mockRejectedValue(error);

      await getPaymentById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getPaymentByOrderId', () => {
    it('should return payment by orderId and status 200', async () => {
      const mockPayment = { id: 'pay-123', orderId: 'order-456', userId: 'user-123' };
      mockReq.params.orderId = 'order-456';

      jest.spyOn(paymentService, 'getPaymentByOrderId').mockResolvedValue(mockPayment);

      await getPaymentByOrderId(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentByOrderId).toHaveBeenCalledWith({
        orderId: 'order-456',
        userId: 'user-123',
        isAdmin: false,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment,
      });
    });

    it('should forward error to next() if service fails', async () => {
      const error = new Error('Order payment not found');
      mockReq.params.orderId = 'unknown-order';
      jest.spyOn(paymentService, 'getPaymentByOrderId').mockRejectedValue(error);

      await getPaymentByOrderId(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('refundPayment', () => {
    it('should refund payment and return status 200', async () => {
      const mockRefunded = { id: 'pay-123', status: 'REFUNDED' };
      mockReq.params.id = 'pay-123';
      mockReq.validatedData = {
        body: { amount: 50, reason: 'Customer returned item' },
      };

      jest.spyOn(paymentService, 'refundPayment').mockResolvedValue(mockRefunded);

      await refundPayment(mockReq, mockRes, mockNext);

      expect(paymentService.refundPayment).toHaveBeenCalledWith({
        paymentId: 'pay-123',
        amount: 50,
        reason: 'Customer returned item',
        userId: 'user-123',
        isAdmin: false,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Payment refunded successfully',
        data: mockRefunded,
      });
    });

    it('should forward error to next() if service fails', async () => {
      const error = new Error('Cannot refund');
      mockReq.params.id = 'pay-123';
      jest.spyOn(paymentService, 'refundPayment').mockRejectedValue(error);

      await refundPayment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
