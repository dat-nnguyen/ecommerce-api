import { jest } from '@jest/globals';
import { z } from 'zod';
import { ValidationError } from '@ecommerce/common-errors';
import { validate } from '../../src/middlewares/validate.js';

describe('Validate Middleware (Unit Tests)', () => {
  const testSchema = z.object({
    body: z.object({
      email: z.string().trim().email('Invalid email format'),
      age: z.number().min(18, 'Must be at least 18'),
    }),
  });

  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass validation and call next() with sanitized data when payload is valid', async () => {
    const req = {
      body: {
        email: '  test@example.com  ',
        age: 20,
      },
      query: {},
      params: {},
    };
    const res = {};

    const middleware = validate(testSchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.validatedData).toBeDefined();
  });

  it('should pass ValidationError with formatted issues to next(err) when payload is invalid', async () => {
    const req = {
      body: {
        email: 'not-an-email',
        age: 15,
      },
      query: {},
      params: {},
    };
    const res = {};

    const middleware = validate(testSchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(ValidationError);
    expect(errorArg.statusCode).toBe(400);
    expect(errorArg.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'body.email', message: 'Invalid email format' }),
        expect.objectContaining({ field: 'body.age', message: 'Must be at least 18' }),
      ])
    );
  });

  it('should call next() immediately if no schema is provided', async () => {
    const req = { body: {} };
    const res = {};

    const middleware = validate(null);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
