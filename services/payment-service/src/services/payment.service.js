import crypto from 'node:crypto';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@ecommerce/common-errors';
import { createLogger } from '@ecommerce/logger';
import env from '../config/env.js';
import paymentRepository from '../repositories/payment.repository.js';
import idempotencyRepository from '../repositories/idempotency.repository.js';
import paymentPublisher from '../events/payment.publisher.js';
import { PAYMENT_STATUS, isValidPaymentTransition } from '../models/payment.model.js';
import { getDefaultPaymentAdapter } from '../adapters/index.js';

const logger = createLogger('payment-service', { logLevel: env.LOG_LEVEL });

/**
 * Processes a payment transaction with distributed idempotency checks and gateway execution.
 *
 * @param {Object} params - Payment processing parameters.
 * @param {string} params.orderId - Associated order UUID.
 * @param {string} params.userId - Owner user identifier.
 * @param {number} params.amount - Total amount to charge (must be > 0).
 * @param {string} [params.currency='USD'] - ISO currency code.
 * @param {string} [params.paymentMethod='card'] - Payment method used.
 * @param {string} [params.idempotencyKey=null] - Optional idempotency key from header.
 * @param {string} [params.requestPath='/api/v1/payments/process'] - Endpoint path for idempotency tracking.
 * @param {import('../adapters/payment.adapter.js').PaymentAdapter} [params.adapter=null] - Optional gateway adapter override.
 * @returns {Promise<Object>} Processed payment domain object.
 */
export async function processPayment({
  orderId,
  userId,
  amount,
  currency = 'USD',
  paymentMethod = 'card',
  idempotencyKey = null,
  requestPath = '/api/v1/payments/process',
  adapter = null,
}) {
  if (!orderId) throw new BadRequestError('orderId is required');
  if (!userId) throw new BadRequestError('userId is required');
  if (!amount || Number(amount) <= 0) throw new BadRequestError('amount must be greater than 0');

  const activeAdapter = adapter || getDefaultPaymentAdapter();
  const parsedAmount = Number(amount);
  const normalizedCurrency = currency.toUpperCase();

  // 1. Idempotency Check & Atomic Lock Acquisition
  let paramsHash = null;
  if (idempotencyKey) {
    const rawParams = {
      orderId,
      userId,
      amount: parsedAmount,
      currency: normalizedCurrency,
      paymentMethod,
    };
    paramsHash = crypto.createHash('sha256').update(JSON.stringify(rawParams)).digest('hex');

    const lock = await idempotencyRepository.createOrLockKey({
      key: idempotencyKey,
      userId,
      requestPath,
      requestParamsHash: paramsHash,
    });

    if (!lock) {
      // Key conflict: inspect the existing idempotency record
      const existingKey = await idempotencyRepository.findKey(idempotencyKey);
      if (existingKey) {
        if (existingKey.requestParamsHash !== paramsHash) {
          throw new ConflictError(
            'Idempotency key has already been used with different request parameters'
          );
        }
        if (existingKey.status === 'STARTED') {
          throw new ConflictError(
            'A request with this idempotency key is currently in progress'
          );
        }
        if (existingKey.status === 'COMPLETED' && existingKey.responseBody) {
          logger.info('Returning cached idempotency response', { idempotencyKey });
          return existingKey.responseBody;
        }
      }
    }
  }

  // 2. Create initial PENDING payment record
  let payment = await paymentRepository.createPayment({
    orderId,
    userId,
    amount: parsedAmount,
    currency: normalizedCurrency,
    paymentMethod,
    status: PAYMENT_STATUS.PENDING,
  });

  try {
    // 3. Initiate intent and capture payment through gateway adapter
    const intent = await activeAdapter.createPaymentIntent({
      amount: parsedAmount,
      currency: normalizedCurrency,
      orderId,
      userId,
    });

    const captureResult = await activeAdapter.capturePayment({
      transactionId: intent.transactionId,
      paymentMethod,
    });

    // 4. Update status to COMPLETED
    payment = await paymentRepository.updatePaymentStatus(payment.id, {
      status: PAYMENT_STATUS.COMPLETED,
      transactionId: captureResult.transactionId,
    });

    // 5. Publish Saga event to RabbitMQ
    paymentPublisher.publishPaymentCompleted(payment);

    // 6. Cache completed response in idempotency record
    if (idempotencyKey) {
      await idempotencyRepository.updateCompletedKey({
        key: idempotencyKey,
        responseCode: 200,
        responseBody: payment,
      });
    }

    logger.info('Payment processed successfully', {
      paymentId: payment.id,
      orderId,
      amount: parsedAmount,
      transactionId: payment.transactionId,
    });

    return payment;
  } catch (error) {
    logger.error('Payment processing failed at gateway:', error);

    // Update payment record to FAILED
    payment = await paymentRepository.updatePaymentStatus(payment.id, {
      status: PAYMENT_STATUS.FAILED,
      errorMessage: error.message,
    });

    // Publish failure compensation event
    paymentPublisher.publishPaymentFailed(payment, error.message);

    // Update idempotency key to FAILED
    if (idempotencyKey) {
      await idempotencyRepository.updateFailedKey(idempotencyKey);
    }

    throw error;
  }
}

