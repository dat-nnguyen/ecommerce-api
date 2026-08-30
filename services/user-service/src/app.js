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
import env from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

export const app = express();
export const logger = createLogger('user-service', { logLevel: env.LOG_LEVEL });
export const metrics = createMetrics('user-service');

app.use(express.json());

// ----------------------------------------------------
// Global Middlewares (Tracing, Metrics, HTTP Logging)
// ----------------------------------------------------
app.use(createTraceMiddleware());
app.use(createHttpMetricsMiddleware(metrics));
app.use(createHttpLoggerMiddleware(logger));

// ----------------------------------------------------
// Observability Endpoints
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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// ----------------------------------------------------
// User Routes (Initial skeleton)
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

export default app;
