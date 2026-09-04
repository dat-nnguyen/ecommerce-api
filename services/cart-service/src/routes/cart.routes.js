import { Router } from 'express';
import validate from '../middlewares/validate.js';
import {
  productIdParamSchema,
  addItemSchema,
  updateQuantitySchema,
  mergeCartSchema,
} from '../validators/cart.validator.js';
import cartController from '../controllers/cart.controller.js';

const router = Router();

/**
 * @route GET /api/v1/cart
 * @desc Retrieve current cart for authenticated user or anonymous guest
 * @access Public / Authenticated
 */
router.get('/', cartController.getCart);

/**
 * @route POST /api/v1/cart/items
 * @desc Add an item to the cart or increment quantity if already present
 * @access Public / Authenticated
 */
router.post('/items', validate(addItemSchema), cartController.addItem);

/**
 * @route PATCH /api/v1/cart/items/:productId
 * @desc Update the quantity of an item in the cart (quantity 0 removes item)
 * @access Public / Authenticated
 */
router.patch(
  '/items/:productId',
  validate(productIdParamSchema),
  validate(updateQuantitySchema),
  cartController.updateItemQuantity
);

/**
 * @route DELETE /api/v1/cart/items/:productId
 * @desc Remove a specific item from the cart
 * @access Public / Authenticated
 */
router.delete('/items/:productId', validate(productIdParamSchema), cartController.removeItem);

/**
 * @route DELETE /api/v1/cart
 * @desc Clear all items from the cart
 * @access Public / Authenticated
 */
router.delete('/', cartController.clearCart);

/**
 * @route POST /api/v1/cart/merge
 * @desc Merge an anonymous guest cart into an authenticated user's cart upon login
 * @access Authenticated (with guestSessionId in body)
 */
router.post('/merge', validate(mergeCartSchema), cartController.mergeCart);

export default router;
