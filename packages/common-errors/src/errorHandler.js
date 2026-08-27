'use strict';

const AppError = require('./AppError');

/**
 * Creates an Express error-handling middleware.
 * @param {object} [options={}] - Options configuration.
 * @param {object} [options.logger=console] - Logger instance with .error() and .warn() methods.
 * @param {boolean} [options.isProduction=process.env.NODE_ENV === 'production'] - Production mode flag.
 * @returns {Function} Express error middleware (err, req, res, next).
 */
function createErrorHandler(options = {}) {
  const logger = options.logger || console;
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';

  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    const traceId =
      req.traceId ||
      req.headers?.['x-trace-id'] ||
      req.headers?.['x-request-id'] ||
      (typeof res.getHeader === 'function' ? res.getHeader('x-trace-id') : null) ||
      null;

    let appError;

    if (err instanceof AppError) {
      appError = err;
    } else {
      // Unhandled generic error
      const message = isProduction
        ? 'An unexpected internal error occurred'
        : err.message || 'Internal Server Error';
      appError = new AppError(message, 500, 'INTERNAL_SERVER_ERROR', null, false);
      appError.originalError = err;
      if (err.stack) {
        appError.stack = err.stack;
      }
    }

    // Log the error
    if (appError.statusCode >= 500 || !appError.isOperational) {
      if (typeof logger.error === 'function') {
        logger.error(appError.message, {
          trace_id: traceId,
          error_code: appError.errorCode,
          status_code: appError.statusCode,
          stack: err.stack || appError.stack,
          path: req.originalUrl || req.url,
          method: req.method,
        });
      }
    } else if (typeof logger.warn === 'function') {
      logger.warn(appError.message, {
        trace_id: traceId,
        error_code: appError.errorCode,
        status_code: appError.statusCode,
        details: appError.details,
        path: req.originalUrl || req.url,
        method: req.method,
      });
    }

    const payload = {
      success: false,
      error: {
        code: appError.errorCode,
        message: appError.message,
        ...(appError.details !== null &&
          appError.details !== undefined && { details: appError.details }),
      },
      traceId,
      timestamp: appError.timestamp || new Date().toISOString(),
    };

    if (!isProduction && !appError.isOperational && (err.stack || appError.stack)) {
      payload.error.stack = err.stack || appError.stack;
    }

    res.status(appError.statusCode).json(payload);
  };
}

module.exports = {
  createErrorHandler,
  errorHandler: createErrorHandler(),
};
