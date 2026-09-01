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
import productRoutes from './routes/product.routes.js';

export const app = express();
export const logger = createLogger('product-service', { logLevel: env.LOG_LEVEL });
export const metrics = createMetrics('product-service');

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
app.get('/metrics', metrics.metricsHandler);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'product-service' });
});

// ----------------------------------------------------
// Mount Product Routes
// ----------------------------------------------------
app.use('/api/v1/products', productRoutes);

// ----------------------------------------------------
// Error Handling
// ----------------------------------------------------
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

app.use(errorHandler);

export default app;
