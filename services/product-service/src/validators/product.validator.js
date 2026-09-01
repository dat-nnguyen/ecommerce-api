import { z } from 'zod';

/**
 * TODO 4.4.1: Product Request Validation Schemas
 *
 * Requirements:
 * Define Zod validation schemas for product endpoints:
 * 1. productIdParamSchema: validates 24-hex MongoDB ObjectId in route params.
 * 2. createProductSchema: validates required name, description, price, category, stock, sku, and images array.
 * 3. updateProductSchema: validates optional fields for partial update (at least one field required).
 * 4. queryProductsSchema: validates search text, category, price range, page, and limit query params.
 */

// TODO: Implement productIdParamSchema
export const productIdParamSchema = z.object({});

// TODO: Implement createProductSchema
export const createProductSchema = z.object({});

// TODO: Implement updateProductSchema
export const updateProductSchema = z.object({});

// TODO: Implement queryProductsSchema
export const queryProductsSchema = z.object({});

export default {
  productIdParamSchema,
  createProductSchema,
  updateProductSchema,
  queryProductsSchema,
};
