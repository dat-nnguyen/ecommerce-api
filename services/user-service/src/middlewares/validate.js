import { ValidationError } from '@ecommerce/common-errors';

/**
 * Higher-order Express middleware for validating request data against a Zod schema.
 * Validates req.body, req.query, and req.params simultaneously.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler} Express middleware handler.
 *
 * @example
 * router.post('/register', validate(registerSchema), authController.register);
 */
export function validate(schema) {
  return async (req, res, next) => {
    try {
      if (!schema) {
        return next();
      }

      const parsed = await schema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!parsed.success) {
        const formattedErrors = parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return next(new ValidationError('Validation failed', formattedErrors));
      }

      // Assign sanitized and parsed values back to request
      if (parsed.data.body !== undefined) req.body = parsed.data.body;
      if (parsed.data.query !== undefined) req.query = parsed.data.query;
      if (parsed.data.params !== undefined) req.params = parsed.data.params;
      req.validatedData = parsed.data;

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export default validate;
