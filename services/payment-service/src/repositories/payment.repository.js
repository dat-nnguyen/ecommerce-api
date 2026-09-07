import dbManager from '../config/db.js';
import { mapRowToPayment } from '../models/payment.model.js';

/**
 * Creates a new payment record in PostgreSQL.
 *
 * @param {Object} params - Payment creation parameters.
 * @param {string} params.orderId - UUID of the order.
 * @param {string} params.userId - User identifier.
 * @param {number} params.amount - Total payment amount.
 * @param {string} [params.currency='USD'] - ISO 4217 currency code.
 * @param {string} [params.paymentMethod='card'] - Method of payment.
 * @param {string} [params.transactionId=null] - External gateway transaction ID.
 * @param {string} [params.status='PENDING'] - Initial payment status.
 * @param {import('pg').PoolClient} [client=null] - Optional client for managed transactions.
 * @returns {Promise<Object>} Created payment domain object.
 */
export async function createPayment(
  {
    orderId,
    userId,
    amount,
    currency = 'USD',
    paymentMethod = 'card',
    transactionId = null,
    status = 'PENDING',
  },
  client = null
) {
  const executor = client || dbManager;
  const result = await executor.query(
    `INSERT INTO payments (order_id, user_id, amount, currency, payment_method, transaction_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [orderId, userId, amount, currency, paymentMethod, transactionId, status]
  );

  return mapRowToPayment(result.rows[0]);
}

/**
 * Retrieves a payment record by its primary UUID.
 *
 * @param {string} paymentId - Payment UUID.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Payment domain object or null if not found.
 */
export async function findPaymentById(paymentId, client = null) {
  const executor = client || dbManager;
  const result = await executor.query('SELECT * FROM payments WHERE id = $1', [paymentId]);

  return mapRowToPayment(result.rows[0]);
}

/**
 * Retrieves the latest payment record associated with an order UUID.
 *
 * @param {string} orderId - Order UUID.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Payment domain object or null if not found.
 */
export async function findPaymentByOrderId(orderId, client = null) {
  const executor = client || dbManager;
  const result = await executor.query(
    'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
    [orderId]
  );

  return mapRowToPayment(result.rows[0]);
}

/**
 * Retrieves a payment record by external gateway transaction ID (e.g., Stripe PaymentIntent ID).
 *
 * @param {string} transactionId - External transaction/charge ID.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Payment domain object or null if not found.
 */
export async function findPaymentByTransactionId(transactionId, client = null) {
  const executor = client || dbManager;
  const result = await executor.query('SELECT * FROM payments WHERE transaction_id = $1', [
    transactionId,
  ]);

  return mapRowToPayment(result.rows[0]);
}

/**
 * Updates the lifecycle status and optional gateway transaction ID or error message for a payment.
 *
 * @param {string} paymentId - Payment UUID.
 * @param {Object} updates - Fields to update.
 * @param {string} updates.status - New payment status.
 * @param {string} [updates.transactionId=null] - Gateway transaction ID.
 * @param {string} [updates.errorMessage=null] - Failure error details.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Updated payment domain object or null if not found.
 */
export async function updatePaymentStatus(
  paymentId,
  { status, transactionId = null, errorMessage = null },
  client = null
) {
  const executor = client || dbManager;
  const result = await executor.query(
    `UPDATE payments
     SET status = $1,
         transaction_id = COALESCE($2, transaction_id),
         error_message = COALESCE($3, error_message),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, transactionId, errorMessage, paymentId]
  );

  return mapRowToPayment(result.rows[0]);
}

export default {
  createPayment,
  findPaymentById,
  findPaymentByOrderId,
  findPaymentByTransactionId,
  updatePaymentStatus,
};
