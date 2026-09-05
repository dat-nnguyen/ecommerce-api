import { jest } from '@jest/globals';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../../src/config/rabbitmq.js';
import orderRepository from '../../src/repositories/order.repository.js';
import orderPublisher from '../../src/events/order.publisher.js';
import { ORDER_STATUS } from '../../src/models/order.model.js';
import {
  startPaymentConsumer,
  PAYMENT_QUEUE,
} from '../../src/consumers/payment.consumer.js';

describe('Payment Event Consumer (Unit Tests)', () => {
  let mockChannel;
  let messageHandler;

  beforeEach(() => {
    messageHandler = null;
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue({ queue: PAYMENT_QUEUE }),
      bindQueue: jest.fn().mockResolvedValue(),
      consume: jest.fn().mockImplementation((queue, handler) => {
        messageHandler = handler;
        return Promise.resolve({ consumerTag: 'test-consumer-tag' });
      }),
      ack: jest.fn(),
      nack: jest.fn(),
    };

    jest.spyOn(rabbitmqManager, 'getChannel').mockReturnValue(mockChannel);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should assert queue and bind to payment event exchange with routing keys', async () => {
    const result = await startPaymentConsumer();

    expect(mockChannel.assertQueue).toHaveBeenCalledWith(PAYMENT_QUEUE, { durable: true });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      PAYMENT_QUEUE,
      EVENT_EXCHANGES.PAYMENT,
      ROUTING_KEYS.PAYMENT_COMPLETED
    );
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      PAYMENT_QUEUE,
      EVENT_EXCHANGES.PAYMENT,
      ROUTING_KEYS.PAYMENT_FAILED
    );
    expect(mockChannel.consume).toHaveBeenCalledWith(PAYMENT_QUEUE, expect.any(Function));
    expect(result).toEqual({ consumerTag: 'test-consumer-tag' });
  });

  it('should transition order to CONFIRMED on payment.completed event', async () => {
    jest.spyOn(orderRepository, 'updateOrderStatus').mockResolvedValue({
      id: 'order-123',
      status: ORDER_STATUS.CONFIRMED,
    });

    await startPaymentConsumer();

    const mockMsg = {
      content: Buffer.from(JSON.stringify({ orderId: 'order-123', paymentId: 'pay-456' })),
      fields: { routingKey: ROUTING_KEYS.PAYMENT_COMPLETED },
    };

    await messageHandler(mockMsg);

    expect(orderRepository.updateOrderStatus).toHaveBeenCalledWith(
      'order-123',
      ORDER_STATUS.CONFIRMED
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });

  it('should transition order to CANCELLED and publish cancellation on payment.failed event', async () => {
    const cancelledOrder = {
      id: 'order-123',
      status: ORDER_STATUS.CANCELLED,
    };
    jest.spyOn(orderRepository, 'updateOrderStatus').mockResolvedValue(cancelledOrder);
    jest.spyOn(orderPublisher, 'publishOrderCancelled').mockReturnValue(true);

    await startPaymentConsumer();

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({ orderId: 'order-123', reason: 'Insufficient funds' })
      ),
      fields: { routingKey: ROUTING_KEYS.PAYMENT_FAILED },
    };

    await messageHandler(mockMsg);

    expect(orderRepository.updateOrderStatus).toHaveBeenCalledWith(
      'order-123',
      ORDER_STATUS.CANCELLED
    );
    expect(orderPublisher.publishOrderCancelled).toHaveBeenCalledWith(
      cancelledOrder,
      'Insufficient funds'
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
  });

  it('should nack message without requeue when error occurs', async () => {
    await startPaymentConsumer();

    const invalidMsg = {
      content: Buffer.from('invalid-json-payload'),
      fields: { routingKey: ROUTING_KEYS.PAYMENT_COMPLETED },
    };

    await messageHandler(invalidMsg);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(invalidMsg, false, false);
  });

  it('should nack message when orderId is missing in payload', async () => {
    await startPaymentConsumer();

    const missingOrderIdMsg = {
      content: Buffer.from(JSON.stringify({ someField: 123 })),
      fields: { routingKey: ROUTING_KEYS.PAYMENT_COMPLETED },
    };

    await messageHandler(missingOrderIdMsg);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(missingOrderIdMsg, false, false);
  });

  it('should ignore null/undefined messages', async () => {
    await startPaymentConsumer();

    await messageHandler(null);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });
});
