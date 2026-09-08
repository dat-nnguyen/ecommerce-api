import { jest } from '@jest/globals';
import { z } from 'zod';
import { ValidationError } from '@ecommerce/common-errors';
import { validate } from '../../src/middlewares/validate.js';

describe('Validate Middleware (Unit Tests)', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should call next immediately if no schema is provided', async () => {
    const middleware = validate();
    await middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should pass and attach parsed data on valid input', async () => {
    const testSchema = z.object({
      body: z.object({
        name: z.string().trim(),
        count: z.number().int(),
      }),
    });

    mockReq.body = { name: '  hello  ', count: 5 };

    const middleware = validate(testSchema);
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.body).toEqual({ name: 'hello', count: 5 });
    expect(mockReq.validatedData).toEqual({
      body: { name: 'hello', count: 5 },
    });
  });

  it('should pass ValidationError to next() on schema parsing failure', async () => {
    const testSchema = z.object({
      body: z.object({
        amount: z.number().positive(),
      }),
    });

    mockReq.body = { amount: -10 };

    const middleware = validate(testSchema);
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    const error = mockNext.mock.calls[0][0];
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual([
      expect.objectContaining({
        field: 'body.amount',
      }),
    ]);
  });
});
