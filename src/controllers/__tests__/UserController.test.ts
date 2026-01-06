import { Request, Response } from 'express';
import { UserController } from '../UserController';
import { UserService } from '../../services/UserService';

jest.mock('../../services/UserService');
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    userController = new UserController();
    mockUserService = (userController as any).userService as jest.Mocked<UserService>;

    mockRequest = {
      body: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const validUserData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        birthday: '1990-01-15',
        timezone: 'America/New_York',
      };

      const mockUser = {
        id: '123',
        ...validUserData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = validUserData;
      mockUserService.createUser.mockResolvedValue(mockUser);

      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: '123',
          email: 'john@example.com',
        }),
      });
    });

    it('should return 400 for invalid data', async () => {
      mockRequest.body = {
        firstName: 'John',
      };

      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
      });
    });

    it('should return 409 for duplicate email', async () => {
      const validUserData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        birthday: '1990-01-15',
        timezone: 'America/New_York',
      };

      mockRequest.body = validUserData;
      mockUserService.createUser.mockRejectedValue(
        new Error('User with this email already exists')
      );

      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User with this email already exists',
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockRequest.params = { id: '123' };
      mockUserService.deleteUser.mockResolvedValue();

      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockRequest.params = { id: '123' };
      mockUserService.deleteUser.mockRejectedValue(new Error('User not found'));

      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
    });
  });
});
