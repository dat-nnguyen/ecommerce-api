import { Router } from 'express';
import orderController from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.js';
import {
  createOrderSchema,
  queryOrdersSchema,
  orderIdParamSchema,
  cancelOrderSchema,
} from '../validators/order.validator.js';

const router = Router();

/**
 * All order routes require authenticated user identity.
 */
router.use(authenticate);

/**
 * @route POST /api/v1/orders
 * @desc Place a new order with line items.
 * @access Private (Authenticated User)
 */
router.post(
  '/',
  validate(createOrderSchema),
  orderController.createOrder
);

/**
 * @route GET /api/v1/orders
 * @desc Retrieve paginated list of orders for the authenticated user.
 * @access Private (Authenticated User / Admin)
 */
router.get(
  '/',
  validate(queryOrdersSchema),
  orderController.listOrders
);

/**
 * @route GET /api/v1/orders/:id
 * @desc Fetch order details and line items by order UUID.
 * @access Private (Order Owner / Admin)
 */
router.get(
  '/:id',
  validate(orderIdParamSchema),
  orderController.getOrder
);

/**
 * @route PATCH /api/v1/orders/:id/cancel
 * @desc Cancel an order and trigger downstream saga compensation.
 * @access Private (Order Owner / Admin)
 */
router.patch(
  '/:id/cancel',
  validate(orderIdParamSchema),
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

export default router;
