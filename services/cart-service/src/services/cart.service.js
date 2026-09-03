import { NotFoundError, BadRequestError } from '@ecommerce/common-errors';
import cartRepository from '../repositories/cart.repository.js';

/**
 * Resolves the Redis storage key for a user cart or anonymous guest session cart.
 *
 * @param {object} params - Identity parameters.
 * @param {string} [params.userId] - Authenticated user identifier.
 * @param {string} [params.guestSessionId] - Anonymous guest session identifier.
 * @returns {string} Formatted Redis cart key (`cart:{userId}` or `cart:guest:{guestSessionId}`).
 * @throws {BadRequestError} If neither identifier is provided.
 */
export function resolveCartKey({ userId, guestSessionId }) {
  if (userId) return `cart:${userId}`;
  if (guestSessionId) return `cart:guest:${guestSessionId}`;

  throw new BadRequestError('Must provide either userId or guestSessionId');
}

/**
 * Formats an array of cart items into a standardized cart response object
 * with computed item count and subtotal rounded to two decimal places.
 *
 * @param {Array<object>} [items=[]] - Array of cart item objects.
 * @returns {{ items: Array<object>, itemCount: number, subtotal: number }}
 */
export function formatCartResponse(items = []) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const rawSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = Math.round(rawSubtotal * 100) / 100;

  return { items, itemCount, subtotal };
}

/**
 * Retrieves the current shopping cart for a user or guest.
 *
 * @param {object} params - Identity parameters.
 * @param {string} [params.userId] - Authenticated user identifier.
 * @param {string} [params.guestSessionId] - Anonymous guest session identifier.
 * @returns {Promise<{ items: Array<object>, itemCount: number, subtotal: number }>}
 */
export async function getCart({ userId, guestSessionId }) {
  const cartKey = resolveCartKey({ userId, guestSessionId });
  const items = await cartRepository.getCart(cartKey);

  return formatCartResponse(items);
}

/**
 * Adds an item to the shopping cart. If the product is already in the cart,
 * increments its quantity; otherwise, stores it as a new cart entry.
 *
 * @param {object} params - Request parameters.
 * @param {string} [params.userId] - Authenticated user identifier.
 * @param {string} [params.guestSessionId] - Anonymous guest session identifier.
 * @param {object} params.item - Item to add.
 * @param {string} params.item.productId - Unique product identifier.
 * @param {string} params.item.name - Product name.
 * @param {number} params.item.price - Unit price.
 * @param {number} params.item.quantity - Quantity to add.
 * @param {string} [params.item.image] - Optional product image URL.
 * @returns {Promise<{ items: Array<object>, itemCount: number, subtotal: number }>}
 */
export async function addItem({ userId, guestSessionId, item }) {
  const cartKey = resolveCartKey({ userId, guestSessionId });
  const existingItem = await cartRepository.getCartItem(cartKey, item.productId);

  if (existingItem) {
    existingItem.quantity += item.quantity;
    await cartRepository.saveCartItem(cartKey, existingItem);
  } else {
    await cartRepository.saveCartItem(cartKey, item);
  }

  return getCart({ userId, guestSessionId });
}

/**
 * Updates the quantity of a specific item in the cart. If the new quantity
 * is zero or negative, removes the item from the cart.
 *
 * @param {object} params - Request parameters.
 * @param {string} [params.userId] - Authenticated user identifier.
 * @param {string} [params.guestSessionId] - Anonymous guest session identifier.
 * @param {string} params.productId - Product identifier to update.
 * @param {number} params.quantity - New quantity value.
 * @returns {Promise<{ items: Array<object>, itemCount: number, subtotal: number }>}
 * @throws {NotFoundError} If the item does not exist in the cart.
 */
export async function updateCartItem({ userId, guestSessionId, productId, quantity }) {
  const cartKey = resolveCartKey({ userId, guestSessionId });
  const existingItem = await cartRepository.getCartItem(cartKey, productId);

  if (!existingItem) {
    throw new NotFoundError(`Item ${productId} not found in cart`);
  }

  if (quantity <= 0) {
    await cartRepository.deleteCartItem(cartKey, productId);
  } else {
    existingItem.quantity = quantity;
    await cartRepository.saveCartItem(cartKey, existingItem);
  }

  return getCart({ userId, guestSessionId });
}

/**
 * Removes a specific item from the cart.
 *
 * @param {object} params - Request parameters.
 * @param {string} [params.userId] - Authenticated user identifier.
 * @param {string} [params.guestSessionId] - Anonymous guest session identifier.
 * @param {string} params.productId - Product identifier to remove.
 * @returns {Promise<{ items: Array<object>, itemCount: number, subtotal: number }>}
 * @throws {NotFoundError} If the item does not exist in the cart.
 */
export async function removeCartItem({ userId, guestSessionId, productId }) {
  const cartKey = resolveCartKey({ userId, guestSessionId });
  const existingItem = await cartRepository.getCartItem(cartKey, productId);

  if (!existingItem) {
    throw new NotFoundError(`Item ${productId} not found in cart`);
  }

  await cartRepository.deleteCartItem(cartKey, productId);
  return getCart({ userId, guestSessionId });
}

/**
 * Clears all items from the shopping cart.
 *
 * @param {object} params - Identity parameters.
 * @param {string} [params.userId] - Authenticated user identifier.
 * @param {string} [params.guestSessionId] - Anonymous guest session identifier.
 * @returns {Promise<{ items: Array<object>, itemCount: number, subtotal: number }>}
 */
export async function clearCart({ userId, guestSessionId }) {
  const cartKey = resolveCartKey({ userId, guestSessionId });

  await cartRepository.clearCart(cartKey);
  return formatCartResponse([]);
}

/**
 * Merges an anonymous guest session cart into an authenticated user's cart upon login.
 *
 * @param {object} params - Merge parameters.
 * @param {string} params.userId - Authenticated user identifier.
 * @param {string} params.guestSessionId - Guest session identifier to merge from.
 * @returns {Promise<{ items: Array<object>, itemCount: number, subtotal: number }>}
 * @throws {BadRequestError} If either identifier is missing.
 */
export async function mergeCart({ userId, guestSessionId }) {
  if (!userId || !guestSessionId) {
    throw new BadRequestError('Both userId and guestSessionId are required to merge carts');
  }

  const sourceKey = `cart:guest:${guestSessionId}`;
  const targetKey = `cart:${userId}`;

  const mergedItems = await cartRepository.mergeCart(sourceKey, targetKey);
  return formatCartResponse(mergedItems);
}

export default {
  resolveCartKey,
  formatCartResponse,
  getCart,
  addItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
};
