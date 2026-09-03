import { ValidationError } from '@ecommerce/common-errors';

/**
 * Express middleware higher-order function that validates incoming request
 * data (body, query, params) against a specified Zod schema.
 *
 * If validation succeeds, sanitized and coerced values are attached to the
 * request object and control passes to the next handler. If validation fails,
 * a standard ValidationError containing field-level details is forwarded to next().
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 * @returns {import('express').RequestHandler} Express request handler middleware.
 */
export function validate(schema) {
  return async (req, res, next) => {
    try {
      if (!schema) return next();

      const parsed = await schema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!parsed.success) {
        const errors = parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return next(new ValidationError('Validation failed', errors));
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
