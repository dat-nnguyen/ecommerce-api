import { z } from 'zod';

/**
 * 24-character hexadecimal regex pattern for MongoDB ObjectIds.
 */
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for routes containing product ID in route params.
 */
export const productIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Product ID is required' })
      .regex(objectIdRegex, 'Invalid product ID format (must be a 24-character hex ObjectId)'),
  }),
});

/**
 * Validation schema for creating a new product (POST /api/v1/products).
 */
export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(2, 'Product name must be at least 2 characters long')
      .max(200, 'Product name cannot exceed 200 characters'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters long')
      .max(2000, 'Description cannot exceed 2000 characters'),
    price: z.coerce
      .number({ required_error: 'Price is required' })
      .min(0, 'Price must be a non-negative number'),
    category: z
      .string({ required_error: 'Category is required' })
      .trim()
      .min(1, 'Category cannot be empty'),
    stock: z.coerce
      .number({ required_error: 'Stock is required' })
      .int('Stock must be an integer')
      .min(0, 'Stock cannot be negative')
      .default(0),
    sku: z
      .string({ required_error: 'SKU is required' })
      .trim()
      .min(2, 'SKU must be at least 2 characters long')
      .toUpperCase(),
    images: z
      .array(z.string().url('Each image must be a valid URL string'))
      .default([])
      .optional(),
  }),
});

/**
 * Validation schema for partially updating a product (PATCH /api/v1/products/:id).
 */
export const updateProductSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Product name must be at least 2 characters long')
        .max(200, 'Product name cannot exceed 200 characters')
        .optional(),
      description: z
        .string()
        .trim()
        .min(10, 'Description must be at least 10 characters long')
        .max(2000, 'Description cannot exceed 2000 characters')
        .optional(),
      price: z.coerce.number().min(0, 'Price must be non-negative').optional(),
      category: z.string().trim().min(1, 'Category cannot be empty').optional(),
      stock: z.coerce.number().int('Stock must be an integer').min(0, 'Stock cannot be negative').optional(),
      sku: z.string().trim().min(2, 'SKU must be at least 2 characters long').toUpperCase().optional(),
      images: z.array(z.string().url('Each image must be a valid URL string')).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

/**
 * Validation schema for querying and filtering the product catalog (GET /api/v1/products).
 */
export const queryProductsSchema = z.object({
  query: z
    .object({
      search: z.string().trim().optional(),
      category: z.string().trim().optional(),
      minPrice: z.coerce.number().min(0, 'minPrice cannot be negative').optional(),
      maxPrice: z.coerce.number().min(0, 'maxPrice cannot be negative').optional(),
      page: z.coerce.number().int().positive('Page must be greater than 0').default(1),
      limit: z.coerce
        .number()
        .int()
        .positive('Limit must be greater than 0')
        .max(100, 'Limit cannot exceed 100')
        .default(20),
    })
    .default({ page: 1, limit: 20 }),
});

export default {
  productIdParamSchema,
  createProductSchema,
  updateProductSchema,
  queryProductsSchema,
};
