import redisManager from '../config/redis.js';
import env from '../config/env.js';

/**
 * Retrieves all items from a shopping cart hash in Redis.
 *
 * @param {string} cartKey - Redis key (e.g. `cart:{userId}` or `cart:guest:{guestSessionId}`).
 * @returns {Promise<Array<object>>} Array of parsed cart item objects.
 */
export async function getCart(cartKey) {
  const redis = redisManager.getRedisClient();
  const rawHash = await redis.hgetall(cartKey);

  if (!rawHash || Object.keys(rawHash).length === 0) {
    return [];
  }

  return Object.values(rawHash).map((itemStr) => JSON.parse(itemStr));
}

/**
 * Retrieves a single cart item from the cart hash by product ID.
 *
 * @param {string} cartKey - Redis key for the cart.
 * @param {string} productId - 24-character hexadecimal product ID.
 * @returns {Promise<object|null>} Parsed cart item object or null if not found.
 */
export async function getCartItem(cartKey, productId) {
  const redis = redisManager.getRedisClient();
  const rawItem = await redis.hget(cartKey, productId);

  if (!rawItem) {
    return null;
  }

  return JSON.parse(rawItem);
}

/**
 * Persists or updates a cart item in the Redis hash and refreshes its TTL.
 *
 * @param {string} cartKey - Redis key for the cart.
 * @param {object} item - Cart item object to persist.
 * @param {string} item.productId - Product identifier.
 * @param {number} item.quantity - Item quantity.
 * @returns {Promise<object>} The persisted item.
 */
export async function saveCartItem(cartKey, item) {
  const redis = redisManager.getRedisClient();
  const pipeline = redis.pipeline();

  pipeline.hset(cartKey, item.productId, JSON.stringify(item));
  pipeline.expire(cartKey, env.CART_TTL_SECONDS);

  await pipeline.exec();
  return item;
}

/**
 * Updates a cart item in the Redis hash and refreshes the TTL.
 *
 * @param {string} cartKey - Redis key for the cart.
 * @param {object} item - Updated cart item object.
 * @returns {Promise<object>} The updated item.
 */
export async function updateCartItem(cartKey, item) {
  return saveCartItem(cartKey, item);
}

/**
 * Removes a single item from the cart hash by product ID.
 *
 * @param {string} cartKey - Redis key for the cart.
 * @param {string} productId - Product identifier to delete.
 * @returns {Promise<boolean>} True if operation succeeded.
 */
export async function deleteCartItem(cartKey, productId) {
  const redis = redisManager.getRedisClient();
  await redis.hdel(cartKey, productId);
  return true;
}

/**
 * Completely empties and removes the cart key from Redis.
 *
 * @param {string} cartKey - Redis key for the cart.
 * @returns {Promise<boolean>} True if operation succeeded.
 */
export async function clearCart(cartKey) {
  const redis = redisManager.getRedisClient();
  await redis.del(cartKey);
  return true;
}

/**
 * Merges an anonymous guest cart into an authenticated user's cart in Redis.
 * Items present in both carts have their quantities summed (capped at 99).
 * Preserves the Redis Hash structure and deletes the guest cart.
 *
 * @param {string} sourceKey - Redis key for the guest cart (`cart:guest:{guestSessionId}`).
 * @param {string} targetKey - Redis key for the user cart (`cart:{userId}`).
 * @returns {Promise<Array<object>>} Final merged array of cart items.
 */
export async function mergeCart(sourceKey, targetKey) {
  const guestItems = await getCart(sourceKey);

  if (!guestItems || guestItems.length === 0) {
    return getCart(targetKey);
  }

  const userItems = await getCart(targetKey);
  const mergedMap = new Map();

  // Load existing user items first
  for (const item of userItems) {
    mergedMap.set(item.productId, { ...item });
  }

  // Merge guest items, combining quantities up to 99
  for (const item of guestItems) {
    if (mergedMap.has(item.productId)) {
      const existing = mergedMap.get(item.productId);
      existing.quantity = Math.min(99, existing.quantity + item.quantity);
    } else {
      mergedMap.set(item.productId, { ...item });
    }
  }

  const finalCart = Array.from(mergedMap.values());
  const redis = redisManager.getRedisClient();
  const pipeline = redis.pipeline();

  // Store merged items in target cart hash
  for (const item of finalCart) {
    pipeline.hset(targetKey, item.productId, JSON.stringify(item));
  }
  pipeline.expire(targetKey, env.CART_TTL_SECONDS);

  // Clean up source guest cart
  pipeline.del(sourceKey);

  await pipeline.exec();
  return finalCart;
}

export default {
  getCart,
  getCartItem,
  saveCartItem,
  updateCartItem,
  deleteCartItem,
  clearCart,
  mergeCart,
};
