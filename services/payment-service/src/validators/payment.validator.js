import { z } from 'zod';

/**
 * Zod validation schema for processing a new payment transaction.
 */
export const processPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid('orderId must be a valid UUID'),
    amount: z.number().positive('amount must be greater than 0'),
    currency: z
      .string()
      .trim()
      .length(3, 'currency must be a 3-character ISO code')
      .default('USD')
      .transform((val) => val.toUpperCase()),
    paymentMethod: z
      .string()
      .trim()
      .min(1, 'paymentMethod cannot be empty')
      .default('card'),
  }),
});

/**
 * Zod validation schema for routes parameterized by payment UUID.
 */
export const paymentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Payment ID must be a valid UUID'),
  }),
});

/**
 * Zod validation schema for routes parameterized by order UUID.
 */
export const orderIdParamSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Order ID must be a valid UUID'),
  }),
});

/**
 * Zod validation schema for refunding a completed payment.
 */
export const refundPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Payment ID must be a valid UUID'),
  }),
  body: z
    .object({
      amount: z.number().positive('Refund amount must be greater than 0').optional(),
      reason: z.string().trim().max(255, 'Reason must not exceed 255 characters').default('customer_requested'),
    })
    .default({}),
});

export default {
  processPaymentSchema,
  paymentIdParamSchema,
  orderIdParamSchema,
  refundPaymentSchema,
};
