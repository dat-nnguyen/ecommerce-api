import userService from '../services/user.service.js';

/**
 * Retrieves authenticated user profile (GET /api/v1/users/profile).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function getProfile(req, res, next) {
  try {
    const user = await userService.getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Updates user profile information (PATCH /api/v1/users/profile).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function updateProfile(req, res, next) {
  try {
    const payload = req.validatedData?.body || req.body;
    const result = await userService.updateProfile(req.user.id, payload);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Changes authenticated user password (PUT /api/v1/users/change-password).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.validatedData?.body || req.body;
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: result?.message || 'Password changed successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export default {
  getProfile,
  updateProfile,
  changePassword,
};
