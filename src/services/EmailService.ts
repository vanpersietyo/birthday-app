import axios, { AxiosError } from 'axios';
import { logger } from '../config/logger';

interface EmailPayload {
  email: string;
  message: string;
}

interface EmailResponse {
  success?: boolean;
  message?: string;
  status?: string;
}

interface EmailMetrics {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  lastError: string | null;
  lastSuccess: Date | null;
}

export class EmailService {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private circuitBreakerThreshold: number;
  private circuitBreakerResetTime: number;
  private metrics: EmailMetrics;
  private circuitBreakerOpenUntil: Date | null;

  constructor() {
    this.baseUrl = process.env.EMAIL_SERVICE_URL || 'https://email-service.digitalenvision.com.au';
    this.timeout = parseInt(process.env.EMAIL_SERVICE_TIMEOUT || '10000'); // Increased to 10s for flaky API
    this.maxRetries = parseInt(process.env.EMAIL_SERVICE_MAX_RETRIES || '3');
    this.retryDelay = parseInt(process.env.EMAIL_SERVICE_RETRY_DELAY || '2000');
    this.circuitBreakerThreshold = parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5');
    this.circuitBreakerResetTime = parseInt(process.env.CIRCUIT_BREAKER_RESET_MS || '60000'); // 1 minute

    this.metrics = {
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      lastError: null,
      lastSuccess: null,
    };

    this.circuitBreakerOpenUntil = null;
  }