/**
 * Retrieves a payment record by its unique identifier with IDOR ownership validation.
 *
 * @param {Object} params - Lookup parameters.
 * @param {string} params.paymentId - Payment UUID.
 * @param {string} params.userId - Authenticated user identifier.
 * @param {boolean} [params.isAdmin=false] - Whether the caller has admin permissions.
 * @returns {Promise<Object>} Payment domain entity.
 */
export async function getPaymentById({ paymentId, userId, isAdmin = false }) {
  const payment = await paymentRepository.findPaymentById(paymentId);
  if (!payment) {
    throw new NotFoundError(`Payment ${paymentId} not found`);
  }

  if (!isAdmin && payment.userId !== userId) {
    throw new ForbiddenError('Access denied to this payment record');
  }

  return payment;
}

/**
 * Retrieves a payment record associated with a given order UUID with IDOR ownership validation.
 *
 * @param {Object} params - Lookup parameters.
 * @param {string} params.orderId - Order UUID.
 * @param {string} params.userId - Authenticated user identifier.
 * @param {boolean} [params.isAdmin=false] - Whether the caller has admin permissions.
 * @returns {Promise<Object>} Payment domain entity.
 */
export async function getPaymentByOrderId({ orderId, userId, isAdmin = false }) {
  const payment = await paymentRepository.findPaymentByOrderId(orderId);
  if (!payment) {
    throw new NotFoundError(`Payment for order ${orderId} not found`);
  }

  if (!isAdmin && payment.userId !== userId) {
    throw new ForbiddenError('Access denied to this payment record');
  }

  return payment;
}

/**
 * Refunds a previously completed payment transaction.
 *
 * @param {Object} params - Refund parameters.
 * @param {string} params.paymentId - Payment UUID.
 * @param {number} [params.amount=null] - Amount to refund. Defaults to total payment amount.
 * @param {string} [params.reason='customer_requested'] - Reason for refund.
 * @param {string} params.userId - Requesting user identifier.
 * @param {boolean} [params.isAdmin=false] - Whether the caller has admin permissions.
 * @param {import('../adapters/payment.adapter.js').PaymentAdapter} [params.adapter=null] - Optional adapter override.
 * @returns {Promise<Object>} Updated payment domain entity with REFUNDED status.
 */
export async function refundPayment({
  paymentId,
  amount = null,
  reason = 'customer_requested',
  userId,
  isAdmin = false,
  adapter = null,
}) {
  const payment = await paymentRepository.findPaymentById(paymentId);
  if (!payment) {
    throw new NotFoundError(`Payment ${paymentId} not found`);
  }

  if (!isAdmin && payment.userId !== userId) {
    throw new ForbiddenError('Access denied to refund this payment');
  }

  if (!isValidPaymentTransition(payment.status, PAYMENT_STATUS.REFUNDED)) {
    throw new BadRequestError(
      `Cannot refund payment in current status: ${payment.status}`
    );
  }

  const activeAdapter = adapter || getDefaultPaymentAdapter();
  const refundAmount = amount ? Number(amount) : payment.amount;

  const refundResult = await activeAdapter.refundPayment({
    transactionId: payment.transactionId,
    amount: refundAmount,
    reason,
  });

  const updatedPayment = await paymentRepository.updatePaymentStatus(payment.id, {
    status: PAYMENT_STATUS.REFUNDED,
  });

  logger.info('Payment refunded successfully', {
    paymentId: payment.id,
    refundId: refundResult.refundId,
    amount: refundResult.amount,
  });

  return updatedPayment;
}

export default {
  processPayment,
  getPaymentById,
  getPaymentByOrderId,
  refundPayment,
};
