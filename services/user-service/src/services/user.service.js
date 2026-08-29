import { NotFoundError, UnauthorizedError, ConflictError } from '@ecommerce/common-errors';
import userRepository from '../repositories/userRepository.js';
import refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import passwordUtils from '../utils/password.js';

/**
 * Retrieves a user profile by UUID.
 *
 * @param {string} userId - User UUID.
 * @returns {Promise<object>} User profile (excluding passwordHash).
 * @throws {NotFoundError} If the user is not found.
 */
export async function getProfile(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}

/**
 * Updates a user's profile information.
 *
 * @param {string} userId - User UUID.
 * @param {object} data - Profile fields to update.
 * @param {string} [data.email] - New email.
 * @param {string} [data.name] - New name.
 * @returns {Promise<object>} Updated user profile.
 * @throws {NotFoundError} If the user is not found.
 * @throws {ConflictError} If the email is already in use by another user.
 */
export async function updateProfile(userId, data) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (data.email) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await userRepository.findUserByEmail(normalizedEmail);
    if (existing && existing.id !== userId) {
      throw new ConflictError(`Email '${normalizedEmail}' is already in use`);
    }
  }

  // Prevent direct password or role alteration through standard profile updates
  // eslint-disable-next-line no-unused-vars
  const { password, passwordHash, role, ...safeUpdateData } = data;

  return userRepository.updateUser(userId, safeUpdateData);
}

/**
 * Changes a user's password and revokes all active refresh tokens.
 *
 * @param {string} userId - User UUID.
 * @param {string} oldPassword - Plaintext current password.
 * @param {string} newPassword - Plaintext new password.
 * @returns {Promise<{ message: string }>} Success message.
 * @throws {NotFoundError} If user is not found.
 * @throws {UnauthorizedError} If oldPassword is incorrect.
 */
export async function changePassword(userId, oldPassword, newPassword) {
  const user = await userRepository.findUserById(userId, { includePassword: true });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isPasswordValid = await passwordUtils.comparePassword(oldPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const newPasswordHash = await passwordUtils.hashPassword(newPassword);
  await userRepository.updateUser(userId, { passwordHash: newPasswordHash });

  // Security measure: Invalidate all other active sessions upon password change
  await refreshTokenRepository.revokeAllUserTokens(userId);

  return { message: 'Password changed successfully' };
}

export default {
  getProfile,
  updateProfile,
  changePassword,
};
