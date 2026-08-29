import { ConflictError, UnauthorizedError } from '@ecommerce/common-errors';
import userRepository from '../repositories/userRepository.js';
import refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import passwordUtils from '../utils/password.js';
import { generateRandomToken, hashToken, signAccessToken } from '../utils/token.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Sanitizes a user object by stripping sensitive fields.
 *
 * @param {object} user - User record from database.
 * @returns {object} Safe user object without passwordHash.
 */
function sanitizeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Helper to generate and persist a new access/refresh token pair.
 *
 * @param {object} user - User record.
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: string }>}
 */
async function issueTokens(user) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const rawRefreshToken = generateRandomToken(32);
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await refreshTokenRepository.storeRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: '15m',
  };
}

/**
 * Registers a new user in the system.
 *
 * @param {object} params - Registration payload.
 * @param {string} params.email - User email.
 * @param {string} params.password - Plaintext password.
 * @param {string} [params.name] - User full name.
 * @param {'CUSTOMER'|'ADMIN'} [params.role='CUSTOMER'] - User role.
 * @returns {Promise<{ user: object, tokens: object }>}
 * @throws {ConflictError} If the email is already registered.
 */
export async function register({ email, password, name, role = 'CUSTOMER' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await userRepository.findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new ConflictError(`User with email '${normalizedEmail}' already exists`);
  }

  const passwordHash = await passwordUtils.hashPassword(password);
  const user = await userRepository.createUser({
    email: normalizedEmail,
    passwordHash,
    name,
    role,
  });

  const tokens = await issueTokens(user);

  return {
    user: sanitizeUser(user),
    tokens,
  };
}

/**
 * Authenticates user credentials and issues an access/refresh token pair.
 *
 * @param {object} params - Login credentials.
 * @param {string} params.email - User email.
 * @param {string} params.password - User password.
 * @returns {Promise<{ user: object, tokens: object }>}
 * @throws {UnauthorizedError} If credentials are invalid or user is inactive.
 */
export async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await passwordUtils.comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await issueTokens(user);

  return {
    user: sanitizeUser(user),
    tokens,
  };
}

/**
 * Refreshes an access token using the Refresh Token Rotation pattern with reuse detection.
 *
 * @param {string} rawRefreshToken - Raw refresh token from client.
 * @returns {Promise<{ tokens: object }>} New token pair.
 * @throws {UnauthorizedError} If the token is invalid, expired, revoked, or reused.
 */
export async function refreshSession(rawRefreshToken) {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    throw new UnauthorizedError('Refresh token is required');
  }

  const incomingHash = hashToken(rawRefreshToken);
  const tokenRecord = await refreshTokenRepository.findTokenByHash(incomingHash, {
    includeUser: true,
  });

  if (!tokenRecord) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // 🚨 Reuse Detection: If a revoked token is presented, an attack or leak has occurred!
  if (tokenRecord.revoked) {
    await refreshTokenRepository.revokeAllUserTokens(tokenRecord.userId);
    throw new UnauthorizedError(
      'Security alert: Refresh token reuse detected. All sessions have been terminated. Please log in again.'
    );
  }

  // Check expiration
  if (new Date(tokenRecord.expiresAt) < new Date()) {
    throw new UnauthorizedError('Refresh token has expired. Please log in again.');
  }

  // Check user status
  if (!tokenRecord.user || !tokenRecord.user.isActive) {
    throw new UnauthorizedError('User account is inactive or disabled');
  }

  // Revoke the consumed refresh token (Rotation)
  await refreshTokenRepository.revokeToken(incomingHash);

  // Issue new token pair
  const tokens = await issueTokens(tokenRecord.user);

  return { tokens };
}

/**
 * Logs out a user session by revoking the given refresh token.
 *
 * @param {string} rawRefreshToken - Raw refresh token to revoke.
 * @returns {Promise<{ message: string }>}
 */
export async function logout(rawRefreshToken) {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    return { message: 'Logged out successfully' };
  }

  const tokenHash = hashToken(rawRefreshToken);
  await refreshTokenRepository.revokeToken(tokenHash);

  return { message: 'Logged out successfully' };
}

export default {
  register,
  login,
  refreshSession,
  logout,
};
