import prisma from '../config/db.js';

/**
 * User Repository
 * Encapsulates direct database operations for the User entity.
 */

/**
 * Creates a new user in the database.
 *
 * @param {object} userData - User creation parameters.
 * @param {string} userData.email - User email address (unique).
 * @param {string} userData.passwordHash - Pre-hashed password.
 * @param {string} [userData.name] - Full name of the user.
 * @param {'CUSTOMER'|'ADMIN'} [userData.role='CUSTOMER'] - Role of the user.
 * @returns {Promise<object>} Created user record.
 */
export async function createUser(userData) {
  if (!userData.email || !userData.passwordHash) {
    throw new Error('Email and passwordHash are required fields');
  }

  return prisma.user.create({
    data: {
      email: userData.email.toLowerCase().trim(),
      passwordHash: userData.passwordHash,
      name: userData.name || null,
      role: userData.role || 'CUSTOMER',
    },
  });
}

/**
 * Finds a user by their email address.
 *
 * @param {string} email - Email address to search for.
 * @returns {Promise<object|null>} User record (with passwordHash for verification) or null.
 */
export async function findUserByEmail(email) {
  if (!email) return null;

  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

/**
 * Finds a user by their UUID primary key.
 *
 * @param {string} id - User UUID.
 * @param {object} [options={}] - Query options.
 * @param {boolean} [options.includePassword=false] - Whether to include passwordHash in the returned object.
 * @returns {Promise<object|null>} User record or null if not found.
 */
export async function findUserById(id, options = { includePassword: false }) {
  if (!id) return null;

  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      ...(options.includePassword && { passwordHash: true }),
    },
  });
}

/**
 * Updates an existing user record.
 *
 * @param {string} id - User UUID.
 * @param {object} updateData - Data fields to update.
 * @param {string} [updateData.email] - New email address.
 * @param {string} [updateData.passwordHash] - New password hash.
 * @param {string} [updateData.name] - New name.
 * @param {'CUSTOMER'|'ADMIN'} [updateData.role] - New role.
 * @param {boolean} [updateData.isActive] - Account status flag.
 * @returns {Promise<object>} Updated user record.
 */
export async function updateUser(id, updateData) {
  if (!id || !updateData) {
    throw new Error('Id and updateData are required fields');
  }

  const data = { ...updateData };
  if (data.email) {
    data.email = data.email.toLowerCase().trim();
  }

  return prisma.user.update({
    where: { id },
    data,
  });
}

/**
 * Deletes a user by their UUID primary key (hard delete).
 * Cascades to delete associated refresh tokens.
 *
 * @param {string} id - User UUID.
 * @returns {Promise<object>} Deleted user record.
 */
export async function deleteUser(id) {
  if (!id) {
    throw new Error('Id is a required field');
  }

  return prisma.user.delete({
    where: { id },
  });
}

/**
 * Counts total registered users.
 *
 * @param {object} [where={}] - Optional query filters.
 * @returns {Promise<number>} Total user count.
 */
export async function countUsers(where = {}) {
  return prisma.user.count({ where });
}

export default {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser,
  countUsers,
};
