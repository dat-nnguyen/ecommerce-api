'use strict';

const AppError = require('./AppError');

/**
 * 400 Bad Request Error
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, 'BAD_REQUEST', details, true);
  }
}

/**
 * 401 Unauthorized Error
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, 'UNAUTHORIZED', details, true);
  }
}

/**
 * 403 Forbidden Error
 */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, 'FORBIDDEN', details, true);
  }
}

/**
 * 404 Not Found Error
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details, true);
  }
}

/**
 * 409 Conflict Error (e.g., duplicate unique constraint)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details, true);
  }
}

/**
 * 422 / 400 Validation Error (e.g., Joi / Zod schema validation failures)
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null, statusCode = 400) {
    super(message, statusCode, 'VALIDATION_ERROR', details, true);
  }
}

/**
 * 500 Internal Server Error (Non-operational by default)
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details = null, isOperational = false) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details, isOperational);
  }
}

/**
 * 502 Bad Gateway Error (Upstream service failure)
 */
class BadGatewayError extends AppError {
  constructor(message = 'Bad gateway', details = null) {
    super(message, 502, 'BAD_GATEWAY', details, true);
  }
}

/**
 * 503 Service Unavailable Error
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', details = null) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details, true);
  }
}

/**
 * 504 Gateway Timeout Error
 */
class GatewayTimeoutError extends AppError {
  constructor(message = 'Gateway timeout', details = null) {
    super(message, 504, 'GATEWAY_TIMEOUT', details, true);
  }
}

module.exports = {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  BadGatewayError,
  ServiceUnavailableError,
  GatewayTimeoutError,
};
