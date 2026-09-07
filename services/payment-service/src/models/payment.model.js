/**
 * @typedef {'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'} PaymentStatus
 * @typedef {'STARTED' | 'COMPLETED' | 'FAILED'} IdempotencyStatus
 */

/**
 * Domain enumeration representing the lifecycle states of a payment transaction.
 * @readonly
 * @enum {PaymentStatus}
 */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});

/**
 * Array containing all valid payment statuses. Useful for Zod validation schemas.
 * @type {ReadonlyArray<PaymentStatus>}
 */
export const PAYMENT_STATUS_LIST = Object.freeze(Object.values(PAYMENT_STATUS));

/**
 * Domain enumeration representing the processing states of an idempotency key.
 * @readonly
 * @enum {IdempotencyStatus}
 */
export const IDEMPOTENCY_STATUS = Object.freeze({
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
});

/**
 * Array containing all valid idempotency statuses.
 * @type {ReadonlyArray<IdempotencyStatus>}
 */
export const IDEMPOTENCY_STATUS_LIST = Object.freeze(Object.values(IDEMPOTENCY_STATUS));

/**
 * Transition matrix defining legal state transitions across the payment lifecycle.
 * @type {Readonly<Record<PaymentStatus, ReadonlyArray<PaymentStatus>>>}
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [PAYMENT_STATUS.PENDING]: Object.freeze([PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.FAILED]),
  [PAYMENT_STATUS.PROCESSING]: Object.freeze([PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.FAILED]),
  [PAYMENT_STATUS.COMPLETED]: Object.freeze([PAYMENT_STATUS.REFUNDED]),
  [PAYMENT_STATUS.FAILED]: Object.freeze([]),
  [PAYMENT_STATUS.REFUNDED]: Object.freeze([]),
});

/**
 * Validates whether a payment status transition from `fromStatus` to `toStatus` is permitted.
 *
 * @param {string} fromStatus - Current status of the payment.
 * @param {string} toStatus - Desired new status of the payment.
 * @returns {boolean} True if the transition is allowed; otherwise false.
 */
export function isValidPaymentTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
}

/**
 * Checks whether the given status represents a terminal state where no further progression is allowed.
 *
 * @param {string} status - Payment status to evaluate.
 * @returns {boolean} True if the status is FAILED or REFUNDED; otherwise false.
 */
export function isTerminalPaymentStatus(status) {
  return status === PAYMENT_STATUS.FAILED || status === PAYMENT_STATUS.REFUNDED;
}

/**
 * Maps a raw PostgreSQL payments row into a camelCase domain object.
 *
 * @param {Record<string, any>} row - Raw database row from `payments` table.
 * @returns {Record<string, any>|null} Formatted payment entity, or null if row is falsy.
 */
export function mapRowToPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    amount: typeof row.amount === 'number' ? row.amount : parseFloat(row.amount),
    currency: row.currency,
    status: row.status,
    paymentMethod: row.payment_method,
    transactionId: row.transaction_id || null,
    errorMessage: row.error_message || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

/**
 * Maps a raw PostgreSQL idempotency_keys row into a camelCase domain object.
 *
 * @param {Record<string, any>} row - Raw database row from `idempotency_keys` table.
 * @returns {Record<string, any>|null} Formatted idempotency entity, or null if row is falsy.
 */
export function mapRowToIdempotency(row) {
  if (!row) return null;
  return {
    key: row.key,
    userId: row.user_id,
    requestPath: row.request_path,
    requestParamsHash: row.request_params_hash,
    responseCode: row.response_code !== undefined ? row.response_code : null,
    responseBody: row.response_body || null,
    status: row.status,
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export default {
  PAYMENT_STATUS,
  PAYMENT_STATUS_LIST,
  IDEMPOTENCY_STATUS,
  IDEMPOTENCY_STATUS_LIST,
  ALLOWED_TRANSITIONS,
  isValidPaymentTransition,
  isTerminalPaymentStatus,
  mapRowToPayment,
  mapRowToIdempotency,
};
