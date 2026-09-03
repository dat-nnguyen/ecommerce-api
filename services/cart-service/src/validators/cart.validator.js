import { z } from 'zod';

/**
 * 24-character hexadecimal regular expression matching MongoDB ObjectIds.
 */
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for routes containing `:productId` as a route parameter.
 * Used for:
 * - `PATCH /api/v1/cart/items/:productId`
 * - `DELETE /api/v1/cart/items/:productId`
 */
export const productIdParamSchema = z.object({
  params: z.object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .regex(objectIdRegex, 'Invalid product ID format (must be a 24-character hex ObjectId)'),
  }),
});

/**
 * Validation schema for adding an item to the shopping cart.
 * Used for:
 * - `POST /api/v1/cart/items`
 */
export const addItemSchema = z.object({
  body: z.object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .regex(objectIdRegex, 'Invalid product ID format (must be a 24-character hex ObjectId)'),
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(1, 'Product name cannot be empty')
      .max(200, 'Product name cannot exceed 200 characters'),
    price: z.coerce
      .number({ required_error: 'Price is required' })
      .min(0, 'Price must be non-negative'),
    quantity: z.coerce
      .number()
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(99, 'Quantity cannot exceed 99')
      .default(1),
    image: z.string().url('Image must be a valid URL string').optional(),
  }),
});

/**
 * Validation schema for updating the quantity of an item in the cart.
 * Setting quantity to 0 signals removal of the item from the cart.
 * Used for:
 * - `PATCH /api/v1/cart/items/:productId`
 */
export const updateQuantitySchema = z.object({
  body: z.object({
    quantity: z.coerce
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(0, 'Quantity must be a non-negative integer')
      .max(99, 'Quantity cannot exceed 99'),
  }),
});

/**
 * Validation schema for merging a guest cart into an authenticated user's cart upon login.
 * Used for:
 * - `POST /api/v1/cart/merge`
 */
export const mergeCartSchema = z.object({
  body: z.object({
    guestSessionId: z
      .string({ required_error: 'Guest session ID is required' })
      .trim()
      .min(1, 'Guest session ID cannot be empty'),
  }),
});

export default {
  productIdParamSchema,
  addItemSchema,
  updateQuantitySchema,
  mergeCartSchema,
};
