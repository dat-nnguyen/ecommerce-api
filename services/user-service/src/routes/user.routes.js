// user.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  updateProfileSchema,
  changePasswordSchema,
} from '../middlewares/validators/user.validator.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate); // Protect all routes below

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.put('/change-password', validate(changePasswordSchema), userController.changePassword);

export default router;
