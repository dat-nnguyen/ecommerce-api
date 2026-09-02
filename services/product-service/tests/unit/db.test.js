import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import db from '../../src/config/db.js';

describe('MongoDB Database Connection (Unit Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connectDB should invoke mongoose.connect with URI and default options', async () => {
    const connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    const result = await db.connectDB('mongodb://localhost:27017/test_db');

    expect(connectSpy).toHaveBeenCalledWith(
      'mongodb://localhost:27017/test_db',
      expect.objectContaining({ serverSelectionTimeoutMS: 5000 })
    );
    expect(result).toBe(mongoose);
  });

  it('disconnectDB should invoke mongoose.disconnect if readyState is active', async () => {
    // Mock readyState as connected (1)
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
    const disconnectSpy = jest.spyOn(mongoose, 'disconnect').mockResolvedValue();

    await db.disconnectDB();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('disconnectDB should not invoke mongoose.disconnect if readyState is 0 (disconnected)', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
    const disconnectSpy = jest.spyOn(mongoose, 'disconnect').mockResolvedValue();

    await db.disconnectDB();

    expect(disconnectSpy).not.toHaveBeenCalled();
  });
});
