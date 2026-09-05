import env from '../../src/config/env.js';

describe('Order Service Environment Config (Unit Tests)', () => {
  it('should load validated environment variables', () => {
    expect(env.PORT).toBeDefined();
    expect(typeof env.PORT).toBe('number');
    expect(env.NODE_ENV).toBe('test');
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.RABBITMQ_URL).toBeDefined();
    expect(env.LOG_LEVEL).toBeDefined();
  });

  it('should provide boolean environment flags', () => {
    expect(typeof env.isDevelopment).toBe('boolean');
    expect(typeof env.isProduction).toBe('boolean');
    expect(env.isTest).toBe(true);
  });

  it('should export an immutable frozen configuration object', () => {
    expect(Object.isFrozen(env)).toBe(true);
  });
});
