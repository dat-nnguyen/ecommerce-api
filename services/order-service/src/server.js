import 'dotenv/config';
import express from 'express';
import {
  createLogger,
  createMetrics,
  createTraceMiddleware,
  createHttpLoggerMiddleware,
  createHttpMetricsMiddleware,
} from '@ecommerce/logger';
import { errorHandler, NotFoundError } from '@ecommerce/common-errors';

/**
 * Express application instance for Order Service.
 * @type {express.Express}
 */
const app = express();
const PORT = process.env.PORT || 3004;
const logger = createLogger('order-service');
const metrics = createMetrics('order-service');

app.use(express.json());

// ----------------------------------------------------
// Global Middlewares (Tracing, Metrics, HTTP Logging)
// ----------------------------------------------------
app.use(createTraceMiddleware());
app.use(createHttpMetricsMiddleware(metrics));
app.use(createHttpLoggerMiddleware(logger));

// ----------------------------------------------------
// Health & Observability Endpoints
// ----------------------------------------------------
/**
 * Prometheus metrics scrape endpoint.
 */
app.get('/metrics', metrics.metricsHandler);

/**
 * Service healthcheck probe.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'order-service' });
});

// ----------------------------------------------------
// Order Routes (Placeholder)
// ----------------------------------------------------
app.get('/api/v1/orders', (req, res) => {
  res.status(200).json({ success: true, data: [] });
});

// ----------------------------------------------------
// Error Handling
// ----------------------------------------------------
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Order service listening on port ${PORT}`);
  });
}

export default app;
