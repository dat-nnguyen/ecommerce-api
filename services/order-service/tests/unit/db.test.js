import { jest } from '@jest/globals';
import dbManager from '../../src/config/db.js';

describe('PostgreSQL Database Connection (Unit Tests)', () => {
  const pool = dbManager.getPool();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('query', () => {
    it('should delegate query execution to the pool', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      jest.spyOn(pool, 'query').mockResolvedValue(mockResult);

      const result = await dbManager.query('SELECT * FROM orders WHERE id = $1', ['123']);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM orders WHERE id = $1', ['123']);
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
