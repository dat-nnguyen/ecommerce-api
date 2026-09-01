import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';

/**
 * TODO 4.4.3: Product Express Routes Wiring
 *
 * Routes:
 * - GET /api/v1/products -> listProducts (Public)
 * - GET /api/v1/products/:id -> getProduct (Public)
 * - POST /api/v1/products -> createProduct (Admin Only)
 * - PATCH /api/v1/products/:id -> updateProduct (Admin Only)
 * - DELETE /api/v1/products/:id -> deleteProduct (Admin Only)
 */

const router = Router();

// Public routes
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

// Admin-protected routes (TODO: attach authenticate, authorize('ADMIN'), and validation middlewares)
router.post('/', productController.createProduct);
router.patch('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export default router;
