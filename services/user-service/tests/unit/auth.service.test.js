import { jest } from '@jest/globals';
import { ConflictError, UnauthorizedError } from '@ecommerce/common-errors';
import * as authService from '../../src/services/auth.service.js';
import userRepository from '../../src/repositories/userRepository.js';
import refreshTokenRepository from '../../src/repositories/refreshTokenRepository.js';
import passwordUtils from '../../src/utils/password.js';

describe('Auth Domain Service (Unit Tests)', () => {
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

  describe('register', () => {
    it('should register a new user and return user + token pair', async () => {
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('$2b$10$hashedPassword123');
      jest.spyOn(userRepository, 'createUser').mockResolvedValue(mockUser);
      jest.spyOn(refreshTokenRepository, 'storeRefreshToken').mockResolvedValue({});

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('Password123!');
      expect(userRepository.createUser).toHaveBeenCalled();
      expect(refreshTokenRepository.storeRefreshToken).toHaveBeenCalled();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw ConflictError if user email is already registered', async () => {
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials and issue tokens', async () => {
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(refreshTokenRepository, 'storeRefreshToken').mockResolvedValue({});

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(passwordUtils.comparePassword).toHaveBeenCalledWith(
        'Password123!',
        mockUser.passwordHash
      );
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedError if user does not exist', async () => {
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password does not match', async () => {
      jest.spyOn(userRepository, 'findUserByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshSession (Refresh Token Rotation & Reuse Detection)', () => {
    const rawRefreshToken = 'raw_refresh_token_string_123';
    const mockTokenRecord = {
      id: 'tok_uuid_1',
      userId: 'usr_uuid_100',
      tokenHash: 'hashed_tok',
      revoked: false,
      expiresAt: new Date(Date.now() + 100000),
      user: mockUser,
    };

    it('should rotate token and issue new token pair on valid refresh', async () => {
      jest.spyOn(refreshTokenRepository, 'findTokenByHash').mockResolvedValue(mockTokenRecord);
      jest.spyOn(refreshTokenRepository, 'revokeToken').mockResolvedValue({});
      jest.spyOn(refreshTokenRepository, 'storeRefreshToken').mockResolvedValue({});

      const result = await authService.refreshSession(rawRefreshToken);

      expect(refreshTokenRepository.findTokenByHash).toHaveBeenCalled();
      expect(refreshTokenRepository.revokeToken).toHaveBeenCalled();
      expect(refreshTokenRepository.storeRefreshToken).toHaveBeenCalled();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('🚨 should detect reuse of revoked token, revoke all sessions, and throw UnauthorizedError', async () => {
      const revokedTokenRecord = { ...mockTokenRecord, revoked: true };
      jest.spyOn(refreshTokenRepository, 'findTokenByHash').mockResolvedValue(revokedTokenRecord);
      jest.spyOn(refreshTokenRepository, 'revokeAllUserTokens').mockResolvedValue({ count: 2 });

      await expect(authService.refreshSession(rawRefreshToken)).rejects.toThrow(UnauthorizedError);
      expect(refreshTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith('usr_uuid_100');
    });

    it('should throw UnauthorizedError if token is expired', async () => {
      const expiredTokenRecord = {
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 10000),
      };
      jest.spyOn(refreshTokenRepository, 'findTokenByHash').mockResolvedValue(expiredTokenRecord);

      await expect(authService.refreshSession(rawRefreshToken)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      jest.spyOn(refreshTokenRepository, 'revokeToken').mockResolvedValue({});

      const result = await authService.logout('raw_token');

      expect(refreshTokenRepository.revokeToken).toHaveBeenCalled();
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
