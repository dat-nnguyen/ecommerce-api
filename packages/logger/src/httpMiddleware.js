'use strict';

const crypto = require('crypto');
const { runWithTraceId } = require('./traceContext');

/**
 * Creates Express middleware to manage trace context and propagate trace IDs.
 * @param {object} [options={}] - Options.
 * @param {string} [options.headerName='x-trace-id'] - Custom trace ID header name.
 * @returns {Function} Express middleware.
 */
function createTraceMiddleware(options = {}) {
  const headerName = options.headerName || 'x-trace-id';

  return function traceMiddleware(req, res, next) {
    const incomingTraceId =
      req.headers[headerName] ||
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'] ||
      crypto.randomUUID();

    req.traceId = incomingTraceId;
    req.id = incomingTraceId;
    res.setHeader(headerName, incomingTraceId);

    runWithTraceId(incomingTraceId, () => {
      next();
    });
  };
}

/**
 * Creates Express HTTP access logging middleware using a Winston logger instance.
 * @param {object} logger - Winston logger instance.
 * @param {object} [options={}] - Options.
 * @param {string[]} [options.skipPaths=['/health', '/metrics', '/favicon.ico']] - Paths to skip logging for.
 * @returns {Function} Express middleware.
 */
function createHttpLoggerMiddleware(logger, options = {}) {
  const skipPaths = new Set(options.skipPaths || ['/health', '/metrics', '/favicon.ico']);

  return function httpLoggerMiddleware(req, res, next) {
    if (skipPaths.has(req.path)) {
      return next();
    }

    const startHrTime = process.hrtime.bigint();

    res.on('finish', () => {
      const endHrTime = process.hrtime.bigint();
      const durationMs = Number(endHrTime - startHrTime) / 1e6;
      const statusCode = res.statusCode;
      const method = req.method;
      const path = req.originalUrl || req.url;

      const logData = {
        trace_id: req.traceId,
        method,
        path,
        status_code: statusCode,
        duration_ms: Math.round(durationMs * 100) / 100,
        content_length: res.getHeader('content-length') || null,
        ip: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'] || null,
      };

      const message = `${method} ${path} ${statusCode} - ${logData.duration_ms}ms`;

      if (statusCode >= 500) {
        logger.error(message, logData);
      } else if (statusCode >= 400) {
        logger.warn(message, logData);
      } else {
        logger.info(message, logData);
      }
    });

    next();
  };
}

/**
 * Creates Express middleware to observe HTTP request metrics into Prometheus instruments.
 * @param {object} metrics - Metrics instance returned from createMetrics().
 * @returns {Function} Express middleware.
 */
function createHttpMetricsMiddleware(metrics) {
  const { httpRequestDurationSeconds, httpRequestsTotal, httpActiveRequests } = metrics;

  return function httpMetricsMiddleware(req, res, next) {
    if (req.path === '/metrics') {
      return next();
    }

    httpActiveRequests.inc({ method: req.method });
    const endTimer = httpRequestDurationSeconds.startTimer({ method: req.method });

    res.on('finish', () => {
      const route = req.route ? req.route.path : req.path;
      const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';

      endTimer({ route, status_code: statusCode });
      httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
      httpActiveRequests.dec({ method: req.method });
    });

    next();
  };
}

module.exports = {
  createTraceMiddleware,
  createHttpLoggerMiddleware,
  createHttpMetricsMiddleware,
};
