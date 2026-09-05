import { jest } from '@jest/globals';
import fs from 'fs';
import dbManager from '../../src/config/db.js';
import { runMigrations } from '../../src/config/migrate.js';

describe('Database Migration Runner (Unit Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should apply all .sql migration files in transactional blocks', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({}),
      release: jest.fn(),
    };

    jest.spyOn(fs, 'readdirSync').mockReturnValue(['001_init_orders.sql', 'ignore.txt']);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('CREATE TABLE test;');
    jest.spyOn(dbManager, 'getClient').mockResolvedValue(mockClient);
    jest.spyOn(dbManager, 'disconnectDB').mockResolvedValue();

    await runMigrations();

    expect(fs.readdirSync).toHaveBeenCalled();
    expect(dbManager.getClient).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('CREATE TABLE test;');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(dbManager.disconnectDB).toHaveBeenCalled();
  });

  it('should return early if no .sql migration files are found', async () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['readme.md']);
    const getClientSpy = jest.spyOn(dbManager, 'getClient');

    await runMigrations();

    expect(getClientSpy).not.toHaveBeenCalled();
  });

  it('should rollback transaction and release resources on error', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Syntax error in migration')), // SQL execution
      release: jest.fn(),
    };

    jest.spyOn(fs, 'readdirSync').mockReturnValue(['001_init_orders.sql']);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('INVALID SQL;');
    jest.spyOn(dbManager, 'getClient').mockResolvedValue(mockClient);
    jest.spyOn(dbManager, 'disconnectDB').mockResolvedValue();

    await expect(runMigrations()).rejects.toThrow('Syntax error in migration');

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
    expect(dbManager.disconnectDB).toHaveBeenCalled();
  });
});
