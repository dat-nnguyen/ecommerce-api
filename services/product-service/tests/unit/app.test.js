import request from 'supertest';
import app from '../../src/app.js';
import env from '../../src/config/env.js';

describe('Product Service Config & App Skeleton (Unit Tests)', () => {
  describe('Environment Configuration', () => {
    it('should load validated environment variables', () => {
      expect(env.PORT).toBeDefined();
      expect(typeof env.PORT).toBe('number');
      expect(env.NODE_ENV).toBe('test');
      expect(env.MONGODB_URI).toBeDefined();
    });

    it('should be an immutable frozen configuration object', () => {
      expect(Object.isFrozen(env)).toBe(true);
    });
  });

  describe('Observability & Health Endpoints', () => {
    it('GET /health should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'healthy',
        service: 'product-service',
      });
    });

    it('GET /metrics should expose Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('process_cpu_user_seconds_total');
    });

    it('GET /unknown-route should return 404 AppError JSON', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
