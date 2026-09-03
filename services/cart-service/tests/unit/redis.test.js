import { jest } from '@jest/globals';
import Redis from 'ioredis';
import redisManager from '../../src/config/redis.js';

describe('Cart Service Redis Client Manager (Unit Tests)', () => {
  afterEach(async () => {
    await redisManager.disconnectRedis();
    jest.restoreAllMocks();
  });

  it('createRedisClient should initialize ioredis with lazyConnect', () => {
    const client = redisManager.createRedisClient('redis://localhost:6379');

    expect(client).toBeInstanceOf(Redis);
    expect(client.options.lazyConnect).toBe(true);

    client.disconnect();
  });

  it('connectRedis should connect the client if status is wait', async () => {
    const connectSpy = jest.spyOn(Redis.prototype, 'connect').mockResolvedValue();

    const client = await redisManager.connectRedis('redis://localhost:6379');

    expect(client).toBeDefined();
    expect(connectSpy).toHaveBeenCalled();
  });

  it('getRedisClient should return the active singleton client', () => {
    const client1 = redisManager.getRedisClient();
    const client2 = redisManager.getRedisClient();

    expect(client1).toBe(client2);
  });

  it('disconnectRedis should invoke quit on active client', async () => {
    const client = redisManager.getRedisClient();
    const quitSpy = jest.spyOn(client, 'quit').mockResolvedValue('OK');

    await redisManager.disconnectRedis();

    expect(quitSpy).toHaveBeenCalled();
  });
});
