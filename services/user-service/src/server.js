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
import prisma from './config/db.js';

/**
 * Express application instance for User Service.
 * @type {express.Express}
 */
const app = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger('user-service');
const metrics = createMetrics('user-service');

app.use(express.json());

// ----------------------------------------------------
// Global Middlewares (Tracing, Metrics, HTTP Logging)
// ----------------------------------------------------
app.use(createTraceMiddleware());
app.use(createHttpMetricsMiddleware(metrics));
app.use(createHttpLoggerMiddleware(logger));

// ----------------------------------------------------
// Health Check & Observability Endpoints
// ----------------------------------------------------
/**
 * Prometheus metrics scrape endpoint.
 */
app.get('/metrics', metrics.metricsHandler);

/**
 * Service healthcheck probe.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'user-service' });
});

// ----------------------------------------------------
// User Routes
// ----------------------------------------------------
/**
 * Fetch all users (excluding sensitive password hashes).
 */
app.get('/api/v1/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Error Handling
// ----------------------------------------------------
/**
 * Unmatched 404 Route Handler
 */
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

/**
 * Centralized Operational Error Handler
 */
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`User service listening on port ${PORT}`);
  });
}

export default app;
