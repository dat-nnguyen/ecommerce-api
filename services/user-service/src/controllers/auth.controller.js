import authService from '../services/auth.service.js';

/**
 * Handles user registration (POST /api/v1/auth/register).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function register(req, res, next) {
  try {
    const payload = req.validatedData?.body || req.body;
    const result = await authService.register(payload);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles user login and credential verification (POST /api/v1/auth/login).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function login(req, res, next) {
  try {
    const payload = req.validatedData?.body || req.body;
    const result = await authService.login(payload);

    return res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles refresh token rotation (POST /api/v1/auth/refresh).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function refresh(req, res, next) {
  try {
    const refreshToken = req.validatedData?.body?.refreshToken || req.body?.refreshToken;
    const result = await authService.refreshSession(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles user logout and session revocation (POST /api/v1/auth/logout).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>}
 */
export async function logout(req, res, next) {
  try {
    const refreshToken = req.validatedData?.body?.refreshToken || req.body?.refreshToken;
    const result = await authService.logout(refreshToken);

    return res.status(200).json({
      success: true,
      message: result?.message || 'User logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export default {
  register,
  login,
  refresh,
  logout,
};
