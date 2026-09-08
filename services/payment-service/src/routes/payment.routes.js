import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.js';
import { extractIdempotencyKey } from '../middlewares/idempotency.middleware.js';
import {
  processPaymentSchema,
  paymentIdParamSchema,
  orderIdParamSchema,
  refundPaymentSchema,
} from '../validators/payment.validator.js';

const router = Router();

/**
 * All payment routes require authenticated user identity.
 */
router.use(authenticate);

/**
 * @route POST /api/v1/payments/process
 * @desc Process a payment transaction with idempotency checks.
 * @access Private (Authenticated User)
 */
router.post(
  '/process',
  extractIdempotencyKey,
  validate(processPaymentSchema),
  paymentController.processPayment
);

/**
 * @route GET /api/v1/payments/order/:orderId
 * @desc Retrieve payment record for an order UUID.
 * @access Private (Owner / Admin)
 */
router.get(
  '/order/:orderId',
  validate(orderIdParamSchema),
  paymentController.getPaymentByOrderId
);

/**
 * @route GET /api/v1/payments/:id
 * @desc Retrieve payment details by payment UUID.
 * @access Private (Owner / Admin)
 */
router.get(
  '/:id',
  validate(paymentIdParamSchema),
  paymentController.getPaymentById
);

/**
 * @route POST /api/v1/payments/:id/refund
 * @desc Refund a previously completed payment transaction.
 * @access Private (Owner / Admin)
 */
router.post(
  '/:id/refund',
  validate(refundPaymentSchema),
  paymentController.refundPayment
);

export default router;
