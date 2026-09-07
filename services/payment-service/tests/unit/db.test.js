import { jest } from '@jest/globals';
import dbManager from '../../src/config/db.js';

describe('PostgreSQL Database Connection (Unit Tests)', () => {
  const pool = dbManager.getPool();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('query', () => {
    it('should delegate query execution to the pool', async () => {
      const mockResult = { rows: [{ id: 'payment-1' }], rowCount: 1 };
      jest.spyOn(pool, 'query').mockResolvedValue(mockResult);

      const result = await dbManager.query('SELECT * FROM payments WHERE id = $1', ['payment-1']);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM payments WHERE id = $1', ['payment-1']);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getClient', () => {
    it('should acquire a dedicated client from pool', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);

      const client = await dbManager.getClient();

      expect(pool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });
  });

  describe('transaction', () => {
    it('should execute BEGIN, callback, COMMIT, and release client on success', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);

      const callback = jest.fn().mockResolvedValue('transaction-result');
      const result = await dbManager.transaction(callback);

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('transaction-result');
    });

    it('should execute ROLLBACK and release client on error', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);

      const callback = jest.fn().mockRejectedValue(new Error('Simulated DB failure'));

      await expect(dbManager.transaction(callback)).rejects.toThrow('Simulated DB failure');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('connectDB', () => {
    it('should query SELECT 1 and release client', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        release: jest.fn(),
      };
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);

      const activePool = await dbManager.connectDB();

      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalled();
      expect(activePool).toBe(pool);
    });

    it('should throw error if connection fails', async () => {
      const error = new Error('Connection refused');
      jest.spyOn(pool, 'connect').mockRejectedValue(error);

      await expect(dbManager.connectDB()).rejects.toThrow('Connection refused');
    });
  });

  describe('disconnectDB', () => {
    it('should invoke pool.end()', async () => {
      const endSpy = jest.spyOn(pool, 'end').mockResolvedValue();

      await dbManager.disconnectDB();

      expect(endSpy).toHaveBeenCalled();
    });
  });
});
