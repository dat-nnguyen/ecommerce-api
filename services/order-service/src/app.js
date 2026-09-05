/**
 * TODO 6.1.4: Decoupled Express App Definition
 *
 * Requirements:
 * 1. Express app instance with express.json().
 * 2. Observability middlewares from @ecommerce/logger:
 *    - createTraceMiddleware()
 *    - createHttpMetricsMiddleware(metrics)
 *    - createHttpLoggerMiddleware(logger)
 * 3. Health & metrics endpoints: /health and /metrics.
 * 4. Mount order routes at /api/v1/orders.
 * 5. Global 404 handler and errorHandler from @ecommerce/common-errors.
 * 6. Export app instance for isolated testing.
 */
