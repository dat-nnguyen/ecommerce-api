import { jest } from '@jest/globals';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../../src/config/rabbitmq.js';
import orderRepository from '../../src/repositories/order.repository.js';
import orderPublisher from '../../src/events/order.publisher.js';
import { ORDER_STATUS } from '../../src/models/order.model.js';
import {
  startInventoryConsumer,
  INVENTORY_QUEUE,
} from '../../src/consumers/inventory.consumer.js';

describe('Inventory Event Consumer (Unit Tests)', () => {
  let mockChannel;
  let messageHandler;

  beforeEach(() => {
    messageHandler = null;
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue({ queue: INVENTORY_QUEUE }),
      bindQueue: jest.fn().mockResolvedValue(),
      consume: jest.fn().mockImplementation((queue, handler) => {
        messageHandler = handler;
        return Promise.resolve({ consumerTag: 'inventory-consumer-tag' });
      }),
      ack: jest.fn(),
      nack: jest.fn(),
    };

    jest.spyOn(rabbitmqManager, 'getChannel').mockReturnValue(mockChannel);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should assert queue and bind to inventory event exchange with routing keys', async () => {
    const result = await startInventoryConsumer();

    expect(mockChannel.assertQueue).toHaveBeenCalledWith(INVENTORY_QUEUE, { durable: true });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      INVENTORY_QUEUE,
      EVENT_EXCHANGES.INVENTORY,
      ROUTING_KEYS.INVENTORY_RESERVED
    );
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      INVENTORY_QUEUE,
      EVENT_EXCHANGES.INVENTORY,
      ROUTING_KEYS.INVENTORY_FAILED
    );
    expect(mockChannel.consume).toHaveBeenCalledWith(INVENTORY_QUEUE, expect.any(Function));
    expect(result).toEqual({ consumerTag: 'inventory-consumer-tag' });
  });

  it('should transition order to PAYMENT_PENDING on inventory.reserved event', async () => {
    jest.spyOn(orderRepository, 'updateOrderStatus').mockResolvedValue({
      id: 'order-123',
      status: ORDER_STATUS.PAYMENT_PENDING,
    });

    await startInventoryConsumer();

    const mockMsg = {
      content: Buffer.from(JSON.stringify({ orderId: 'order-123', reservationId: 'res-456' })),
      fields: { routingKey: ROUTING_KEYS.INVENTORY_RESERVED },
    };

    await messageHandler(mockMsg);

    expect(orderRepository.updateOrderStatus).toHaveBeenCalledWith(
      'order-123',
      ORDER_STATUS.PAYMENT_PENDING
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });

  it('should transition order to CANCELLED and publish cancellation on inventory.failed event', async () => {
    const cancelledOrder = {
      id: 'order-123',
      status: ORDER_STATUS.CANCELLED,
    };
    jest.spyOn(orderRepository, 'updateOrderStatus').mockResolvedValue(cancelledOrder);
    jest.spyOn(orderPublisher, 'publishOrderCancelled').mockReturnValue(true);

    await startInventoryConsumer();

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({ orderId: 'order-123', reason: 'Insufficient warehouse stock' })
      ),
      fields: { routingKey: ROUTING_KEYS.INVENTORY_FAILED },
    };

    await messageHandler(mockMsg);

    expect(orderRepository.updateOrderStatus).toHaveBeenCalledWith(
      'order-123',
      ORDER_STATUS.CANCELLED
    );
    expect(orderPublisher.publishOrderCancelled).toHaveBeenCalledWith(
      cancelledOrder,
      'Insufficient warehouse stock'
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
  });

  it('should nack message without requeue when error occurs', async () => {
    await startInventoryConsumer();

    const invalidMsg = {
      content: Buffer.from('invalid-json-payload'),
      fields: { routingKey: ROUTING_KEYS.INVENTORY_RESERVED },
    };

    await messageHandler(invalidMsg);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(invalidMsg, false, false);
  });

  it('should nack message when orderId is missing in payload', async () => {
    await startInventoryConsumer();

    const missingOrderIdMsg = {
      content: Buffer.from(JSON.stringify({ reason: 'Out of stock' })),
      fields: { routingKey: ROUTING_KEYS.INVENTORY_FAILED },
    };

    await messageHandler(missingOrderIdMsg);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(missingOrderIdMsg, false, false);
  });

  it('should ignore null/undefined messages', async () => {
    await startInventoryConsumer();

    await messageHandler(null);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });
});
