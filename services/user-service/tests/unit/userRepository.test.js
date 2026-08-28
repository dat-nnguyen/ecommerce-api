import { jest } from '@jest/globals';
import prisma from '../../src/config/db.js';
import * as userRepository from '../../src/repositories/userRepository.js';

describe('User Repository (Unit Tests)', () => {
  const mockUser = {
    id: 'usr_uuid_123',
    email: 'test@example.com',
    passwordHash: '$2b$10$mockHashedPasswordString',
    name: 'John Doe',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with lowercased email and return the created record', async () => {
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser);

      const result = await userRepository.createUser({
        email: 'TEST@Example.com ',
        passwordHash: '$2b$10$mockHashedPasswordString',
        name: 'John Doe',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          passwordHash: '$2b$10$mockHashedPasswordString',
          name: 'John Doe',
          role: 'CUSTOMER',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw an error if email or passwordHash is missing', async () => {
      await expect(userRepository.createUser({ email: 'test@example.com' })).rejects.toThrow(
        'Email and passwordHash are required fields'
      );
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by lowercased email', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await userRepository.findUserByEmail('TEST@Example.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if email is not provided', async () => {
      const result = await userRepository.findUserByEmail('');
      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should query user without passwordHash by default', async () => {
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.passwordHash;

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithoutPassword);

      const result = await userRepository.findUserById('usr_uuid_123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'usr_uuid_123' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(userWithoutPassword);
      expect(result.passwordHash).toBeUndefined();
    });

    it('should include passwordHash when option is set to true', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await userRepository.findUserById('usr_uuid_123', {
        includePassword: true,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'usr_uuid_123' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: true,
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should update user record and lowercase email if provided', async () => {
      const updatedUser = { ...mockUser, name: 'Jane Doe', email: 'jane@example.com' };
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser);

      const result = await userRepository.updateUser('usr_uuid_123', {
        name: 'Jane Doe',
        email: 'JANE@example.com',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_uuid_123' },
        data: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete user by id', async () => {
      jest.spyOn(prisma.user, 'delete').mockResolvedValue(mockUser);

      const result = await userRepository.deleteUser('usr_uuid_123');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'usr_uuid_123' },
      });
      expect(result).toEqual(mockUser);
    });
  });
});
