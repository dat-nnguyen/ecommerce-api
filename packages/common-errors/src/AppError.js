'use strict';

/**
 * Base Application Error class for domain & operational errors.
 * Extends the native JavaScript Error class.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} [statusCode=500] - HTTP status code.
   * @param {string} [errorCode='INTERNAL_SERVER_ERROR'] - Machine-readable error code.
   * @param {*} [details=null] - Additional contextual data or field errors.
   * @param {boolean} [isOperational=true] - Indicates if error is an expected operational issue.
   */
  constructor(
    message,
    statusCode = 500,
    errorCode = 'INTERNAL_SERVER_ERROR',
    details = null,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializes the error into a standardized JSON response format.
   * @returns {object} Standardized error object.
   */
  toJSON() {
    return {
      code: this.errorCode,
      message: this.message,
      ...(this.details !== null && this.details !== undefined && { details: this.details }),
      timestamp: this.timestamp,
    };
  }
}

module.exports = AppError;
