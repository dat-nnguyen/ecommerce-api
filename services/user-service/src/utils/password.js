import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt with salt rounds.
 *
 * @param {string} password - The plaintext password to hash.
 * @returns {Promise<string>} The resulting bcrypt hash string.
 * @throws {Error} If password is empty or not a string.
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash in constant time.
 *
 * @param {string} password - The plaintext password to check.
 * @param {string} hashedPassword - The stored bcrypt hash to compare against.
 * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
 */
export async function comparePassword(password, hashedPassword) {
  if (
    !password ||
    !hashedPassword ||
    typeof password !== 'string' ||
    typeof hashedPassword !== 'string'
  ) {
    return false;
  }

  return bcrypt.compare(password, hashedPassword);
}

export default {
  hashPassword,
  comparePassword,
};
