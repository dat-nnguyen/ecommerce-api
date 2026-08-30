import { UnauthorizedError, ForbiddenError } from '@ecommerce/common-errors';
import tokenUtils from '../utils/token.js';

/**
 * Authentication Middleware.
 * Extracts Bearer JWT access token from the Authorization header,
 * verifies signature and expiration, and attaches the decoded user identity to `req.user`.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 *
 * @example
 * router.get('/profile', authenticate, userController.getProfile);
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      throw new UnauthorizedError('Invalid authorization format. Expected: Bearer <token>');
    }

    const token = parts[1];
    const decodedPayload = tokenUtils.verifyAccessToken(token);

    req.user = {
      id: decodedPayload.sub,
      email: decodedPayload.email,
      role: decodedPayload.role,
      ...decodedPayload,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Role-Based Access Control (RBAC) Authorization Middleware Factory.
 * Verifies that the authenticated user possesses one of the required roles.
 *
 * @param {...string|string[]} roles - Allowed roles (e.g. 'ADMIN' or ['CUSTOMER', 'ADMIN']).
 * @returns {import('express').RequestHandler} Express authorization middleware.
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('ADMIN'), userController.deleteUser);
 */
export function authorize(...roles) {
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Access forbidden: Insufficient permissions'));
    }

    return next();
  };
}

export default {
  authenticate,
  authorize,
};
