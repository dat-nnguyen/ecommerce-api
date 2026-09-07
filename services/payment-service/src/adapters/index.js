import env from '../config/env.js';
import { StripeAdapter } from './stripe.adapter.js';
import { MockPaymentAdapter } from './mock.adapter.js';

let defaultAdapter = null;

/**
 * Returns the payment gateway adapter based on environment configuration.
 * Uses MockPaymentAdapter in test environments or when Stripe secret key is a placeholder.
 * Uses StripeAdapter in production or when a real Stripe key is provided.
 *
 * @param {Object} [options] - Configuration options.
 * @param {boolean} [options.forceMock=false] - Force use of MockPaymentAdapter.
 * @returns {import('./payment.adapter.js').PaymentAdapter} Active gateway adapter instance.
 */
export function getPaymentAdapter(options = {}) {
  if (options.forceMock || env.isTest || env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return new MockPaymentAdapter();
  }

  return new StripeAdapter(env.STRIPE_SECRET_KEY);
}

/**
 * Returns the singleton instance of the default payment adapter.
 *
 * @returns {import('./payment.adapter.js').PaymentAdapter}
 */
export function getDefaultPaymentAdapter() {
  if (!defaultAdapter) {
    defaultAdapter = getPaymentAdapter();
  }
  return defaultAdapter;
}

export default getDefaultPaymentAdapter();
