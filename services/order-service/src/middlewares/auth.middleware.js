/**
 * TODO 6.4.4: Authentication Middleware
 *
 * Requirements:
 * 1. Extract identity from header 'x-user-id' (forwarded by API gateway) or JWT Authorization header.
 * 2. Attach user object to req.user = { id: userId, role: userRole }.
 * 3. Throw UnauthorizedError if identity is missing on protected routes.
 */
