import { jest } from '@jest/globals';
import { BadRequestError } from '@ecommerce/common-errors';
import {
  extractIdempotencyKey,
  requireIdempotencyKey,
} from '../../src/middlewares/idempotency.middleware.js';

describe('Idempotency Middleware (Unit Tests)', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('extractIdempotencyKey', () => {
    it('should extract and trim Idempotency-Key header', () => {
      mockReq.headers['idempotency-key'] = '  custom-key-123  ';

      extractIdempotencyKey(mockReq, mockRes, mockNext);

      expect(mockReq.idempotencyKey).toBe('custom-key-123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract from x-idempotency-key fallback header', () => {
      mockReq.headers['x-idempotency-key'] = 'x-key-456';

      extractIdempotencyKey(mockReq, mockRes, mockNext);

      expect(mockReq.idempotencyKey).toBe('x-key-456');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should set idempotencyKey to null when header is absent or empty whitespace', () => {
      mockReq.headers['idempotency-key'] = '   ';

      extractIdempotencyKey(mockReq, mockRes, mockNext);

      expect(mockReq.idempotencyKey).toBeNull();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireIdempotencyKey', () => {
    it('should call next() if req.idempotencyKey is set', () => {
      mockReq.idempotencyKey = 'valid-key';

      requireIdempotencyKey(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass BadRequestError if req.idempotencyKey is null or undefined', () => {
      mockReq.idempotencyKey = null;

      requireIdempotencyKey(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(mockNext.mock.calls[0][0].message).toContain('Idempotency-Key header is required');
    });
  });
});
