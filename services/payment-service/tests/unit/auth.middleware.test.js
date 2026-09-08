import { jest } from '@jest/globals';
import { UnauthorizedError, ForbiddenError } from '@ecommerce/common-errors';
import { authenticate, authorize } from '../../src/middlewares/auth.middleware.js';

describe('Auth Middleware (Unit Tests)', () => {
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

  describe('authenticate', () => {
    it('should authenticate from x-user-id header and default role to CUSTOMER', () => {
      mockReq.headers['x-user-id'] = 'user-123';

      authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ id: 'user-123', role: 'CUSTOMER' });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should authenticate from x-user-id and x-user-role headers', () => {
      mockReq.headers['x-user-id'] = 'admin-123';
      mockReq.headers['x-user-role'] = 'ADMIN';

      authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ id: 'admin-123', role: 'ADMIN' });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should authenticate from Bearer JWT token fallback', () => {
      const payload = { sub: 'jwt-user-456', role: 'MANAGER' };
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      mockReq.headers.authorization = `Bearer header.${base64Payload}.signature`;

      authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ id: 'jwt-user-456', role: 'MANAGER' });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass UnauthorizedError to next() if identity is missing', () => {
      authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('authorize', () => {
    it('should pass UnauthorizedError if req.user is missing', () => {
      const middleware = authorize('ADMIN');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should pass ForbiddenError if user role is not allowed', () => {
      mockReq.user = { id: 'user-1', role: 'CUSTOMER' };
      const middleware = authorize('ADMIN');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should call next() if user role is in allowed list', () => {
      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      const middleware = authorize('ADMIN', 'SUPERADMIN');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should support array of roles', () => {
      mockReq.user = { id: 'user-1', role: 'CUSTOMER' };
      const middleware = authorize(['CUSTOMER', 'ADMIN']);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
