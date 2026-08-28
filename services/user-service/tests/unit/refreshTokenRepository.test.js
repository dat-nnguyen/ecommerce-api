import { jest } from '@jest/globals';
import prisma from '../../src/config/db.js';
import * as refreshTokenRepository from '../../src/repositories/refreshTokenRepository.js';

describe('Refresh Token Repository (Unit Tests)', () => {
  const mockToken = {
    id: 'tok_uuid_456',
    userId: 'usr_uuid_123',
    tokenHash: 'sha256_mock_hash_string',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    createdAt: new Date(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('storeRefreshToken', () => {
    it('should create and return a new refresh token record', async () => {
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue(mockToken);

      const result = await refreshTokenRepository.storeRefreshToken({
        userId: 'usr_uuid_123',
        tokenHash: 'sha256_mock_hash_string',
        expiresAt: mockToken.expiresAt,
      });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'usr_uuid_123',
          tokenHash: 'sha256_mock_hash_string',
          expiresAt: mockToken.expiresAt,
        },
      });
      expect(result).toEqual(mockToken);
    });

    it('should throw an error if required fields are missing', async () => {
      await expect(
        refreshTokenRepository.storeRefreshToken({ userId: 'usr_uuid_123' })
      ).rejects.toThrow('userId, tokenHash, and expiresAt are required fields');
    });
  });

  describe('findTokenByHash', () => {
    it('should query token by hash', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(mockToken);

      const result = await refreshTokenRepository.findTokenByHash('sha256_mock_hash_string');

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: 'sha256_mock_hash_string' },
        include: { user: false },
      });
      expect(result).toEqual(mockToken);
    });

    it('should eager load user relation when includeUser option is true', async () => {
      const tokenWithUser = {
        ...mockToken,
        user: { id: 'usr_uuid_123', email: 'test@example.com' },
      };
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(tokenWithUser);

      const result = await refreshTokenRepository.findTokenByHash('sha256_mock_hash_string', {
        includeUser: true,
      });

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: 'sha256_mock_hash_string' },
        include: { user: true },
      });
      expect(result).toEqual(tokenWithUser);
    });

    it('should return null when tokenHash is falsy', async () => {
      const result = await refreshTokenRepository.findTokenByHash('');
      expect(result).toBeNull();
    });
  });

  describe('revokeToken', () => {
    it('should update revoked field to true', async () => {
      const revokedToken = { ...mockToken, revoked: true };
      jest.spyOn(prisma.refreshToken, 'update').mockResolvedValue(revokedToken);

      const result = await refreshTokenRepository.revokeToken('sha256_mock_hash_string');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { tokenHash: 'sha256_mock_hash_string' },
        data: { revoked: true },
      });
      expect(result.revoked).toBe(true);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all active tokens for a given user', async () => {
      jest.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 3 });

      const result = await refreshTokenRepository.revokeAllUserTokens('usr_uuid_123');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_uuid_123', revoked: false },
        data: { revoked: true },
      });
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      jest.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({ count: 5 });

      const result = await refreshTokenRepository.deleteExpiredTokens();

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
      expect(result).toEqual({ count: 5 });
    });
  });
});
