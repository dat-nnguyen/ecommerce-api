import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  productIdParamSchema,
  createProductSchema,
  updateProductSchema,
  queryProductsSchema,
} from '../validators/product.validator.js';
import productController from '../controllers/product.controller.js';

const router = Router();

// ----------------------------------------------------
// Public Routes
// ----------------------------------------------------
router.get('/', validate(queryProductsSchema), productController.listProducts);
router.get('/:id', validate(productIdParamSchema), productController.getProduct);

// ----------------------------------------------------
// Admin Mutation Routes
// ----------------------------------------------------
router.post('/', validate(createProductSchema), productController.createProduct);
router.patch(
  '/:id',
  validate(productIdParamSchema),
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete('/:id', validate(productIdParamSchema), productController.deleteProduct);

export default router;
