import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@ecommerce/common-errors';
import env from '../config/env.js';

/**
 * Generates a cryptographically secure pseudo-random token string (hex format).
 * Used for generating opaque refresh tokens, reset tokens, and verification codes.
 *
 * @param {number} [bytes=32] - Number of random bytes to generate.
 * @returns {string} Hexadecimal random string (default: 64 characters).
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Computes a SHA-256 hash of a raw token string.
 * Used to store opaque tokens safely in the database without storing plaintext tokens.
 *
 * @param {string} rawToken - The raw token string to hash.
 * @returns {string} 64-character hexadecimal SHA-256 hash digest.
 * @throws {Error} If rawToken is empty or not a string.
 */
export function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('rawToken must be a non-empty string');
  }

  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Signs a JWT Access Token with user identity claims.
 *
 * @param {object} payload - Identity claims to embed in the token (e.g. { sub: user.id, email: user.email, role: user.role }).
 * @param {object} [options={}] - Optional jsonwebtoken signing options.
 * @param {string} [options.expiresIn] - Custom token expiration duration (defaults to env.JWT_EXPIRES_IN or '15m').
 * @returns {string} Signed JWT Access Token.
 */
export function signAccessToken(payload, options = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be a non-empty object');
  }

  const { expiresIn = env.JWT_EXPIRES_IN || '15m', ...restOptions } = options;

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
    ...restOptions,
  });
}

/**
 * Verifies a JWT Access Token and returns the decoded payload claims.
 *
 * @param {string} token - The JWT token string to verify.
 * @returns {object} Decoded JWT payload claims (e.g. { sub, email, role, iat, exp }).
 * @throws {UnauthorizedError} If the token is invalid, tampered with, or expired.
 */
export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Access token is missing or invalid');
  }

  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}

export default {
  generateRandomToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
};
