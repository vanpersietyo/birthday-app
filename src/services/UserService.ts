import { prisma } from '../config/database';
import { User } from '@prisma/client';
import { logger } from '../config/logger';

export interface CreateUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  birthday: string;
  timezone: string;
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  birthday?: string;
  timezone?: string;
  isActive?: boolean;
}

export class UserService {
  async createUser(userData: CreateUserDTO): Promise<User> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const user = await prisma.user.create({
        data: {
          ...userData,
          isActive: true,
        },
      });

      logger.info(`User created: ${user.id} - ${user.email}`);

      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updateData: UpdateUserDTO): Promise<User> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: updateData.email },
        });

        if (existingUser) {
          throw new Error('User with this email already exists');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      logger.info(`User updated: ${updatedUser.id} - ${updatedUser.email}`);

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await prisma.user.findMany();
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }

  async getActiveUsers(): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: { isActive: true },
      });
    } catch (error) {
      logger.error('Error getting active users:', error);
      throw error;
    }
  }
}
