import prisma from '../config/db.js';

/**
 * Refresh Token Repository
 * Encapsulates direct database operations for user session and refresh token lifecycle.
 */

/**
 * Stores a new refresh token session in the database.
 *
 * @param {object} tokenData - Token record details.
 * @param {string} tokenData.userId - UUID of the token owner.
 * @param {string} tokenData.tokenHash - Cryptographic SHA-256 hash of the refresh token.
 * @param {Date} tokenData.expiresAt - Expiration timestamp.
 * @returns {Promise<object>} Created RefreshToken record.
 */
export async function storeRefreshToken(tokenData) {
  if (!tokenData.userId || !tokenData.tokenHash || !tokenData.expiresAt) {
    throw new Error('userId, tokenHash, and expiresAt are required fields');
  }

  return prisma.refreshToken.create({
    data: {
      userId: tokenData.userId,
      tokenHash: tokenData.tokenHash,
      expiresAt: tokenData.expiresAt,
    },
  });
}

/**
 * Finds a refresh token record by its cryptographic hash.
 *
 * @param {string} tokenHash - SHA-256 hash of the token.
 * @param {object} [options={}] - Query options.
 * @param {boolean} [options.includeUser=false] - Whether to eager-load the related User entity.
 * @returns {Promise<object|null>} RefreshToken record (with optional User) or null.
 */
export async function findTokenByHash(tokenHash, options = { includeUser: false }) {
  if (!tokenHash) return null;

  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: options.includeUser,
    },
  });
}

/**
 * Soft-revokes a single refresh token by setting revoked to true.
 *
 * @param {string} tokenHash - SHA-256 hash of the token to revoke.
 * @returns {Promise<object>} Updated RefreshToken record.
 */
export async function revokeToken(tokenHash) {
  if (!tokenHash) {
    throw new Error('tokenHash is a required field');
  }

  return prisma.refreshToken.update({
    where: { tokenHash },
    data: { revoked: true },
  });
}

/**
 * Revokes all active refresh tokens for a specific user (e.g., password reset / global logout).
 *
 * @param {string} userId - UUID of the user.
 * @returns {Promise<{ count: number }>} Batch update result count.
 */
export async function revokeAllUserTokens(userId) {
  if (!userId) {
    throw new Error('userId is a required field');
  }

  return prisma.refreshToken.updateMany({
    where: {
      userId,
      revoked: false,
    },
    data: {
      revoked: true,
    },
  });
}

/**
 * Hard deletes a refresh token from the database.
 *
 * @param {string} tokenHash - SHA-256 hash of the token.
 * @returns {Promise<object>} Deleted RefreshToken record.
 */
export async function deleteRefreshToken(tokenHash) {
  if (!tokenHash) {
    throw new Error('tokenHash is a required field');
  }

  return prisma.refreshToken.delete({
    where: { tokenHash },
  });
}

/**
 * Retrieves all active tokens for a specific user.
 *
 * @param {string} userId - User UUID.
 * @returns {Promise<object[]>} List of active tokens.
 */
export async function findActiveTokensByUserId(userId) {
  if (!userId) return [];

  return prisma.refreshToken.findMany({
    where: {
      userId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });
}

/**
 * Purges expired tokens for scheduled database maintenance.
 *
 * @returns {Promise<{ count: number }>} Count of deleted tokens.
 */
export async function deleteExpiredTokens() {
  return prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

export default {
  storeRefreshToken,
  findTokenByHash,
  revokeToken,
  revokeAllUserTokens,
  deleteRefreshToken,
  findActiveTokensByUserId,
  deleteExpiredTokens,
};
