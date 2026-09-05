/**
 * @typedef {'PENDING' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'} OrderStatus
 */

/**
 * Domain enumeration representing the lifecycle states of an order.
 * @readonly
 * @enum {OrderStatus}
 */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

/**
 * Array containing all recognized order statuses. Useful for schema validation.
 * @type {ReadonlyArray<OrderStatus>}
 */
export const ORDER_STATUS_LIST = Object.freeze(Object.values(ORDER_STATUS));

/**
 * Transition matrix defining legal state movements across the order lifecycle.
 * @type {Readonly<Record<OrderStatus, ReadonlyArray<OrderStatus>>>}
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: Object.freeze([ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.PAYMENT_PENDING]: Object.freeze([ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.CONFIRMED]: Object.freeze([ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.SHIPPED]: Object.freeze([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.DELIVERED]: Object.freeze([]),
  [ORDER_STATUS.CANCELLED]: Object.freeze([]),
});

/**
 * Validates whether a state transition from `fromStatus` to `toStatus` is permitted.
 *
 * @param {string} fromStatus - Current status of the order.
 * @param {string} toStatus - Proposed new status of the order.
 * @returns {boolean} True if the transition is allowed; otherwise false.
 */
export function isValidStatusTransition(fromStatus, toStatus) {
  return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
}

/**
 * Checks whether the given status represents a terminal (final) state where no further transitions can occur.
 *
 * @param {string} status - Order status to evaluate.
 * @returns {boolean} True if the status is DELIVERED or CANCELLED; otherwise false.
 */
export function isTerminalStatus(status) {
  return status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.CANCELLED;
}

export default {
  ORDER_STATUS,
  ORDER_STATUS_LIST,
  ALLOWED_TRANSITIONS,
  isValidStatusTransition,
  isTerminalStatus,
};