  getMetrics(): EmailMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      lastError: null,
      lastSuccess: null,
    };
  }

  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerOpenUntil && new Date() < this.circuitBreakerOpenUntil) {
      logger.warn('Circuit breaker is OPEN - blocking email requests');
      return true;
    }

    if (this.circuitBreakerOpenUntil && new Date() >= this.circuitBreakerOpenUntil) {
      logger.info('Circuit breaker reset timeout reached - attempting half-open state');
      this.circuitBreakerOpenUntil = null;
    }

    return false;
  }

  private openCircuitBreaker(): void {
    const resetTime = new Date(Date.now() + this.circuitBreakerResetTime);
    this.circuitBreakerOpenUntil = resetTime;
    logger.error(
      `Circuit breaker OPENED due to ${this.metrics.failureCount} consecutive failures. ` +
      `Will reset at ${resetTime.toISOString()}`
    );
  }

  private updateMetrics(success: boolean, error?: string): void {
    this.metrics.totalAttempts++;

    if (success) {
      this.metrics.successCount++;
      this.metrics.lastSuccess = new Date();
      // Reset failure count on success
      this.metrics.failureCount = 0;
    } else {
      this.metrics.failureCount++;
      if (error) {
        this.metrics.lastError = error;
        if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
          this.metrics.timeoutCount++;
        }
      }

      // Open circuit breaker if failure threshold reached
      if (this.metrics.failureCount >= this.circuitBreakerThreshold) {
        this.openCircuitBreaker();
      }
    }

    // Log metrics every 10 attempts
    if (this.metrics.totalAttempts % 10 === 0) {
      logger.info('Email Service Metrics:', this.metrics);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: AxiosError): boolean {
    // Network errors (no response) are always retryable
    if (!error.response) {
      // Check for timeout errors
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        logger.warn('Request timeout - retryable');
        return true;
      }
      // Network errors
      logger.warn(`Network error: ${error.code || error.message} - retryable`);
      return true;
    }

    const status = error.response.status;

    // Retry on server errors (5xx), request timeout (408), and rate limiting (429)
    const shouldRetry = status >= 500 || status === 408 || status === 429;

    if (shouldRetry) {
      logger.warn(`HTTP ${status} error - retryable`);
    } else {
      logger.warn(`HTTP ${status} error - NOT retryable (client error)`);
    }

    return shouldRetry;
  }

  async sendEmail(
    email: string,
    message: string,
    retryCount: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      const error = 'Circuit breaker is open - email service unavailable';
      this.updateMetrics(false, error);
      return {
        success: false,
        error,
      };
    }

    const attemptNumber = retryCount + 1;
    const maxAttempts = this.maxRetries + 1;

    try {
      logger.info(
        `[Email Service] Sending email to ${email} (attempt ${attemptNumber}/${maxAttempts})`
      );

      // Log request details for debugging
      const requestPayload: EmailPayload = { email, message };
      logger.debug('[Email Service] Request details:', {
        url: `${this.baseUrl}/send-email`,
        payload: requestPayload,
        timeout: this.timeout,
        attempt: attemptNumber,
      });

      const startTime = Date.now();

      const response = await axios.post<EmailResponse>(
        `${this.baseUrl}/send-email`,
        requestPayload,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json', // Added as per API docs
          },
          // Don't throw on any status code - we'll handle it manually
          validateStatus: () => true,
        }
      );

      const duration = Date.now() - startTime;

      // Log response details
      logger.debug('[Email Service] Response received:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        duration: `${duration}ms`,
      });

      // Success responses (2xx)
      if (response.status >= 200 && response.status < 300) {
        logger.info(
          `[Email Service] ✓ Email sent successfully to ${email} in ${duration}ms (status: ${response.status})`
        );
        this.updateMetrics(true);
        return { success: true };
      }

      // Handle error responses
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      logger.warn(`[Email Service] ✗ Failed to send email to ${email}: ${errorMsg}`);

      // Determine if we should retry
      const mockError = {
        response,
        message: errorMsg,
        code: response.status.toString(),
      } as AxiosError;

      if (retryCount < this.maxRetries && this.isRetryableError(mockError)) {
        const delayMs = this.retryDelay * Math.pow(2, retryCount);
        logger.info(`[Email Service] Retrying in ${delayMs}ms... (attempt ${attemptNumber}/${maxAttempts})`);

        await this.delay(delayMs);
        return this.sendEmail(email, message, retryCount + 1);
      }

      // Max retries reached or non-retryable error
      this.updateMetrics(false, errorMsg);
      return {
        success: false,
        error: errorMsg,
      };

    } catch (error) {
      const axiosError = error as AxiosError;
      const duration = Date.now();

      // Categorize the error
      let errorType = 'Unknown Error';
      let errorMessage = axiosError.message;

      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        errorType = 'Timeout';
        errorMessage = `Request timeout after ${this.timeout}ms`;
      } else if (axiosError.code === 'ECONNREFUSED') {
        errorType = 'Connection Refused';
        errorMessage = 'Unable to connect to email service';
      } else if (axiosError.code === 'ENOTFOUND') {
        errorType = 'DNS Error';
        errorMessage = 'Email service host not found';
      } else if (!axiosError.response) {
        errorType = 'Network Error';
        errorMessage = axiosError.message;
      }

      logger.error(`[Email Service] ${errorType} sending email to ${email}:`, {
        error: errorMessage,
        code: axiosError.code,
        status: axiosError.response?.status,
        attempt: attemptNumber,
        maxAttempts,
      });

      // Retry logic for network/timeout errors
      if (retryCount < this.maxRetries && this.isRetryableError(axiosError)) {
        const delayMs = this.retryDelay * Math.pow(2, retryCount);
        logger.info(
          `[Email Service] Retrying after ${errorType} in ${delayMs}ms... ` +
          `(attempt ${attemptNumber}/${maxAttempts})`
        );

        await this.delay(delayMs);
        return this.sendEmail(email, message, retryCount + 1);
      }

      // Max retries reached or non-retryable error
      const finalError = axiosError.response?.data
        ? `${errorType}: ${JSON.stringify(axiosError.response.data)}`
        : `${errorType}: ${errorMessage}`;

      logger.error(
        `[Email Service] ✗ Failed to send email to ${email} after ${attemptNumber} attempts. Error: ${finalError}`
      );

      this.updateMetrics(false, finalError);

      return {
        success: false,
        error: finalError,
      };
    }
  }

  async sendBirthdayMessage(email: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    const message = `Hey, ${fullName} it's your birthday`;
    return this.sendEmail(email, message);
  }
}
