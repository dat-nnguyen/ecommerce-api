import request from 'supertest';
import app from '../../src/app.js';

describe('HTTP Routes Integration Tests', () => {
  describe('Auth Routes (/api/v1/auth)', () => {
    it('POST /api/v1/auth/register should return 400 when body fails schema validation', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });

    it('POST /api/v1/auth/login should return 400 when email or password is missing', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/auth/refresh should return 400 when refreshToken is empty', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Routes (/api/v1/users)', () => {
    it('GET /api/v1/users/profile should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('PATCH /api/v1/users/profile should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app).patch('/api/v1/users/profile').send({ name: 'Jane' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/v1/users/change-password should return 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).put('/api/v1/users/change-password').send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456@',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
