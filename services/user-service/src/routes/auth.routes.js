// auth.routes.js
import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../middlewares/validators/auth.validator.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);

export default router;
