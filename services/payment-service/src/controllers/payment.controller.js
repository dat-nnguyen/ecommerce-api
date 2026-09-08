import paymentService from '../services/payment.service.js';

/**
 * Processes a payment transaction for an order.
 *
 * @route POST /api/v1/payments/process
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function processPayment(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId, amount, currency, paymentMethod } = req.validatedData?.body || req.body;
    const idempotencyKey = req.idempotencyKey;
    const requestPath = req.originalUrl || '/api/v1/payments/process';

    const payment = await paymentService.processPayment({
      orderId,
      userId,
      amount,
      currency,
      paymentMethod,
      idempotencyKey,
      requestPath,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves payment details by payment UUID.
 *
 * @route GET /api/v1/payments/:id
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function getPaymentById(req, res, next) {
  try {
    const paymentId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const payment = await paymentService.getPaymentById({ paymentId, userId, isAdmin });

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves payment details by associated order UUID.
 *
 * @route GET /api/v1/payments/order/:orderId
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function getPaymentByOrderId(req, res, next) {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const payment = await paymentService.getPaymentByOrderId({ orderId, userId, isAdmin });

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Initiates a refund for a previously completed payment.
 *
 * @route POST /api/v1/payments/:id/refund
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function refundPayment(req, res, next) {
  try {
    const paymentId = req.params.id;
    const { amount, reason } = req.validatedData?.body || req.body || {};
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const payment = await paymentService.refundPayment({
      paymentId,
      amount,
      reason,
      userId,
      isAdmin,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
}

export default {
  processPayment,
  getPaymentById,
  getPaymentByOrderId,
  refundPayment,
};
