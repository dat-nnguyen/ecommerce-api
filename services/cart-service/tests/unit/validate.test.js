import { jest } from '@jest/globals';
import { z } from 'zod';
import { ValidationError } from '@ecommerce/common-errors';
import validate from '../../src/middlewares/validate.js';

describe('Validate Middleware (Unit Tests)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {};
    next = jest.fn();
  });

  it('should call next() without error if schema is not provided', async () => {
    const middleware = validate();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should pass validation, attach req.validatedData and sanitize req properties', async () => {
    const schema = z.object({
      body: z.object({
        name: z.string().trim(),
        quantity: z.coerce.number().int(),
      }),
    });

    req.body = { name: '  Keyboard  ', quantity: '3' };

    const middleware = validate(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.name).toBe('Keyboard');
    expect(req.body.quantity).toBe(3);
    expect(req.validatedData).toEqual({
      body: { name: 'Keyboard', quantity: 3 },
    });
  });

  it('should call next with ValidationError when input fails schema parsing', async () => {
    const schema = z.object({
      body: z.object({
        productId: z.string().min(5, 'Product ID must be at least 5 chars'),
      }),
    });

    req.body = { productId: 'abc' };

    const middleware = validate(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual([
      { field: 'body.productId', message: 'Product ID must be at least 5 chars' },
    ]);
  });

  it('should forward unexpected parsing errors to next(error)', async () => {
    const faultySchema = {
      safeParseAsync: jest.fn().mockRejectedValue(new Error('Unexpected runtime parse error')),
    };

    const middleware = validate(faultySchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Unexpected runtime parse error');
  });
});
