import { getPaymentAdapter, getDefaultPaymentAdapter } from '../../src/adapters/index.js';
import { MockPaymentAdapter } from '../../src/adapters/mock.adapter.js';

describe('Payment Adapter Factory (Unit Tests)', () => {
  it('should return MockPaymentAdapter when forceMock is true or in test environment', () => {
    const adapter = getPaymentAdapter({ forceMock: true });
    expect(adapter).toBeInstanceOf(MockPaymentAdapter);
  });

  it('should return a singleton default adapter instance', () => {
    const adapter1 = getDefaultPaymentAdapter();
    const adapter2 = getDefaultPaymentAdapter();
    expect(adapter1).toBe(adapter2);
  });
});
