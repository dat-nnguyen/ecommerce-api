import { z } from 'zod';
import { ORDER_STATUS_LIST } from '../models/order.model.js';

/**
 * 24-character hexadecimal regex pattern for MongoDB ObjectIds (from product-service).
 */
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for routes containing order UUID in route params (e.g. GET /api/v1/orders/:id).
 */
export const orderIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Order ID is required' })
      .uuid('Invalid order ID format (must be a valid UUID)'),
  }),
});

/**
 * Validation schema for placing a new order (POST /api/v1/orders).
 */
export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z
            .string({ required_error: 'Product ID is required' })
            .regex(objectIdRegex, 'Invalid product ID format (must be a 24-character hex ObjectId)'),
          name: z
            .string({ required_error: 'Product name is required' })
            .trim()
            .min(1, 'Product name cannot be empty'),
          price: z.coerce
            .number({ required_error: 'Price is required' })
            .positive('Price must be greater than 0'),
          quantity: z.coerce
            .number({ required_error: 'Quantity is required' })
            .int('Quantity must be an integer')
            .positive('Quantity must be at least 1'),
        })
      )
      .min(1, 'At least one item must be provided'),
    currency: z
      .string()
      .length(3, 'Currency must be a 3-letter ISO code')
      .toUpperCase()
      .default('USD'),
  }),
});

/**
 * Validation schema for querying paginated orders (GET /api/v1/orders).
 */
export const queryOrdersSchema = z.object({
  query: z
    .object({
      status: z.enum(ORDER_STATUS_LIST).optional(),
      page: z.coerce
        .number()
        .int('Page must be an integer')
        .positive('Page must be greater than 0')
        .default(1),
      limit: z.coerce
        .number()
        .int('Limit must be an integer')
        .positive('Limit must be greater than 0')
        .max(100, 'Limit cannot exceed 100')
        .default(20),
    })
    .default({ page: 1, limit: 20 }),
});

/**
 * Backward-compatible alias for queryOrdersSchema.
 */
export const listOrderQuerySchema = queryOrdersSchema;

/**
 * Validation schema for cancelling an order (POST /api/v1/orders/:id/cancel).
 */
export const cancelOrderSchema = z.object({
  body: z
    .object({
      reason: z
        .string()
        .trim()
        .min(1, 'Cancellation reason cannot be empty')
        .max(255, 'Cancellation reason cannot exceed 255 characters')
        .optional(),
    })
    .optional(),
});

export default {
  orderIdParamSchema,
  createOrderSchema,
  queryOrdersSchema,
  listOrderQuerySchema,
  cancelOrderSchema,
};
