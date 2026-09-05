/**
 * TODO 6.4.2: Order Request Validation Schemas
 *
 * Requirements:
 * 1. orderIdParamSchema:
 *    - Validates orderId UUID format in route params.
 * 2. createOrderSchema:
 *    - Validates items array (min 1 item): productId, name, price, quantity (int >= 1).
 *    - Validates optional currency (default 'USD', 3-letter code).
 * 3. queryOrdersSchema:
 *    - Validates page (default 1) and limit (default 20).
 * 4. cancelOrderSchema:
 *    - Validates optional cancellation reason.
 */
