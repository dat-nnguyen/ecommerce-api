import { jest } from '@jest/globals';
import dbManager from '../../src/config/db.js';
import idempotencyRepository from '../../src/repositories/idempotency.repository.js';

describe('Idempotency Repository (Unit Tests)', () => {
  const mockRow = {
    key: 'idemp-key-1',
    user_id: 'user-123',
    request_path: '/api/v1/payments/process',
    request_params_hash: 'hash-abc-123',
    response_code: null,
    response_body: null,
    status: 'STARTED',
    locked_at: '2026-09-07T12:00:00.000Z',
    created_at: '2026-09-07T12:00:00.000Z',
    updated_at: '2026-09-07T12:00:00.000Z',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrLockKey', () => {
    it('should insert and acquire lock with ON CONFLICT DO NOTHING', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [mockRow] });

      const result = await idempotencyRepository.createOrLockKey({
        key: 'idemp-key-1',
        userId: 'user-123',
        requestPath: '/api/v1/payments/process',
        requestParamsHash: 'hash-abc-123',
      });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (key) DO NOTHING'),
        ['idemp-key-1', 'user-123', '/api/v1/payments/process', 'hash-abc-123']
      );
      expect(result.key).toBe('idemp-key-1');
      expect(result.status).toBe('STARTED');
    });

    it('should return null when key conflict occurs (lock already claimed)', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [] });

      const result = await idempotencyRepository.createOrLockKey({
        key: 'idemp-key-1',
        userId: 'user-123',
        requestPath: '/api/v1/payments/process',
        requestParamsHash: 'hash-abc-123',
      });

      expect(result).toBeNull();
    });

    it('should use provided transaction client when passed', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [mockRow] }),
      };

      const result = await idempotencyRepository.createOrLockKey(
        {
          key: 'idemp-key-1',
          userId: 'user-123',
          requestPath: '/api/v1/payments/process',
          requestParamsHash: 'hash-abc-123',
        },
        mockClient
      );

      expect(mockClient.query).toHaveBeenCalled();
      expect(result.key).toBe('idemp-key-1');
    });
  });

  describe('findKey', () => {
    it('should return mapped idempotency key by key string', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [mockRow] });

      const result = await idempotencyRepository.findKey('idemp-key-1');

      expect(dbManager.query).toHaveBeenCalledWith(
        'SELECT * FROM idempotency_keys WHERE key = $1',
        ['idemp-key-1']
      );
      expect(result.key).toBe('idemp-key-1');
      expect(result.userId).toBe('user-123');
    });

    it('should return null when key is not found', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [] });

      const result = await idempotencyRepository.findKey('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateCompletedKey', () => {
    it('should update key status to COMPLETED and serialize response payload', async () => {
      const completedRow = {
        ...mockRow,
        status: 'COMPLETED',
        response_code: 200,
        response_body: { success: true, paymentId: 'pay-1' },
      };
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [completedRow] });

      const result = await idempotencyRepository.updateCompletedKey({
        key: 'idemp-key-1',
        responseCode: 200,
        responseBody: { success: true, paymentId: 'pay-1' },
      });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'COMPLETED'"),
        [200, JSON.stringify({ success: true, paymentId: 'pay-1' }), 'idemp-key-1']
      );
      expect(result.status).toBe('COMPLETED');
      expect(result.responseCode).toBe(200);
    });
  });

  describe('updateFailedKey', () => {
    it('should update key status to FAILED', async () => {
      const failedRow = {
        ...mockRow,
        status: 'FAILED',
      };
      jest.spyOn(dbManager, 'query').mockResolvedValue({ rows: [failedRow] });

      const result = await idempotencyRepository.updateFailedKey('idemp-key-1');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'FAILED'"),
        ['idemp-key-1']
      );
      expect(result.status).toBe('FAILED');
    });
  });
});
