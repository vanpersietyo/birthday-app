import axios from 'axios';
import { EmailService } from '../EmailService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
    jest.clearAllMocks();
    emailService.resetMetrics(); // Reset metrics between tests
  });

  describe('sendBirthdayMessage', () => {
    it('should send birthday message successfully with correct headers', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
        statusText: 'OK',
      });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/send-email'),
        {
          email: 'test@example.com',
          message: "Hey, John Doe it's your birthday",
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
        })
      );

      // Verify metrics updated
      const metrics = emailService.getMetrics();
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(0);
    });

    it('should handle 201 Created response as success', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 201,
        data: { success: true },
        statusText: 'Created',
      });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'Jane Doe'
      );

      expect(result.success).toBe(true);
    });

    it('should retry on server error (500)', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
          statusText: 'OK',
        });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
          statusText: 'OK',
        });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout error (408)', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          status: 408,
          statusText: 'Request Timeout',
          data: {},
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
          statusText: 'OK',
        });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(true);
    });

    it('should retry on rate limiting (429)', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
          statusText: 'OK',
        });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(true);
    });

    it('should return error after max retries on persistent failures', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
      });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      // Should attempt 1 initial + 3 retries = 4 total
      expect(mockedAxios.post).toHaveBeenCalledTimes(4);

      // Verify metrics updated
      const metrics = emailService.getMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
    });

    it('should not retry on client error (400 Bad Request)', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
        data: { error: 'Invalid email' },
      });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on 404 Not Found', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 404,
        statusText: 'Not Found',
        data: {},
      });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should handle network timeout errors', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({
          code: 'ETIMEDOUT',
          message: 'Timeout',
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
          statusText: 'OK',
        });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle connection refused errors', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const result = await emailService.sendBirthdayMessage(
        'test@example.com',
        'John Doe'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection Refused');
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      // Set environment for faster testing
      process.env.CIRCUIT_BREAKER_THRESHOLD = '3';
      process.env.CIRCUIT_BREAKER_RESET_MS = '1000';
      emailService = new EmailService();
    });

    it('should open circuit breaker after threshold failures', async () => {
      // Mock persistent failures
      mockedAxios.post.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
      });

      // First 3 failures should trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await emailService.sendBirthdayMessage('test@example.com', 'User');
      }

      // Circuit should now be open - next call should fail immediately
      const result = await emailService.sendBirthdayMessage('test@example.com', 'User');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker is open');
    });

    it('should reset circuit breaker after timeout', async () => {
      jest.useFakeTimers();

      // Mock persistent failures
      mockedAxios.post.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
      });

      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await emailService.sendBirthdayMessage('test@example.com', 'User');
      }

      // Fast-forward time past reset timeout
      jest.advanceTimersByTime(1100);

      // Mock success for next attempt
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
        statusText: 'OK',
      });

      // Circuit should be closed now
      const result = await emailService.sendBirthdayMessage('test@example.com', 'User');
      expect(result.success).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Metrics', () => {
    it('should track success metrics', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
        statusText: 'OK',
      });

      await emailService.sendBirthdayMessage('user1@example.com', 'User 1');
      await emailService.sendBirthdayMessage('user2@example.com', 'User 2');

      const metrics = emailService.getMetrics();
      expect(metrics.totalAttempts).toBe(2);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.lastSuccess).toBeDefined();
    });

    it('should track failure metrics', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
        data: {},
      });

      await emailService.sendBirthdayMessage('test@example.com', 'User');

      const metrics = emailService.getMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
      expect(metrics.lastError).toBeDefined();
    });

    it('should reset metrics', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
        statusText: 'OK',
      });

      await emailService.sendBirthdayMessage('test@example.com', 'User');
      emailService.resetMetrics();

      const metrics = emailService.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(0);
    });
  });
});
