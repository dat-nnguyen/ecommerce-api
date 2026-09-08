import { UnauthorizedError, ForbiddenError } from '@ecommerce/common-errors';

/**
 * Authentication Middleware.
 * Extracts user identity from `x-user-id` header (injected by API Gateway)
 * or fallback Authorization Bearer header, and attaches identity to `req.user`.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 */
export function authenticate(req, res, next) {
  try {
    let userId = req.user?.id || req.headers['x-user-id'];
    let userRole = req.user?.role || req.headers['x-user-role'] || 'CUSTOMER';

    // Optional fallback for direct calls passing Bearer tokens
    const authHeader = req.headers.authorization;
    if (!userId && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub || payload.id;
        userRole = payload.role || userRole;
      } catch {
        // Fall through to !userId validation
      }
    }

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    req.user = { id: String(userId), role: String(userRole) };
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Role-Based Access Control (RBAC) Authorization Middleware Factory.
 * Verifies that the authenticated user possesses one of the allowed roles.
 *
 * @param {...string|string[]} roles - Allowed roles (e.g. 'ADMIN' or ['CUSTOMER', 'ADMIN']).
 * @returns {import('express').RequestHandler} Express authorization middleware.
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
