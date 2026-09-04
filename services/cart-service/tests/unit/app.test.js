import request from 'supertest';
import app from '../../src/app.js';

describe('Cart Service App Skeleton (Unit Tests)', () => {
  describe('GET /health', () => {
    it('should return 200 healthy status payload', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'healthy',
        service: 'cart-service',
      });
    });
  });

  describe('GET /metrics', () => {
    it('should expose Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('http_requests_total');
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 for nonexistent routes', async () => {
      const response = await request(app).get('/nonexistent-path');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
