import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@ecommerce/common-errors';
import paymentRepository from '../../src/repositories/payment.repository.js';
import idempotencyRepository from '../../src/repositories/idempotency.repository.js';
import paymentPublisher from '../../src/events/payment.publisher.js';
import { getDefaultPaymentAdapter } from '../../src/adapters/index.js';
import { PAYMENT_STATUS } from '../../src/models/payment.model.js';
import {
  processPayment,
  getPaymentById,
  getPaymentByOrderId,
  refundPayment,
} from '../../src/services/payment.service.js';

describe('Payment Service (Unit Tests)', () => {
  let adapter;

  beforeEach(() => {
    adapter = getDefaultPaymentAdapter();

    jest.spyOn(adapter, 'createPaymentIntent').mockResolvedValue({
      transactionId: 'pi_test_123',
      clientSecret: 'secret_123',
      status: 'requires_capture',
    });
    jest.spyOn(adapter, 'capturePayment').mockResolvedValue({
      transactionId: 'pi_test_123',
      status: 'succeeded',
    });
    jest.spyOn(adapter, 'refundPayment').mockResolvedValue({
      refundId: 're_test_123',
      status: 'succeeded',
      amount: 100.0,
    });
    jest.spyOn(paymentPublisher, 'publishPaymentCompleted').mockReturnValue(true);
    jest.spyOn(paymentPublisher, 'publishPaymentFailed').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processPayment', () => {
    it('should throw BadRequestError if orderId is missing', async () => {
      await expect(
        processPayment({ userId: 'u1', amount: 100 })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if userId is missing', async () => {
      await expect(
        processPayment({ orderId: 'o1', amount: 100 })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if amount is missing or <= 0', async () => {
      await expect(
        processPayment({ orderId: 'o1', userId: 'u1', amount: 0 })
      ).rejects.toThrow(BadRequestError);

      await expect(
        processPayment({ orderId: 'o1', userId: 'u1', amount: -10 })
      ).rejects.toThrow(BadRequestError);
    });

    it('should process payment successfully without idempotency key', async () => {
      const pendingPayment = {
        id: 'pay-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        status: PAYMENT_STATUS.PENDING,
      };

      const completedPayment = {
        ...pendingPayment,
        status: PAYMENT_STATUS.COMPLETED,
        transactionId: 'pi_test_123',
      };

      jest.spyOn(paymentRepository, 'createPayment').mockResolvedValue(pendingPayment);
      jest.spyOn(paymentRepository, 'updatePaymentStatus').mockResolvedValue(completedPayment);

      const result = await processPayment({
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      });

      expect(paymentRepository.createPayment).toHaveBeenCalledWith({
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'card',
        status: PAYMENT_STATUS.PENDING,
      });
      expect(adapter.createPaymentIntent).toHaveBeenCalledWith({
        amount: 100,
        currency: 'USD',
        orderId: 'order-1',
        userId: 'user-1',
      });
      expect(adapter.capturePayment).toHaveBeenCalledWith({
        transactionId: 'pi_test_123',
        paymentMethod: 'card',
      });
      expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('pay-1', {
        status: PAYMENT_STATUS.COMPLETED,
        transactionId: 'pi_test_123',
      });
      expect(paymentPublisher.publishPaymentCompleted).toHaveBeenCalledWith(completedPayment);
      expect(result).toEqual(completedPayment);
    });

    it('should process payment and record idempotency when idempotencyKey is provided', async () => {
      const pendingPayment = {
        id: 'pay-2',
        orderId: 'order-2',
        userId: 'user-2',
        amount: 200,
        currency: 'USD',
        status: PAYMENT_STATUS.PENDING,
      };

      const completedPayment = {
        ...pendingPayment,
        status: PAYMENT_STATUS.COMPLETED,
        transactionId: 'pi_test_123',
      };

      jest.spyOn(idempotencyRepository, 'createOrLockKey').mockResolvedValue({ key: 'idem-key-1' });
      jest.spyOn(idempotencyRepository, 'updateCompletedKey').mockResolvedValue({});
      jest.spyOn(paymentRepository, 'createPayment').mockResolvedValue(pendingPayment);
      jest.spyOn(paymentRepository, 'updatePaymentStatus').mockResolvedValue(completedPayment);

      const result = await processPayment({
        orderId: 'order-2',
        userId: 'user-2',
        amount: 200,
        idempotencyKey: 'idem-key-1',
      });

      expect(idempotencyRepository.createOrLockKey).toHaveBeenCalledWith({
        key: 'idem-key-1',
        userId: 'user-2',
        requestPath: '/api/v1/payments/process',
        requestParamsHash: expect.any(String),
      });
      expect(idempotencyRepository.updateCompletedKey).toHaveBeenCalledWith({
        key: 'idem-key-1',
        responseCode: 200,
        responseBody: completedPayment,
      });
      expect(result).toEqual(completedPayment);
    });

    it('should return cached response if idempotency key is already COMPLETED with matching hash', async () => {
      const params = {
        orderId: 'order-cached',
        userId: 'user-cached',
        amount: 50,
        currency: 'USD',
        paymentMethod: 'card',
      };
      const paramsHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(params))
        .digest('hex');

      const cachedPayment = { id: 'cached-pay', status: PAYMENT_STATUS.COMPLETED };

      jest.spyOn(idempotencyRepository, 'createOrLockKey').mockResolvedValue(null);
      jest.spyOn(idempotencyRepository, 'findKey').mockResolvedValue({
        key: 'idem-cached',
        requestParamsHash: paramsHash,
        status: 'COMPLETED',
        responseBody: cachedPayment,
      });
      jest.spyOn(paymentRepository, 'createPayment');

      const result = await processPayment({
        ...params,
        idempotencyKey: 'idem-cached',
      });

      expect(result).toEqual(cachedPayment);
      expect(paymentRepository.createPayment).not.toHaveBeenCalled();
      expect(adapter.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('should throw ConflictError if idempotency key is reused with different params', async () => {
      jest.spyOn(idempotencyRepository, 'createOrLockKey').mockResolvedValue(null);
      jest.spyOn(idempotencyRepository, 'findKey').mockResolvedValue({
        key: 'idem-diff',
        requestParamsHash: 'different-hash',
        status: 'COMPLETED',
      });

      await expect(
        processPayment({
          orderId: 'order-1',
          userId: 'user-1',
          amount: 100,
          idempotencyKey: 'idem-diff',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if idempotency request is currently in progress (STARTED)', async () => {
      const params = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'card',
      };
      const paramsHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(params))
        .digest('hex');

      jest.spyOn(idempotencyRepository, 'createOrLockKey').mockResolvedValue(null);
      jest.spyOn(idempotencyRepository, 'findKey').mockResolvedValue({
        key: 'idem-started',
        requestParamsHash: paramsHash,
        status: 'STARTED',
      });

      await expect(
        processPayment({
          ...params,
          idempotencyKey: 'idem-started',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should update status to FAILED, publish payment.failed, update idempotency, and rethrow on gateway error', async () => {
      const pendingPayment = {
        id: 'pay-fail',
        orderId: 'order-fail',
        userId: 'user-fail',
        amount: 100,
      };

      jest.spyOn(idempotencyRepository, 'createOrLockKey').mockResolvedValue({ key: 'idem-fail' });
      jest.spyOn(idempotencyRepository, 'updateFailedKey').mockResolvedValue({});
      jest.spyOn(paymentRepository, 'createPayment').mockResolvedValue(pendingPayment);
      adapter.createPaymentIntent.mockRejectedValue(new Error('Card declined'));
      jest.spyOn(paymentRepository, 'updatePaymentStatus').mockResolvedValue({
        ...pendingPayment,
        status: PAYMENT_STATUS.FAILED,
        errorMessage: 'Card declined',
      });

      await expect(
        processPayment({
          orderId: 'order-fail',
          userId: 'user-fail',
          amount: 100,
          idempotencyKey: 'idem-fail',
        })
      ).rejects.toThrow('Card declined');

      expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('pay-fail', {
        status: PAYMENT_STATUS.FAILED,
        errorMessage: 'Card declined',
      });
      expect(paymentPublisher.publishPaymentFailed).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pay-fail' }),
        'Card declined'
      );
      expect(idempotencyRepository.updateFailedKey).toHaveBeenCalledWith('idem-fail');
    });
  });

  describe('getPaymentById', () => {
    it('should throw NotFoundError if payment is not found', async () => {
      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue(null);

      await expect(
        getPaymentById({ paymentId: 'unknown-id', userId: 'user-1' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if caller is not owner and not admin', async () => {
      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue({
        id: 'pay-1',
        userId: 'owner-id',
      });

      await expect(
        getPaymentById({ paymentId: 'pay-1', userId: 'other-user', isAdmin: false })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should return payment if caller is owner', async () => {
      const payment = { id: 'pay-1', userId: 'user-1' };
      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue(payment);

      const result = await getPaymentById({ paymentId: 'pay-1', userId: 'user-1' });
      expect(result).toEqual(payment);
    });

    it('should return payment if caller is admin even if not owner', async () => {
      const payment = { id: 'pay-1', userId: 'owner-id' };
      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue(payment);

      const result = await getPaymentById({ paymentId: 'pay-1', userId: 'admin-id', isAdmin: true });
      expect(result).toEqual(payment);
    });
  });

  describe('getPaymentByOrderId', () => {
    it('should throw NotFoundError if payment for order is not found', async () => {
      jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(null);

      await expect(
        getPaymentByOrderId({ orderId: 'unknown-order', userId: 'user-1' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if caller is not owner and not admin', async () => {
      jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue({
        id: 'pay-1',
        orderId: 'order-1',
        userId: 'owner-id',
      });

      await expect(
        getPaymentByOrderId({ orderId: 'order-1', userId: 'other-user' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should return payment if caller is owner', async () => {
      const payment = { id: 'pay-1', orderId: 'order-1', userId: 'user-1' };
      jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(payment);

      const result = await getPaymentByOrderId({ orderId: 'order-1', userId: 'user-1' });
      expect(result).toEqual(payment);
    });

    it('should return payment if caller is admin', async () => {
      const payment = { id: 'pay-1', orderId: 'order-1', userId: 'owner-id' };
      jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(payment);

      const result = await getPaymentByOrderId({ orderId: 'order-1', userId: 'admin-id', isAdmin: true });
      expect(result).toEqual(payment);
    });
  });

  describe('refundPayment', () => {
    it('should throw NotFoundError if payment does not exist', async () => {
      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue(null);

      await expect(
        refundPayment({ paymentId: 'unknown-id', userId: 'user-1' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if caller is not owner and not admin', async () => {
      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue({
        id: 'pay-1',
        userId: 'owner-id',
      });

      await expect(
        refundPayment({ paymentId: 'pay-1', userId: 'other-user' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if payment status cannot transition to REFUNDED', async () => {
      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: PAYMENT_STATUS.PENDING,
      });

      await expect(
        refundPayment({ paymentId: 'pay-1', userId: 'user-1' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should refund completed payment and update status in database', async () => {
      const completedPayment = {
        id: 'pay-1',
        userId: 'user-1',
        amount: 150.0,
        transactionId: 'pi_charge_1',
        status: PAYMENT_STATUS.COMPLETED,
      };

      const refundedPayment = {
        ...completedPayment,
        status: PAYMENT_STATUS.REFUNDED,
      };

      jest.spyOn(paymentRepository, 'findPaymentById').mockResolvedValue(completedPayment);
      jest.spyOn(paymentRepository, 'updatePaymentStatus').mockResolvedValue(refundedPayment);

      const result = await refundPayment({
        paymentId: 'pay-1',
        userId: 'user-1',
        amount: 50.0,
        reason: 'Customer requested partial refund',
      });

      expect(adapter.refundPayment).toHaveBeenCalledWith({
        transactionId: 'pi_charge_1',
        amount: 50.0,
        reason: 'Customer requested partial refund',
      });
      expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('pay-1', {
        status: PAYMENT_STATUS.REFUNDED,
      });
      expect(result).toEqual(refundedPayment);
    });
  });
});
