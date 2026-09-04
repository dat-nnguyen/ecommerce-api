import cartService from '../services/cart.service.js';

/**
 * Extracts the user ID (if authenticated) or anonymous guest session ID from the request.
 * Supports authentication middleware objects (req.user.id) and API Gateway headers.
 *
 * @param {import('express').Request} req - Express request object.
 * @returns {{ userId?: string, guestSessionId?: string }} Identity credentials.
 */
const getIdentity = (req) => ({
  userId: req.user?.id || req.headers['x-user-id'],
  guestSessionId: req.headers['x-guest-session-id'],
});

/**
 * Retrieves the current cart for the requesting user or guest.
 *
 * @route GET /api/v1/cart
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 */
export async function getCart(req, res, next) {
  try {
    const { userId, guestSessionId } = getIdentity(req);
    const cart = await cartService.getCart({ userId, guestSessionId });

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return next(error);
  }
}

/**
 * Adds an item to the shopping cart.
 *
 * @route POST /api/v1/cart/items
 * @param {import('express').Request} req - Express request object containing item in body.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 */
export async function addItem(req, res, next) {
  try {
    const { userId, guestSessionId } = getIdentity(req);
    const item = req.body;
    const cart = await cartService.addItem({ userId, guestSessionId, item });

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return next(error);
  }
}

/**
 * Updates the quantity of a specific item in the cart. Setting quantity to 0 removes the item.
 *
 * @route PATCH /api/v1/cart/items/:productId
 * @param {import('express').Request} req - Express request object with productId in params and quantity in body.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 */
export async function updateItemQuantity(req, res, next) {
  try {
    const { userId, guestSessionId } = getIdentity(req);
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateCartItem({ userId, guestSessionId, productId, quantity });

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return next(error);
  }
}

/**
 * Removes a specific item from the shopping cart.
 *
 * @route DELETE /api/v1/cart/items/:productId
 * @param {import('express').Request} req - Express request object with productId in params.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 */
export async function removeItem(req, res, next) {
  try {
    const { userId, guestSessionId } = getIdentity(req);
    const { productId } = req.params;
    const cart = await cartService.removeCartItem({ userId, guestSessionId, productId });

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return next(error);
  }
}

/**
 * Empties all items from the current cart.
 *
 * @route DELETE /api/v1/cart
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 */
export async function clearCart(req, res, next) {
  try {
    const { userId, guestSessionId } = getIdentity(req);
    const cart = await cartService.clearCart({ userId, guestSessionId });

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return next(error);
  }
}

/**
 * Merges a guest session cart into an authenticated user's cart upon login.
 *
 * @route POST /api/v1/cart/merge
 * @param {import('express').Request} req - Express request object with guestSessionId in body or header.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 */
export async function mergeCart(req, res, next) {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const guestSessionId = req.body?.guestSessionId || req.headers['x-guest-session-id'];

    const cart = await cartService.mergeCart({ userId, guestSessionId });

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return next(error);
  }
}

export default {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  mergeCart,
};
