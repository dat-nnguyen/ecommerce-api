/**
 * TODO 6.3.3: Payment Event Consumer (Saga Orchestration)
 *
 * Requirements:
 * 1. Listen to queue bound to exchange 'ecommerce.payment.events':
 *    - Routing key: 'payment.completed' -> transition order status to 'CONFIRMED'.
 *    - Routing key: 'payment.failed' -> transition order status to 'CANCELLED', trigger compensation.
 * 2. Acknowledge messages on success; reject/nack with dead-lettering on fatal error.
 */
