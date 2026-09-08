import { jest } from '@jest/globals';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../../src/config/rabbitmq.js';
import paymentRepository from '../../src/repositories/payment.repository.js';
import paymentPublisher from '../../src/events/payment.publisher.js';
import { getDefaultPaymentAdapter } from '../../src/adapters/index.js';
import { PAYMENT_STATUS } from '../../src/models/payment.model.js';
import {
  startOrderConsumer,
  ORDER_EVENT_QUEUE,
} from '../../src/consumers/order.consumer.js';

describe('Order Event Consumer (Unit Tests)', () => {
  let mockChannel;
  let messageHandler;
  let adapter;

  beforeEach(() => {
    messageHandler = null;
    adapter = getDefaultPaymentAdapter();

    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue({ queue: ORDER_EVENT_QUEUE }),
      bindQueue: jest.fn().mockResolvedValue(),
      prefetch: jest.fn(),
      consume: jest.fn().mockImplementation((queue, handler) => {
        messageHandler = handler;
        return Promise.resolve({ consumerTag: 'test-order-consumer-tag' });
      }),
      ack: jest.fn(),
      nack: jest.fn(),
    };

    jest.spyOn(rabbitmqManager, 'getChannel').mockReturnValue(mockChannel);
    jest.spyOn(adapter, 'createPaymentIntent').mockResolvedValue({
      transactionId: 'pi_test_123',
      clientSecret: 'secret_123',
      status: 'requires_capture',
    });
    jest.spyOn(adapter, 'capturePayment').mockResolvedValue({
      transactionId: 'pi_test_123',
      status: 'succeeded',
    });
    jest.spyOn(adapter, 'refundPayment').mockResolvedValue({
      refundId: 're_test_123',
      status: 'succeeded',
      amount: 50.0,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should assert durable queue, bind ORDER_CREATED and ORDER_CANCELLED routing keys, and set prefetch', async () => {
    const result = await startOrderConsumer();

    expect(mockChannel.assertQueue).toHaveBeenCalledWith(ORDER_EVENT_QUEUE, { durable: true });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      ORDER_EVENT_QUEUE,
      EVENT_EXCHANGES.ORDER,
      ROUTING_KEYS.ORDER_CREATED
    );
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      ORDER_EVENT_QUEUE,
      EVENT_EXCHANGES.ORDER,
      ROUTING_KEYS.ORDER_CANCELLED
    );
    expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
    expect(mockChannel.consume).toHaveBeenCalledWith(ORDER_EVENT_QUEUE, expect.any(Function));
    expect(result).toEqual({ consumerTag: 'test-order-consumer-tag' });
  });

  it('should process payment and publish payment.completed on valid order.created event', async () => {
    const mockCreatedPayment = {
      id: 'pay-123',
      orderId: 'order-456',
      userId: 'user-789',
      amount: 150.0,
      currency: 'USD',
      status: PAYMENT_STATUS.PENDING,
      paymentMethod: 'card',
    };

    const mockCompletedPayment = {
      ...mockCreatedPayment,
      status: PAYMENT_STATUS.COMPLETED,
      transactionId: 'pi_test_123',
    };

    jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(null);
    jest.spyOn(paymentRepository, 'createPayment').mockResolvedValue(mockCreatedPayment);
    jest.spyOn(paymentRepository, 'updatePaymentStatus').mockResolvedValue(mockCompletedPayment);
    jest.spyOn(paymentPublisher, 'publishPaymentCompleted').mockReturnValue(true);
    jest.spyOn(paymentPublisher, 'publishPaymentFailed').mockReturnValue(true);

    await startOrderConsumer();

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({
          orderId: 'order-456',
          userId: 'user-789',
          totalAmount: 150.0,
          currency: 'USD',
          paymentMethod: 'card',
        })
      ),
      fields: { routingKey: ROUTING_KEYS.ORDER_CREATED },
    };

    await messageHandler(mockMsg);

    expect(paymentRepository.findPaymentByOrderId).toHaveBeenCalledWith('order-456');
    expect(paymentRepository.createPayment).toHaveBeenCalledWith({
      orderId: 'order-456',
      userId: 'user-789',
      amount: 150.0,
      currency: 'USD',
      paymentMethod: 'card',
      status: PAYMENT_STATUS.PENDING,
    });
    expect(adapter.createPaymentIntent).toHaveBeenCalledWith({
      amount: 150.0,
      currency: 'USD',
      orderId: 'order-456',
      userId: 'user-789',
    });
    expect(adapter.capturePayment).toHaveBeenCalledWith({
      transactionId: 'pi_test_123',
      paymentMethod: 'card',
    });
    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('pay-123', {
      status: PAYMENT_STATUS.COMPLETED,
      transactionId: 'pi_test_123',
    });
    expect(paymentPublisher.publishPaymentCompleted).toHaveBeenCalledWith(mockCompletedPayment);
    expect(paymentPublisher.publishPaymentFailed).not.toHaveBeenCalled();
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });

  it('should update payment to FAILED and publish payment.failed when gateway charge fails', async () => {
    const mockCreatedPayment = {
      id: 'pay-failed-123',
      orderId: 'order-999',
      userId: 'user-999',
      amount: 75.0,
      currency: 'USD',
      status: PAYMENT_STATUS.PENDING,
      paymentMethod: 'card',
    };

    const mockFailedPayment = {
      ...mockCreatedPayment,
      status: PAYMENT_STATUS.FAILED,
      errorMessage: 'Insufficient funds',
    };

    jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(null);
    jest.spyOn(paymentRepository, 'createPayment').mockResolvedValue(mockCreatedPayment);
    adapter.createPaymentIntent.mockRejectedValue(new Error('Insufficient funds'));
    jest.spyOn(paymentRepository, 'updatePaymentStatus').mockResolvedValue(mockFailedPayment);
    jest.spyOn(paymentPublisher, 'publishPaymentFailed').mockReturnValue(true);
    jest.spyOn(paymentPublisher, 'publishPaymentCompleted').mockReturnValue(true);

    await startOrderConsumer();

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({
          orderId: 'order-999',
          userId: 'user-999',
          totalAmount: 75.0,
        })
      ),
      fields: { routingKey: ROUTING_KEYS.ORDER_CREATED },
    };

    await messageHandler(mockMsg);

    expect(paymentRepository.createPayment).toHaveBeenCalled();
    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('pay-failed-123', {
      status: PAYMENT_STATUS.FAILED,
      errorMessage: 'Insufficient funds',
    });
    expect(paymentPublisher.publishPaymentFailed).toHaveBeenCalledWith(
      mockFailedPayment,
      'Insufficient funds'
    );
    expect(paymentPublisher.publishPaymentCompleted).not.toHaveBeenCalled();
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });

  it('should skip duplicate payment processing if payment already exists for order (idempotency)', async () => {
    const existingPayment = {
      id: 'pay-existing-1',
      orderId: 'order-duplicate-1',
      status: PAYMENT_STATUS.COMPLETED,
    };

    jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(existingPayment);
    jest.spyOn(paymentRepository, 'createPayment');

    await startOrderConsumer();

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({
          orderId: 'order-duplicate-1',
          userId: 'user-dup',
          totalAmount: 100,
        })
      ),
      fields: { routingKey: ROUTING_KEYS.ORDER_CREATED },
    };

    await messageHandler(mockMsg);

    expect(paymentRepository.findPaymentByOrderId).toHaveBeenCalledWith('order-duplicate-1');
    expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    expect(adapter.createPaymentIntent).not.toHaveBeenCalled();
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
  });

  it('should refund completed payment on order.cancelled event', async () => {
    const completedPayment = {
      id: 'pay-to-refund-1',
      orderId: 'order-cancel-1',
      amount: 120.0,
      transactionId: 'pi_charge_to_refund',
      status: PAYMENT_STATUS.COMPLETED,
    };

    jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(completedPayment);
    jest.spyOn(paymentRepository, 'updatePaymentStatus').mockResolvedValue({
      ...completedPayment,
      status: PAYMENT_STATUS.REFUNDED,
    });

    await startOrderConsumer();

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({
          orderId: 'order-cancel-1',
          reason: 'Customer requested cancellation',
        })
      ),
      fields: { routingKey: ROUTING_KEYS.ORDER_CANCELLED },
    };

    await messageHandler(mockMsg);

    expect(paymentRepository.findPaymentByOrderId).toHaveBeenCalledWith('order-cancel-1');
    expect(adapter.refundPayment).toHaveBeenCalledWith({
      transactionId: 'pi_charge_to_refund',
      amount: 120.0,
      reason: 'Customer requested cancellation',
    });
    expect(paymentRepository.updatePaymentStatus).toHaveBeenCalledWith('pay-to-refund-1', {
      status: PAYMENT_STATUS.REFUNDED,
    });
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
  });

  it('should ack and ignore order.cancelled event if payment does not exist or was not completed', async () => {
    jest.spyOn(paymentRepository, 'findPaymentByOrderId').mockResolvedValue(null);

    await startOrderConsumer();

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({
          orderId: 'order-unknown-1',
          reason: 'Cancellation test',
        })
      ),
      fields: { routingKey: ROUTING_KEYS.ORDER_CANCELLED },
    };

    await messageHandler(mockMsg);

    expect(adapter.refundPayment).not.toHaveBeenCalled();
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
  });

  it('should nack message without requeue when JSON parsing fails', async () => {
    await startOrderConsumer();

    const invalidJsonMsg = {
      content: Buffer.from('invalid-json-content'),
      fields: { routingKey: ROUTING_KEYS.ORDER_CREATED },
    };

    await messageHandler(invalidJsonMsg);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(invalidJsonMsg, false, false);
  });

  it('should nack message without requeue when orderId is missing', async () => {
    await startOrderConsumer();

    const missingOrderIdMsg = {
      content: Buffer.from(JSON.stringify({ userId: 'user-123', totalAmount: 50 })),
      fields: { routingKey: ROUTING_KEYS.ORDER_CREATED },
    };

    await messageHandler(missingOrderIdMsg);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(missingOrderIdMsg, false, false);
  });

  it('should nack message without requeue when userId is missing or amount is invalid in order.created', async () => {
    await startOrderConsumer();

    const invalidAmountMsg = {
      content: Buffer.from(JSON.stringify({ orderId: 'order-123', userId: 'u1', totalAmount: -10 })),
      fields: { routingKey: ROUTING_KEYS.ORDER_CREATED },
    };

    await messageHandler(invalidAmountMsg);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(invalidAmountMsg, false, false);
  });

  it('should ignore null/undefined messages gracefully', async () => {
    await startOrderConsumer();

    await messageHandler(null);

    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });
});
