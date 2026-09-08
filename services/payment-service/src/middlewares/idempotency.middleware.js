import { BadRequestError } from '@ecommerce/common-errors';

/**
 * Express middleware that extracts the idempotency key from HTTP request headers.
 * Inspects `Idempotency-Key` or `x-idempotency-key` and attaches it to `req.idempotencyKey`.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 */
export function extractIdempotencyKey(req, res, next) {
  const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  if (rawKey && typeof rawKey === 'string') {
    const trimmed = rawKey.trim();
    req.idempotencyKey = trimmed.length > 0 ? trimmed : null;
  } else {
    req.idempotencyKey = null;
  }

  return next();
}

/**
 * Express middleware that strictly requires an idempotency key to be present on the request.
 * Should be placed after `extractIdempotencyKey`.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 */
export function requireIdempotencyKey(req, res, next) {
  if (!req.idempotencyKey) {
    return next(new BadRequestError('Idempotency-Key header is required for this operation'));
  }

  return next();
}

export default {
  extractIdempotencyKey,
  requireIdempotencyKey,
};
