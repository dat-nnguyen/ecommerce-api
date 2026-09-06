import orderService from '../services/order.service.js';

/**
 * Creates a new order for the authenticated user.
 *
 * @route POST /api/v1/orders
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { items, currency } = req.validatedData?.body || req.body;

    const order = await orderService.createOrder({ userId, items, currency });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves a single order by ID with ownership or admin authorization.
 *
 * @route GET /api/v1/orders/:id
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function getOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const orderId = req.params.id;

    const order = await orderService.getOrderById({ orderId, userId, isAdmin });

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves paginated orders for the authenticated user.
 *
 * @route GET /api/v1/orders
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function listOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const { page, limit } = req.validatedData?.query || req.query;

    const result = await orderService.listOrders({ userId, page, limit, isAdmin });

    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Cancels an order, verifies lifecycle transitions, and publishes a compensation event.
 *
 * @route PATCH /api/v1/orders/:id/cancel
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response|void>}
 */
export async function cancelOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const orderId = req.params.id;
    const reason = req.body?.reason;

    const order = await orderService.cancelOrder({ orderId, userId, isAdmin, reason });

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

export default {
  createOrder,
  getOrder,
  listOrders,
  cancelOrder,
};
