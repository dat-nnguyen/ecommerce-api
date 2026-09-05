/**
 * TODO 6.3.4: Inventory Event Consumer (Saga Orchestration)
 *
 * Requirements:
 * 1. Listen to queue bound to exchange 'ecommerce.inventory.events':
 *    - Routing key: 'inventory.reserved' -> update saga state / proceed to payment.
 *    - Routing key: 'inventory.failed' -> transition order to 'CANCELLED', trigger compensation.
 */
