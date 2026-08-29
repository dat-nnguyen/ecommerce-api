import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password Utility (Unit Tests)', () => {
  const plainPassword = 'SuperSecretPassword123!';

  describe('hashPassword', () => {
    it('should hash plaintext password into a valid bcrypt hash string', async () => {
      const hash = await hashPassword(plainPassword);

      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
      expect(hash).not.toBe(plainPassword);
    });

    it('should generate different hashes for the same password due to random salting', async () => {
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw an error if password is empty or not a string', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(12345)).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const hash = await hashPassword(plainPassword);
      const isMatch = await comparePassword(plainPassword, hash);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const hash = await hashPassword(plainPassword);
      const isMatch = await comparePassword('WrongPassword999', hash);

      expect(isMatch).toBe(false);
    });

    it('should return false safely if inputs are falsy or invalid types', async () => {
      expect(await comparePassword('', '')).toBe(false);
      expect(await comparePassword(null, 'somehash')).toBe(false);
      expect(await comparePassword('password', null)).toBe(false);
    });
  });
});
