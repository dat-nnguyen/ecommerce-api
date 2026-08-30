import { jest } from '@jest/globals';
import * as userController from '../../src/controllers/user.controller.js';
import userService from '../../src/services/user.service.js';

describe('User Controller (Unit Tests)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: { id: 'usr_uuid_100', email: 'test@example.com' },
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

  describe('getProfile', () => {
    it('should return 200 with user profile', async () => {
      const mockProfile = { id: 'usr_uuid_100', email: 'test@example.com', name: 'John' };
      jest.spyOn(userService, 'getProfile').mockResolvedValue(mockProfile);

      await userController.getProfile(req, res, next);

      expect(userService.getProfile).toHaveBeenCalledWith('usr_uuid_100');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });
  });

  describe('updateProfile', () => {
    it('should return 200 with updated profile', async () => {
      const mockUpdated = { id: 'usr_uuid_100', name: 'Jane' };
      req.validatedData.body = { name: 'Jane' };
      jest.spyOn(userService, 'updateProfile').mockResolvedValue(mockUpdated);

      await userController.updateProfile(req, res, next);

      expect(userService.updateProfile).toHaveBeenCalledWith('usr_uuid_100', { name: 'Jane' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: mockUpdated,
      });
    });
  });

  describe('changePassword', () => {
    it('should return 200 with success message on valid password change', async () => {
      req.validatedData.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456@',
      };
      jest.spyOn(userService, 'changePassword').mockResolvedValue({
        message: 'Password changed successfully',
      });

      await userController.changePassword(req, res, next);

      expect(userService.changePassword).toHaveBeenCalledWith(
        'usr_uuid_100',
        'OldPassword123!',
        'NewPassword456@'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });
  });
});
