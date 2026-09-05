import dbManager from '../config/db.js';

/**
 * Creates a new order and its associated line items within an atomic PostgreSQL transaction.
 *
 * @param {Object} params - Order creation parameters.
 * @param {string} params.userId - Unique identifier of the user placing the order.
 * @param {Array<Object>} params.items - List of line items to associate with the order.
 * @param {string} [params.items[].productId] - ID of the product.
 * @param {string} [params.items[].product_id] - Fallback snake_case ID of the product.
 * @param {string} params.items[].name - Product name at time of order.
 * @param {number} params.items[].price - Unit price of the product.
 * @param {number} params.items[].quantity - Quantity ordered.
 * @param {number} params.items[].subtotal - Total line item price (price * quantity).
 * @param {number} params.totalAmount - Aggregate price across all items.
 * @param {string} [params.currency='USD'] - Three-letter ISO currency code.
 * @returns {Promise<Object>} Created order record with nested items array.
 */
export async function createOrder({ userId, items, totalAmount, currency = 'USD' }) {
  const client = await dbManager.getClient();
  try {
    await client.query('BEGIN');

    // 1. Insert master order record
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_amount, currency)
       VALUES ($1, 'PENDING', $2, $3)
       RETURNING *`,
      [userId, totalAmount, currency]
    );
    const order = orderResult.rows[0];

    // 2. Insert line items
    const insertedItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          order.id,
          item.productId ?? item.product_id,
          item.name,
          item.price,
          item.quantity,
          item.subtotal,
        ]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');
    return { ...order, items: insertedItems };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Finds an order by its UUID and loads its line items.
 *
 * @param {string} orderId - Order UUID.
 * @returns {Promise<Object|null>} Order record with nested items array, or null if not found.
 */
export async function findOrderById(orderId) {
  const orderResult = await dbManager.query(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const order = orderResult.rows[0];

  const itemsResult = await dbManager.query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [order.id]
  );

  return { ...order, items: itemsResult.rows };
}

/**
 * Retrieves paginated orders for a specific user ordered by creation date descending.
 *
 * @param {string} userId - User identifier.
 * @param {Object} [options] - Pagination options.
 * @param {number} [options.page=1] - 1-based page index.
 * @param {number} [options.limit=10] - Number of orders per page.
 * @returns {Promise<{ orders: Array<Object>, pagination: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export async function findOrdersByUserId(userId, { page = 1, limit = 10 } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
  const offset = (safePage - 1) * safeLimit;

  const [ordersResult, totalCountResult] = await Promise.all([
    dbManager.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, safeLimit, offset]
    ),
    dbManager.query(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      [userId]
    ),
  ]);

  const total = parseInt(totalCountResult.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / safeLimit) || (total === 0 ? 0 : 1);

  return {
    orders: ordersResult.rows,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
}

/**
 * Updates the lifecycle status of an order and refreshes updated_at timestamp.
 *
 * @param {string} orderId - Order UUID.
 * @param {string} newStatus - New status value to apply.
 * @returns {Promise<Object|null>} Updated order record, or null if order was not found.
 */
export async function updateOrderStatus(orderId, newStatus) {
  const result = await dbManager.query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [newStatus, orderId]
  );

  return result.rows[0] || null;
}

export default {
  createOrder,
  findOrderById,
  findOrdersByUserId,
  updateOrderStatus,
};
