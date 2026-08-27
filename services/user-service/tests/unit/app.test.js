import request from 'supertest';
import app from '../../src/app.js';
import env from '../../src/config/env.js';

describe('User Service Config & App Skeleton (ESM)', () => {
  describe('Environment Configuration', () => {
    it('should have validated configuration values', () => {
      expect(env.NODE_ENV).toBe('test');
      expect(env.DATABASE_URL).toBeDefined();
      expect(env.JWT_SECRET).toBeDefined();
      expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(16);
      expect(env.PORT).toBe(3001);
    });

    it('should be an immutable frozen object', () => {
      expect(Object.isFrozen(env)).toBe(true);
    });
  });

  describe('Observability & Health Endpoints', () => {
    it('GET /health should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'healthy',
        service: 'user-service',
      });
    });

    it('GET /metrics should expose Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.text).toContain('node_');
      expect(res.text).toContain('http_requests_total');
    });

    it('GET /unknown-route should return 404 AppError JSON', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
