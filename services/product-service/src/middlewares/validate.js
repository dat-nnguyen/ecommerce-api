import { ValidationError } from '@ecommerce/common-errors';

/**
 * Express middleware for validating request data against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 * @returns {import('express').RequestHandler} Express middleware handler.
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
