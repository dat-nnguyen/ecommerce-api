import { jest } from '@jest/globals';
import * as authController from '../../src/controllers/auth.controller.js';
import authService from '../../src/services/auth.service.js';

describe('Auth Controller (Unit Tests)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      validatedData: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('should return 201 with user and token data on successful registration', async () => {
      const mockResult = {
        user: { id: 'usr_1', email: 'test@example.com' },
        tokens: { accessToken: 'acc_tok', refreshToken: 'ref_tok' },
      };
      req.validatedData.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      jest.spyOn(authService, 'register').mockResolvedValue(mockResult);

      await authController.register(req, res, next);

      expect(authService.register).toHaveBeenCalledWith(req.validatedData.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: mockResult,
      });
    });

    it('should call next(error) when authService.register fails', async () => {
      const err = new Error('Database connection failed');
      jest.spyOn(authService, 'register').mockRejectedValue(err);

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('login', () => {
    it('should return 200 with tokens on successful login', async () => {
      const mockResult = {
        user: { id: 'usr_1', email: 'test@example.com' },
        tokens: { accessToken: 'acc_tok', refreshToken: 'ref_tok' },
      };
      req.validatedData.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      jest.spyOn(authService, 'login').mockResolvedValue(mockResult);

      await authController.login(req, res, next);

      expect(authService.login).toHaveBeenCalledWith(req.validatedData.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User logged in successfully',
        data: mockResult,
      });
    });
  });

  describe('refresh', () => {
    it('should return 200 with rotated tokens on successful refresh', async () => {
      const mockResult = {
        tokens: { accessToken: 'new_acc_tok', refreshToken: 'new_ref_tok' },
      };
      req.validatedData.body = { refreshToken: 'raw_ref_tok' };

      jest.spyOn(authService, 'refreshSession').mockResolvedValue(mockResult);

      await authController.refresh(req, res, next);

      expect(authService.refreshSession).toHaveBeenCalledWith('raw_ref_tok');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: mockResult,
      });
    });
  });

  describe('logout', () => {
    it('should return 200 with message on successful logout', async () => {
      req.body = { refreshToken: 'raw_ref_tok' };
      jest.spyOn(authService, 'logout').mockResolvedValue({ message: 'Logged out successfully' });

      await authController.logout(req, res, next);

      expect(authService.logout).toHaveBeenCalledWith('raw_ref_tok');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });
});
