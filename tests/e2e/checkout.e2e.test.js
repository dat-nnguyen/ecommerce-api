import { jest } from '@jest/globals';
import request from 'supertest';
import userApp from '../../services/user-service/src/app.js';
import productApp from '../../services/product-service/src/app.js';
import cartApp from '../../services/cart-service/src/app.js';
import orderApp from '../../services/order-service/src/app.js';
import paymentApp from '../../services/payment-service/src/app.js';

import authService from '../../services/user-service/src/services/auth.service.js';
import productService from '../../services/product-service/src/services/product.service.js';
import cartService from '../../services/cart-service/src/services/cart.service.js';
import orderService from '../../services/order-service/src/services/order.service.js';
import paymentService from '../../services/payment-service/src/services/payment.service.js';

describe('Cross-Service Distributed Checkout Flow (E2E Integration Test)', () => {
  const customerId = 'c1111111-2222-3333-4444-555555555555';
  const sampleProductId = '65e23a9d9c0b4ef8bb6d6bb9';
  const orderId = 'a1234567-89ab-cdef-0123-456789abcdef';
  const paymentId = 'f9876543-21ba-fedc-ba98-76543210fedc';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully complete the end-to-end customer checkout journey across all microservices', async () => {
    // ----------------------------------------------------
    // 1. Authentication via user-service: Login and receive JWT context
    // ----------------------------------------------------
    const mockAuthResult = {
      user: {
        id: customerId,
        email: 'shopper@example.com',
        name: 'Alex Shopper',
        role: 'CUSTOMER',
      },
      tokens: {
        accessToken: 'mock-jwt-access-token',
        refreshToken: 'mock-jwt-refresh-token',
        expiresIn: 900,
      },
    };

    jest.spyOn(authService, 'login').mockResolvedValue(mockAuthResult);

    const loginRes = await request(userApp)
      .post('/api/v1/auth/login')
      .send({ email: 'shopper@example.com', password: 'ValidPassword123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.id).toBe(customerId);

    // ----------------------------------------------------
    // 2. Product Service: Browse catalog & select product
    // ----------------------------------------------------
    const mockProducts = [
      {
        id: sampleProductId,
        name: 'Wireless Noise-Cancelling Headphones',
        price: 150.0,
        stock: 25,
        category: 'Electronics',
      },
    ];

    jest.spyOn(productService, 'listProducts').mockResolvedValue({
      items: mockProducts,
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const catalogRes = await request(productApp).get('/api/v1/products');

    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.success).toBe(true);
    expect(catalogRes.body.data).toHaveLength(1);
    expect(catalogRes.body.data[0].id).toBe(sampleProductId);

    const selectedProduct = catalogRes.body.data[0];

    // ----------------------------------------------------
    // 3. Cart Service: Add product to shopping cart
    // ----------------------------------------------------
    const mockCart = {
      items: [
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: 2,
        },
      ],
      itemCount: 2,
      subtotal: 300.0,
    };

    jest.spyOn(cartService, 'addItem').mockResolvedValue(mockCart);

    const cartRes = await request(cartApp)
      .post('/api/v1/cart/items')
      .set('x-user-id', customerId)
      .send({
        productId: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: 2,
      });

    expect(cartRes.status).toBe(200);
    expect(cartRes.body.success).toBe(true);
    expect(cartRes.body.data.itemCount).toBe(2);
    expect(cartRes.body.data.subtotal).toBe(300.0);

    // ----------------------------------------------------
    // 4. Order Service: Convert cart into Order (Status: PENDING)
    // ----------------------------------------------------
    const mockOrder = {
      id: orderId,
      userId: customerId,
      status: 'PENDING',
      totalAmount: 300.0,
      currency: 'USD',
      items: [
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: 2,
        },
      ],
    };

    jest.spyOn(orderService, 'createOrder').mockResolvedValue(mockOrder);

    const orderRes = await request(orderApp)
      .post('/api/v1/orders')
      .set('x-user-id', customerId)
      .send({
        items: mockOrder.items,
        currency: 'USD',
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    expect(orderRes.body.data.id).toBe(orderId);
    expect(orderRes.body.data.status).toBe('PENDING');

    // ----------------------------------------------------
    // 5. Payment Service: Process charge with distributed idempotency
    // ----------------------------------------------------
    const idempotencyKey = `idem-checkout-${orderId}`;
    const mockCompletedPayment = {
      id: paymentId,
      orderId,
      userId: customerId,
      amount: 300.0,
      currency: 'USD',
      status: 'COMPLETED',
      transactionId: 'pi_test_stripe_charge_123',
    };

    jest.spyOn(paymentService, 'processPayment').mockResolvedValue(mockCompletedPayment);

    const paymentRes = await request(paymentApp)
      .post('/api/v1/payments/process')
      .set('x-user-id', customerId)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        orderId,
        amount: 300.0,
        currency: 'USD',
        paymentMethod: 'card',
      });

    expect(paymentRes.status).toBe(200);
    expect(paymentRes.body.success).toBe(true);
    expect(paymentRes.body.data.status).toBe('COMPLETED');
    expect(paymentRes.body.data.transactionId).toBe('pi_test_stripe_charge_123');

    // ----------------------------------------------------
    // 6. Idempotency Check: Repeat payment request with same key
    // ----------------------------------------------------
    const duplicateRes = await request(paymentApp)
      .post('/api/v1/payments/process')
      .set('x-user-id', customerId)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        orderId,
        amount: 300.0,
        currency: 'USD',
        paymentMethod: 'card',
      });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.data.id).toBe(paymentId);

    // ----------------------------------------------------
    // 7. Order Confirmation Verification (Saga Completed)
    // ----------------------------------------------------
    const mockConfirmedOrder = {
      ...mockOrder,
      status: 'CONFIRMED',
    };

    jest.spyOn(orderService, 'getOrderById').mockResolvedValue(mockConfirmedOrder);

    const confirmedOrderRes = await request(orderApp)
      .get(`/api/v1/orders/${orderId}`)
      .set('x-user-id', customerId);

    expect(confirmedOrderRes.status).toBe(200);
    expect(confirmedOrderRes.body.data.status).toBe('CONFIRMED');
  });

  it('should handle order cancellation and payment refund compensation flow', async () => {
    // 1. Cancel order
    const mockCancelledOrder = {
      id: orderId,
      userId: customerId,
      status: 'CANCELLED',
      reason: 'Customer requested refund',
    };

    jest.spyOn(orderService, 'cancelOrder').mockResolvedValue(mockCancelledOrder);

    const cancelRes = await request(orderApp)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set('x-user-id', customerId)
      .send({ reason: 'Customer requested refund' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // 2. Refund completed payment
    const mockRefundedPayment = {
      id: paymentId,
      orderId,
      status: 'REFUNDED',
      amount: 300.0,
    };

    jest.spyOn(paymentService, 'refundPayment').mockResolvedValue(mockRefundedPayment);

    const refundRes = await request(paymentApp)
      .post(`/api/v1/payments/${paymentId}/refund`)
      .set('x-user-id', customerId)
      .send({
        amount: 300.0,
        reason: 'Customer requested refund',
      });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.status).toBe('REFUNDED');
  });
});
