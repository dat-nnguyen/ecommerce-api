import { jest } from '@jest/globals';
import { NotFoundError, UnauthorizedError, ConflictError } from '@ecommerce/common-errors';
import * as userService from '../../src/services/user.service.js';
import userRepository from '../../src/repositories/userRepository.js';
import refreshTokenRepository from '../../src/repositories/refreshTokenRepository.js';
import passwordUtils from '../../src/utils/password.js';

describe('User Domain Service (Unit Tests)', () => {
  const mockUser = {
    id: 'usr_uuid_100',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedPassword123',
    name: 'Test User',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date(),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile if found', async () => {
      jest.spyOn(userRepository, 'findUserById').mockResolvedValue(mockUser);

      const result = await userService.getProfile('usr_uuid_100');

      expect(userRepository.findUserById).toHaveBeenCalledWith('usr_uuid_100');
      expect(result.id).toBe('usr_uuid_100');
    });

    it('should throw NotFoundError if user not found', async () => {
      jest.spyOn(userRepository, 'findUserById').mockResolvedValue(null);

      await expect(userService.getProfile('non_existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      jest.spyOn(userRepository, 'findUserById').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'updateUser').mockResolvedValue({ ...mockUser, name: 'New Name' });

      const result = await userService.updateProfile('usr_uuid_100', {
        name: 'New Name',
        email: 'newemail@example.com',
      });

      expect(userRepository.updateUser).toHaveBeenCalledWith('usr_uuid_100', {
        name: 'New Name',
        email: 'newemail@example.com',
      });
      expect(result.name).toBe('New Name');
    });

    it('should throw ConflictError if email is taken by another user', async () => {
      jest.spyOn(userRepository, 'findUserById').mockResolvedValue(mockUser);
      jest
        .spyOn(userRepository, 'findUserByEmail')
        .mockResolvedValue({ id: 'other_user_id', email: 'taken@example.com' });

      await expect(
        userService.updateProfile('usr_uuid_100', { email: 'taken@example.com' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('changePassword', () => {
    it('should verify old password, update new hash, and revoke all sessions', async () => {
      jest.spyOn(userRepository, 'findUserById').mockResolvedValue(mockUser);
      jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('$2b$10$newHash123');
      jest.spyOn(userRepository, 'updateUser').mockResolvedValue({ ...mockUser });
      jest.spyOn(refreshTokenRepository, 'revokeAllUserTokens').mockResolvedValue({ count: 3 });

      const result = await userService.changePassword('usr_uuid_100', 'OldPass123!', 'NewPass456!');

      expect(passwordUtils.comparePassword).toHaveBeenCalledWith(
        'OldPass123!',
        mockUser.passwordHash
      );
      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('NewPass456!');
      expect(userRepository.updateUser).toHaveBeenCalledWith('usr_uuid_100', {
        passwordHash: '$2b$10$newHash123',
      });
      expect(refreshTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith('usr_uuid_100');
      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw UnauthorizedError if old password does not match', async () => {
      jest.spyOn(userRepository, 'findUserById').mockResolvedValue(mockUser);
      jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(false);

      await expect(
        userService.changePassword('usr_uuid_100', 'WrongOldPass', 'NewPass456!')
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
