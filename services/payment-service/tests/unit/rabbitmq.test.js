import { jest } from '@jest/globals';
import amqp from 'amqplib';
import { EVENT_EXCHANGES } from '@ecommerce/event-contracts';
import rabbitmqManager from '../../src/config/rabbitmq.js';

describe('RabbitMQ Connection Manager (Unit Tests)', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await rabbitmqManager.disconnectRabbitMQ().catch(() => {});
  });

  describe('connectRabbitMQ', () => {
    it('should connect, create channel, and assert all required exchanges', async () => {
      const mockChannel = {
        assertExchange: jest.fn().mockResolvedValue(),
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(),
      };
      const mockConnection = {
        createChannel: jest.fn().mockResolvedValue(mockChannel),
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(),
      };

      jest.spyOn(amqp, 'connect').mockResolvedValue(mockConnection);

      const channel = await rabbitmqManager.connectRabbitMQ();

      expect(amqp.connect).toHaveBeenCalled();
      expect(mockConnection.createChannel).toHaveBeenCalled();

      // Ensure all event exchanges are asserted as durable topic exchanges
      for (const exchange of Object.values(EVENT_EXCHANGES)) {
        expect(mockChannel.assertExchange).toHaveBeenCalledWith(
          exchange,
          'topic',
          { durable: true }
        );
      }

      expect(channel).toBe(mockChannel);
      expect(rabbitmqManager.getChannel()).toBe(mockChannel);
      expect(rabbitmqManager.getConnection()).toBe(mockConnection);
    });

    it('should clean up references and throw on connection failure', async () => {
      jest.spyOn(amqp, 'connect').mockRejectedValue(new Error('Connection refused'));

      await expect(rabbitmqManager.connectRabbitMQ()).rejects.toThrow('Connection refused');

      expect(() => rabbitmqManager.getChannel()).toThrow(
        'RabbitMQ channel is not initialized'
      );
      expect(rabbitmqManager.getConnection()).toBeNull();
    });
  });

  describe('getChannel', () => {
    it('should throw if channel is not initialized', () => {
      expect(() => rabbitmqManager.getChannel()).toThrow(
        'RabbitMQ channel is not initialized. Call connectRabbitMQ() first.'
      );
    });
  });

  describe('disconnectRabbitMQ', () => {
    it('should close channel and connection and reset singletons', async () => {
      const mockChannel = {
        assertExchange: jest.fn().mockResolvedValue(),
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(),
      };
      const mockConnection = {
        createChannel: jest.fn().mockResolvedValue(mockChannel),
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(),
      };

      jest.spyOn(amqp, 'connect').mockResolvedValue(mockConnection);
      await rabbitmqManager.connectRabbitMQ();

      await rabbitmqManager.disconnectRabbitMQ();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(rabbitmqManager.getConnection()).toBeNull();
      expect(() => rabbitmqManager.getChannel()).toThrow();
    });

    it('should handle disconnect cleanly when already disconnected', async () => {
      await expect(rabbitmqManager.disconnectRabbitMQ()).resolves.toBeUndefined();
    });
  });
});
