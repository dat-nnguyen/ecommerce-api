/**
 * TODO 6.3.1: RabbitMQ Connection & Channel Manager
 *
 * Requirements:
 * 1. Connect to RabbitMQ via amqplib using RABBITMQ_URL from env.js.
 * 2. Assert topic exchanges:
 *    - ecommerce.order.events (from @ecommerce/event-contracts)
 *    - ecommerce.payment.events
 *    - ecommerce.inventory.events
 * 3. Handle connection error, close, and reconnect strategies.
 * 4. Export getChannel(), connectRabbitMQ(), disconnectRabbitMQ().
 */
