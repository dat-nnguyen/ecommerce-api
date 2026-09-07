import { PaymentAdapter } from '../../src/adapters/payment.adapter.js';

describe('PaymentAdapter Base Class (Unit Tests)', () => {
  let adapter;

  beforeEach(() => {
    adapter = new PaymentAdapter();
  });

  it('should throw an error when createPaymentIntent is called directly on base class', async () => {
    await expect(adapter.createPaymentIntent({})).rejects.toThrow(
      'Method createPaymentIntent() must be implemented by subclass (PaymentAdapter)'
    );
  });

  it('should throw an error when capturePayment is called directly on base class', async () => {
    await expect(adapter.capturePayment({})).rejects.toThrow(
      'Method capturePayment() must be implemented by subclass (PaymentAdapter)'
    );
  });

  it('should throw an error when refundPayment is called directly on base class', async () => {
    await expect(adapter.refundPayment({})).rejects.toThrow(
      'Method refundPayment() must be implemented by subclass (PaymentAdapter)'
    );
  });

  it('should allow subclasses to implement the adapter interface', async () => {
    class CustomAdapter extends PaymentAdapter {
      async createPaymentIntent() {
        return { transactionId: 'custom-tx-123', clientSecret: 'cs_123', status: 'REQUIRES_PAYMENT_METHOD' };
      }
      async capturePayment(params) {
        return { transactionId: params.transactionId, status: 'COMPLETED', amount: 100, currency: 'USD' };
      }
      async refundPayment(params) {
        return { transactionId: params.transactionId, refundId: 'ref-123', status: 'REFUNDED', amount: 100, currency: 'USD' };
      }
    }

    const custom = new CustomAdapter();
    const intent = await custom.createPaymentIntent({});
    expect(intent.transactionId).toBe('custom-tx-123');

    const capture = await custom.capturePayment({ transactionId: 'custom-tx-123' });
    expect(capture.status).toBe('COMPLETED');

    const refund = await custom.refundPayment({ transactionId: 'custom-tx-123' });
    expect(refund.status).toBe('REFUNDED');
  });
});
