import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@ecommerce/common-errors';
import {
  generateRandomToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from '../../src/utils/token.js';
import env from '../../src/config/env.js';

describe('Token Utility (Unit Tests)', () => {
  const mockPayload = {
    sub: 'usr_uuid_12345',
    email: 'user@example.com',
    role: 'CUSTOMER',
  };

  describe('generateRandomToken', () => {
    it('should generate a 64-character hexadecimal random token by default (32 bytes)', () => {
      const token = generateRandomToken();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens on consecutive calls', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate custom byte lengths when specified', () => {
      const token = generateRandomToken(16);
      expect(token).toHaveLength(32);
    });
  });

  describe('hashToken', () => {
    it('should compute deterministic SHA-256 hash string', () => {
      const raw = 'my_raw_random_token_12345';
      const hash1 = hashToken(raw);
      const hash2 = hashToken(raw);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should throw an error if rawToken is invalid', () => {
      expect(() => hashToken('')).toThrow('rawToken must be a non-empty string');
      expect(() => hashToken(null)).toThrow('rawToken must be a non-empty string');
    });
  });

  describe('signAccessToken & verifyAccessToken', () => {
    it('should sign and successfully verify a JWT access token', () => {
      const token = signAccessToken(mockPayload, { expiresIn: '15m' });
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should throw UnauthorizedError when verifying an invalid token string', () => {
      expect(() => verifyAccessToken('invalid.jwt.token')).toThrow(UnauthorizedError);
      expect(() => verifyAccessToken('invalid.jwt.token')).toThrow('Invalid access token');
    });

    it('should throw UnauthorizedError when verifying a token signed with a different secret', () => {
      const fakeToken = jwt.sign(mockPayload, 'wrong_secret_key_1234567890');
      expect(() => verifyAccessToken(fakeToken)).toThrow(UnauthorizedError);
      expect(() => verifyAccessToken(fakeToken)).toThrow('Invalid access token');
    });

    it('should throw UnauthorizedError when verifying an expired token', () => {
      const expiredToken = jwt.sign(mockPayload, env.JWT_SECRET, { expiresIn: '-1s' });
      expect(() => verifyAccessToken(expiredToken)).toThrow(UnauthorizedError);
      expect(() => verifyAccessToken(expiredToken)).toThrow('Access token has expired');
    });

    it('should throw UnauthorizedError when token is missing', () => {
      expect(() => verifyAccessToken('')).toThrow(UnauthorizedError);
      expect(() => verifyAccessToken(null)).toThrow(UnauthorizedError);
    });
  });
});
