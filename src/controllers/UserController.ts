import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { createUserSchema, updateUserSchema } from '../utils/validation';
import { logger } from '../config/logger';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = createUserSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
        return;
      }

      const user = await this.userService.createUser(value);

      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          birthday: user.birthday,
          timezone: user.timezone,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('Error in createUser controller:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const { error, value } = updateUserSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
        return;
      }

      const user = await this.userService.updateUser(id, value);

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          birthday: user.birthday,
          timezone: user.timezone,
          isActive: user.isActive,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error in updateUser controller:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error in deleteUser controller:', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await this.userService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          birthday: user.birthday,
          timezone: user.timezone,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error in getUser controller:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();

      res.status(200).json({
        success: true,
        data: users.map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          birthday: user.birthday,
          timezone: user.timezone,
          isActive: user.isActive,
        })),
      });
    } catch (error) {
      logger.error('Error in getAllUsers controller:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}
