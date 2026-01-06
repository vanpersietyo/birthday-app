import { UserService } from '../UserService';
import { prisma } from '../../config/database';

jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const validUserData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      birthday: '1990-01-15',
      timezone: 'America/New_York',
    };

    it('should create a user successfully', async () => {
      const mockUser = { id: '123', ...validUserData, isActive: true };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.createUser(validUserData);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validUserData.email },
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      const existingUser = { id: '123', ...validUserData };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await expect(userService.createUser(validUserData)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('updateUser', () => {
    const userId = '123';
    const updateData = { firstName: 'Jane' };

    it('should update a user successfully', async () => {
      const mockUser = {
        id: userId,
        firstName: 'John',
        email: 'john@example.com',
      };
      const updatedUser = { ...mockUser, ...updateData };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const userId = '123';

      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: userId });

      await userService.deleteUser(userId);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users', async () => {
      const mockUsers = [
        { id: '1', firstName: 'John', isActive: true },
        { id: '2', firstName: 'Jane', isActive: true },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userService.getActiveUsers();

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });
  });
});
