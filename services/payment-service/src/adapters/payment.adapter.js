/**
 * Abstract base class defining the Payment Gateway Adapter contract.
 * All concrete gateway adapters (e.g. StripeAdapter, MockPaymentAdapter) must extend this class
 * and implement its interface methods.
 *
 * @abstract
 */
export class PaymentAdapter {
  /**
   * Initializes a payment intent with the external payment gateway provider.
   *
   * @abstract
   * @param {Object} params - Payment intent creation parameters.
   * @param {number} params.amount - Transaction amount.
   * @param {string} [params.currency='USD'] - ISO 4217 three-letter currency code.
   * @param {string} params.orderId - Unique order identifier.
   * @param {string} params.userId - Unique customer identifier.
   * @param {Record<string, any>} [params.metadata={}] - Optional metadata tags.
   * @returns {Promise<{ transactionId: string, clientSecret: string, status: string }>}
   * @throws {Error} If called directly without being overridden by a subclass.
   */
  async createPaymentIntent() {
    throw new Error(`Method createPaymentIntent() must be implemented by subclass (${this.constructor.name})`);
  }

  /**
   * Captures or confirms an authorized payment intent with the gateway.
   *
   * @abstract
   * @param {Object} params - Capture parameters.
   * @param {string} params.transactionId - Gateway transaction/intent ID (e.g. Stripe `pi_...`).
   * @param {string} [params.paymentMethod] - Optional payment method token or ID.
   * @returns {Promise<{ transactionId: string, status: string, amount: number, currency: string }>}
   * @throws {Error} If called directly without being overridden by a subclass.
   */
  async capturePayment() {
    throw new Error(`Method capturePayment() must be implemented by subclass (${this.constructor.name})`);
  }

  /**
   * Issues a full or partial refund for a previously captured payment transaction.
   *
   * @abstract
   * @param {Object} params - Refund parameters.
   * @param {string} params.transactionId - Gateway transaction/intent ID to refund.
   * @param {number} [params.amount] - Optional partial refund amount. If omitted, full refund is issued.
   * @param {string} [params.reason] - Optional reason for refund (e.g. customer_requested, fraud).
   * @returns {Promise<{ transactionId: string, refundId: string, status: string, amount: number, currency: string }>}
   * @throws {Error} If called directly without being overridden by a subclass.
   */
  async refundPayment() {
    throw new Error(`Method refundPayment() must be implemented by subclass (${this.constructor.name})`);
  }
}

export default PaymentAdapter;
