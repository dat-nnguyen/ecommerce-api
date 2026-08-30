import { jest } from '@jest/globals';
import { UnauthorizedError, ForbiddenError } from '@ecommerce/common-errors';
import { authenticate, authorize } from '../../src/middlewares/auth.middleware.js';
import tokenUtils from '../../src/utils/token.js';

describe('Auth & RBAC Middlewares (Unit Tests)', () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid Bearer JWT and populate req.user', () => {
      const mockPayload = {
        sub: 'usr_uuid_123',
        email: 'john@example.com',
        role: 'CUSTOMER',
      };
      jest.spyOn(tokenUtils, 'verifyAccessToken').mockReturnValue(mockPayload);

      const req = {
        headers: {
          authorization: 'Bearer valid_jwt_token_string',
        },
      };
      const res = {};

      authenticate(req, res, next);

      expect(tokenUtils.verifyAccessToken).toHaveBeenCalledWith('valid_jwt_token_string');
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('usr_uuid_123');
      expect(req.user.email).toBe('john@example.com');
      expect(req.user.role).toBe('CUSTOMER');
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should pass UnauthorizedError when Authorization header is missing', () => {
      const req = { headers: {} };
      const res = {};

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(UnauthorizedError);
      expect(errorArg.message).toContain('Authorization header is missing');
    });

    it('should pass UnauthorizedError when Authorization header format is malformed', () => {
      const req = {
        headers: {
          authorization: 'Basic some_token',
        },
      };
      const res = {};

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(UnauthorizedError);
      expect(errorArg.message).toContain('Invalid authorization format');
    });

    it('should pass UnauthorizedError when token verification fails', () => {
      jest.spyOn(tokenUtils, 'verifyAccessToken').mockImplementation(() => {
        throw new UnauthorizedError('Access token has expired');
      });

      const req = {
        headers: {
          authorization: 'Bearer expired_token',
        },
      };
      const res = {};

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(UnauthorizedError);
      expect(errorArg.message).toBe('Access token has expired');
    });
  });

  describe('authorize', () => {
    it('should allow access when user role is included in allowed roles', () => {
      const req = {
        user: { id: 'usr_1', role: 'ADMIN' },
      };
      const res = {};

      const guard = authorize('ADMIN');
      guard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should allow access when user role matches one of multiple allowed roles', () => {
      const req = {
        user: { id: 'usr_1', role: 'CUSTOMER' },
      };
      const res = {};

      const guard = authorize('CUSTOMER', 'ADMIN');
      guard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should pass ForbiddenError when user role is not authorized', () => {
      const req = {
        user: { id: 'usr_1', role: 'CUSTOMER' },
      };
      const res = {};

      const guard = authorize('ADMIN');
      guard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(ForbiddenError);
      expect(errorArg.statusCode).toBe(403);
    });

    it('should pass UnauthorizedError if req.user is undefined', () => {
      const req = {};
      const res = {};

      const guard = authorize('ADMIN');
      guard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(UnauthorizedError);
    });
  });
});
