/**
 * TODO 6.2.1: Order State Machine & Model Constants
 *
 * Requirements:
 * 1. Define ORDER_STATUS enum:
 *    - PENDING: Initial state when order is placed
 *    - PAYMENT_PENDING: Awaiting payment verification
 *    - CONFIRMED: Payment and inventory checks passed
 *    - SHIPPED: Order is dispatched
 *    - DELIVERED: Order successfully delivered
 *    - CANCELLED: Order aborted or payment failed
 * 2. Define ALLOWED_TRANSITIONS map validating state transition flow.
 * 3. Export helper isValidStatusTransition(fromStatus, toStatus).
 */
