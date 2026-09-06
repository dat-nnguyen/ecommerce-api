import { jest } from '@jest/globals';
import { UnauthorizedError, ForbiddenError } from '@ecommerce/common-errors';
import { authenticate, authorize } from '../../src/middlewares/auth.middleware.js';

describe('Auth Middleware (Unit Tests)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate and attach req.user from x-user-id and x-user-role headers', () => {
      req.headers['x-user-id'] = 'user-123';
      req.headers['x-user-role'] = 'ADMIN';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({
        id: 'user-123',
        role: 'ADMIN',
      });
    });

    it('should default role to CUSTOMER when x-user-role is omitted', () => {
      req.headers['x-user-id'] = 'user-456';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({
        id: 'user-456',
        role: 'CUSTOMER',
      });
    });

    it('should decode user identity from Bearer token fallback', () => {
      const payload = { sub: 'user-jwt-789', role: 'SELLER' };
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      req.headers.authorization = `Bearer header.${base64Payload}.signature`;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({
        id: 'user-jwt-789',
        role: 'SELLER',
      });
    });

    it('should forward UnauthorizedError when user ID is missing', () => {
      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should preserve existing req.user if already attached', () => {
      req.user = { id: 'pre-existing-user', role: 'ADMIN' };

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({
        id: 'pre-existing-user',
        role: 'ADMIN',
      });
    });
  });

  describe('authorize', () => {
    it('should allow access when user role matches allowed roles', () => {
      req.user = { id: 'admin-1', role: 'ADMIN' };
      const middleware = authorize('ADMIN', 'SUPERADMIN');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow access when roles are passed as an array', () => {
      req.user = { id: 'admin-1', role: 'ADMIN' };
      const middleware = authorize(['ADMIN', 'SUPERADMIN']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should forward UnauthorizedError if req.user is missing', () => {
      const middleware = authorize('ADMIN');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should forward ForbiddenError if user role is not permitted', () => {
      req.user = { id: 'user-1', role: 'CUSTOMER' };
      const middleware = authorize('ADMIN');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access forbidden: Insufficient permissions');
    });
  });
});
