import express from 'express';
import {
  createLogger,
  createMetrics,
  createTraceMiddleware,
  createHttpLoggerMiddleware,
  createHttpMetricsMiddleware,
} from '@ecommerce/logger';
import { errorHandler, NotFoundError } from '@ecommerce/common-errors';
import env from './config/env.js';
import orderRoutes from './routes/order.routes.js';

/**
 * Express application instance for Order Service.
 * Decoupled from HTTP listener to facilitate integration and unit testing.
 * @type {import('express').Express}
 */
export const app = express();

/**
 * Structured logger configured for the Order Service.
 * @type {import('@ecommerce/logger').Logger}
 */
export const logger = createLogger('order-service', { logLevel: env.LOG_LEVEL });

/**
 * Prometheus metrics collector instance for the Order Service.
 * @type {import('@ecommerce/logger').Metrics}
 */
export const metrics = createMetrics('order-service');

// ----------------------------------------------------
// Body Parsers & Observability Middlewares
// ----------------------------------------------------
app.use(express.json());
app.use(createTraceMiddleware());
app.use(createHttpMetricsMiddleware(metrics));
app.use(createHttpLoggerMiddleware(logger));

// ----------------------------------------------------
// Health & Observability Endpoints
// ----------------------------------------------------
/**
 * Prometheus metrics scrape endpoint.
 * Exposes internal runtime and HTTP metrics to monitoring systems.
 *
 * @name GET /metrics
 */
app.get('/metrics', metrics.metricsHandler);

/**
 * Service healthcheck probe.
 * Used by container orchestrators (e.g., Docker, Kubernetes) for liveness/readiness checks.
 *
 * @name GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'order-service' });
});

// ----------------------------------------------------
// Order Domain Routes
// ----------------------------------------------------
app.use('/api/v1/orders', orderRoutes);

// ----------------------------------------------------
// Error Handling Middlewares
// ----------------------------------------------------
/**
 * Catch-all middleware for unmapped routes, forwarding a standard NotFoundError.
 */
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

/**
 * Global centralized error-handling middleware.
 * Formats errors into standard JSON API error responses and records error metrics.
 */
app.use(errorHandler);

export default app;
