import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import paymentService from '../../src/services/payment.service.js';

describe('Payment API Endpoints (Integration Tests)', () => {
  const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const orderUUID = 'b1ffcd88-8b1a-4ef8-bb6d-6bb9bd380a22';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/payments/process', () => {
    it('should return 401 Unauthorized if x-user-id header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/payments/process')
        .send({
          orderId: orderUUID,
          amount: 100,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 Bad Request if validation fails (invalid UUID)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/process')
        .set('x-user-id', 'user-123')
        .send({
          orderId: 'not-a-uuid',
          amount: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should process payment and return 200 with data envelope', async () => {
      const mockPayment = {
        id: validUUID,
        orderId: orderUUID,
        userId: 'user-123',
        amount: 150.0,
        currency: 'USD',
        status: 'COMPLETED',
        transactionId: 'pi_test_123',
      };

      jest.spyOn(paymentService, 'processPayment').mockResolvedValue(mockPayment);

      const res = await request(app)
        .post('/api/v1/payments/process')
        .set('x-user-id', 'user-123')
        .set('Idempotency-Key', 'test-idem-key')
        .send({
          orderId: orderUUID,
          amount: 150.0,
          currency: 'usd',
          paymentMethod: 'card',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Payment processed successfully');
      expect(res.body.data).toEqual(mockPayment);
      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: orderUUID,
          userId: 'user-123',
          amount: 150.0,
          idempotencyKey: 'test-idem-key',
        })
      );
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should return 401 Unauthorized if not authenticated', async () => {
      const res = await request(app).get(`/api/v1/payments/${validUUID}`);
      expect(res.status).toBe(401);
    });

    it('should return payment details for authorized owner', async () => {
      const mockPayment = {
        id: validUUID,
        userId: 'user-123',
        amount: 50.0,
        status: 'COMPLETED',
      };

      jest.spyOn(paymentService, 'getPaymentById').mockResolvedValue(mockPayment);

      const res = await request(app)
        .get(`/api/v1/payments/${validUUID}`)
        .set('x-user-id', 'user-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockPayment);
    });
  });

  describe('GET /api/v1/payments/order/:orderId', () => {
    it('should return payment details by order UUID', async () => {
      const mockPayment = {
        id: validUUID,
        orderId: orderUUID,
        userId: 'user-123',
        status: 'COMPLETED',
      };

      jest.spyOn(paymentService, 'getPaymentByOrderId').mockResolvedValue(mockPayment);

      const res = await request(app)
        .get(`/api/v1/payments/order/${orderUUID}`)
        .set('x-user-id', 'user-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockPayment);
    });
  });

  describe('POST /api/v1/payments/:id/refund', () => {
    it('should initiate refund and return 200 with updated payment', async () => {
      const mockRefunded = {
        id: validUUID,
        status: 'REFUNDED',
        amount: 100.0,
      };

      jest.spyOn(paymentService, 'refundPayment').mockResolvedValue(mockRefunded);

      const res = await request(app)
        .post(`/api/v1/payments/${validUUID}/refund`)
        .set('x-user-id', 'user-123')
        .send({
          amount: 50.0,
          reason: 'Customer requested refund',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Payment refunded successfully');
      expect(res.body.data).toEqual(mockRefunded);
    });
  });
});
