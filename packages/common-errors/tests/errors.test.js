import { jest } from '@jest/globals';
import {
  AppError,
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
  createErrorHandler,
} from '../src/index.js';

describe('Common Errors Package (ESM)', () => {
  describe('AppError base class', () => {
    it('should initialize with default parameters', () => {
      const err = new AppError('Something went wrong');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.message).toBe('Something went wrong');
      expect(err.statusCode).toBe(500);
      expect(err.errorCode).toBe('INTERNAL_SERVER_ERROR');
      expect(err.isOperational).toBe(true);
      expect(err.details).toBeNull();
      expect(err.timestamp).toBeDefined();
    });

    it('should serialize correctly to JSON', () => {
      const details = [{ field: 'email', message: 'invalid email' }];
      const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);
      const json = err.toJSON();

      expect(json).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
        timestamp: err.timestamp,
      });
    });
  });

  describe('Specific Error Subclasses', () => {
    it('should construct BadRequestError with 400', () => {
      const err = new BadRequestError('Invalid input parameter');
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe('BAD_REQUEST');
      expect(err.message).toBe('Invalid input parameter');
    });

    it('should construct NotFoundError with 404', () => {
      const err = new NotFoundError('User not found');
      expect(err.statusCode).toBe(404);
      expect(err.errorCode).toBe('NOT_FOUND');
      expect(err.message).toBe('User not found');
    });

    it('should construct UnauthorizedError with 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.errorCode).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Unauthorized');
    });

    it('should construct ForbiddenError with 403', () => {
      const err = new ForbiddenError('Access Denied');
      expect(err.statusCode).toBe(403);
      expect(err.errorCode).toBe('FORBIDDEN');
    });

    it('should construct ValidationError with 400', () => {
      const err = new ValidationError('Invalid inputs', { field: 'age' });
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual({ field: 'age' });
    });

    it('should construct ConflictError with 409', () => {
      const err = new ConflictError('Email already exists');
      expect(err.statusCode).toBe(409);
      expect(err.errorCode).toBe('CONFLICT');
    });

    it('should construct InternalServerError with 500 and isOperational=false', () => {
      const err = new InternalServerError('Database crashed');
      expect(err.statusCode).toBe(500);
      expect(err.errorCode).toBe('INTERNAL_SERVER_ERROR');
      expect(err.isOperational).toBe(false);
    });

    it('should construct BadGatewayError with 502', () => {
      const err = new BadGatewayError();
      expect(err.statusCode).toBe(502);
      expect(err.errorCode).toBe('BAD_GATEWAY');
    });

    it('should construct ServiceUnavailableError with 503', () => {
      const err = new ServiceUnavailableError();
      expect(err.statusCode).toBe(503);
      expect(err.errorCode).toBe('SERVICE_UNAVAILABLE');
    });

    it('should construct GatewayTimeoutError with 504', () => {
      const err = new GatewayTimeoutError();
      expect(err.statusCode).toBe(504);
      expect(err.errorCode).toBe('GATEWAY_TIMEOUT');
    });
  });

  describe('Express Error Handler Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockLogger;

    beforeEach(() => {
      mockReq = {
        url: '/api/v1/test',
        method: 'GET',
        headers: { 'x-trace-id': 'trace-123' },
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        getHeader: jest.fn().mockReturnValue(null),
      };
      mockNext = jest.fn();
      mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
      };
    });

    it('should format AppError response and log warning for 4xx', () => {
      const handler = createErrorHandler({ logger: mockLogger });
      const err = new NotFoundError('Item not found');

      handler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Item not found',
          },
          traceId: 'trace-123',
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle unhandled native errors with 500 and log error', () => {
      const handler = createErrorHandler({ logger: mockLogger, isProduction: true });
      const nativeErr = new Error('Unexpected database failure');

      handler(nativeErr, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected internal error occurred',
          },
          traceId: 'trace-123',
        })
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
