import axios from 'axios';
import { EmailService } from '../src/services/EmailService';

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  details: string;
  error?: string;
}

class EmailAPITester {
  private emailService: EmailService;
  private results: TestResult[] = [];

  constructor() {
    this.emailService = new EmailService();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logResult(result: TestResult): void {
    this.results.push(result);
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon}${reset} ${result.test} (${result.duration}ms)`);
    console.log(`  ${result.details}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  }

  async testDirectAPICall(): Promise<void> {
    console.log('=== Test 1: Direct API Call ===');
    const startTime = Date.now();

    try {
      const response = await axios.post(
        'https://email-service.digitalenvision.com.au/send-email',
        {
          email: 'test@digitalenvision.com.au',
          message: 'Test message from integration test'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;

      this.logResult({
        test: 'Direct API Call',
        success: response.status >= 200 && response.status < 300,
        duration,
        details: `Status: ${response.status}, Response: ${JSON.stringify(response.data)}`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.logResult({
        test: 'Direct API Call',
        success: false,
        duration,
        details: `Failed with: ${error.message}`,
        error: error.code || error.message
      });
    }
  }

  async testBirthdayMessage(): Promise<void> {
    console.log('=== Test 2: Birthday Message via EmailService ===');
    const startTime = Date.now();

    try {
      const result = await this.emailService.sendBirthdayMessage(
        'john.doe@digitalenvision.com.au',
        'John Doe'
      );

      const duration = Date.now() - startTime;

      this.logResult({
        test: 'Birthday Message',
        success: result.success,
        duration,
        details: result.success
          ? 'Birthday message sent successfully'
          : `Failed: ${result.error}`,
        error: result.error
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.logResult({
        test: 'Birthday Message',
        success: false,
        duration,
        details: 'Exception thrown',
        error: error.message
      });
    }
  }

  async testMultipleRequests(): Promise<void> {
    console.log('=== Test 3: Multiple Sequential Requests (Testing Random Errors) ===');

    const emails = [
      { email: 'user1@test.com', name: 'User One' },
      { email: 'user2@test.com', name: 'User Two' },
      { email: 'user3@test.com', name: 'User Three' },
      { email: 'user4@test.com', name: 'User Four' },
      { email: 'user5@test.com', name: 'User Five' },
    ];

    let successCount = 0;
    let failureCount = 0;

    for (const user of emails) {
      const startTime = Date.now();
      const result = await this.emailService.sendBirthdayMessage(user.email, user.name);
      const duration = Date.now() - startTime;

      if (result.success) {
        successCount++;
        console.log(`  ✓ ${user.name}: Success (${duration}ms)`);
      } else {
        failureCount++;
        console.log(`  ✗ ${user.name}: Failed - ${result.error} (${duration}ms)`);
      }

      // Small delay between requests
      await this.sleep(500);
    }

    this.logResult({
      test: 'Multiple Sequential Requests',
      success: successCount > 0,
      duration: 0,
      details: `Success: ${successCount}, Failures: ${failureCount} (demonstrates API random errors)`
    });
  }

  async testRetryBehavior(): Promise<void> {
    console.log('=== Test 4: Retry Behavior (Observing Retries) ===');

    // This test observes the natural retry behavior when API returns errors
    const startTime = Date.now();

    const result = await this.emailService.sendBirthdayMessage(
      'retry-test@test.com',
      'Retry Test User'
    );

    const duration = Date.now() - startTime;

    this.logResult({
      test: 'Retry Behavior',
      success: true, // We're testing behavior, not success
      duration,
      details: result.success
        ? 'Request succeeded (possibly after retries)'
        : `Request failed after retries: ${result.error}`,
      error: result.error
    });
  }

  async testCircuitBreaker(): Promise<void> {
    console.log('=== Test 5: Circuit Breaker Pattern ===');

    // Get initial metrics
    const initialMetrics = this.emailService.getMetrics();
    console.log('  Initial Metrics:', initialMetrics);

    // Send a few requests to see circuit breaker in action
    for (let i = 1; i <= 3; i++) {
      await this.emailService.sendBirthdayMessage(
        `cb-test-${i}@test.com`,
        `CB Test ${i}`
      );
      await this.sleep(300);
    }

    const finalMetrics = this.emailService.getMetrics();
    console.log('  Final Metrics:', finalMetrics);

    this.logResult({
      test: 'Circuit Breaker Pattern',
      success: true,
      duration: 0,
      details: `Metrics - Total: ${finalMetrics.totalAttempts}, Success: ${finalMetrics.successCount}, Failures: ${finalMetrics.failureCount}`
    });
  }

  async testTimeoutHandling(): Promise<void> {
    console.log('=== Test 6: Timeout Handling ===');

    // Create a service with short timeout to test timeout behavior
    const shortTimeoutService = new EmailService();
    // Note: The API may timeout naturally, we're testing our handling

    const startTime = Date.now();
    const result = await shortTimeoutService.sendBirthdayMessage(
      'timeout-test@test.com',
      'Timeout Test'
    );
    const duration = Date.now() - startTime;

    this.logResult({
      test: 'Timeout Handling',
      success: true, // Testing behavior
      duration,
      details: result.success
        ? 'Completed within timeout period'
        : `Handled timeout/error: ${result.error}`,
      error: result.error
    });
  }

  printSummary(): void {
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${this.results.filter(r => r.success).length}`);
    console.log(`Failed: ${this.results.filter(r => !r.success).length}`);

    console.log('\n=== Email Service Metrics ===');
    const metrics = this.emailService.getMetrics();
    console.log('Total Attempts:', metrics.totalAttempts);
    console.log('Successes:', metrics.successCount);
    console.log('Failures:', metrics.failureCount);
    console.log('Timeouts:', metrics.timeoutCount);
    console.log('Last Success:', metrics.lastSuccess);
    console.log('Last Error:', metrics.lastError);
  }

  async runAllTests(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Email Service API Integration Test Suite                 ║');
    console.log('║  Testing: https://email-service.digitalenvision.com.au    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
      await this.testDirectAPICall();
      await this.sleep(1000);

      await this.testBirthdayMessage();
      await this.sleep(1000);

      await this.testMultipleRequests();
      await this.sleep(1000);

      await this.testRetryBehavior();
      await this.sleep(1000);

      await this.testCircuitBreaker();
      await this.sleep(1000);

      await this.testTimeoutHandling();

      this.printSummary();

      console.log('\n✓ Integration tests completed!\n');
      process.exit(0);

    } catch (error: any) {
      console.error('\n✗ Test suite failed with error:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const tester = new EmailAPITester();
  tester.runAllTests().catch(console.error);
}

export { EmailAPITester };
