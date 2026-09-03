import env from '../../src/config/env.js';

describe('Cart Service Environment Config (Unit Tests)', () => {
  it('should load validated environment variables', () => {
    expect(env.PORT).toBeDefined();
    expect(typeof env.PORT).toBe('number');
    expect(env.NODE_ENV).toBe('test');
    expect(env.REDIS_URI).toBeDefined();
    expect(env.CART_TTL_SECONDS).toBe(604800);
  });

  it('should export an immutable frozen configuration object', () => {
    expect(Object.isFrozen(env)).toBe(true);
  });
});
