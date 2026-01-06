import cron from 'node-cron';
import { BirthdayService } from '../services/BirthdayService';
import { logger } from '../config/logger';

export class BirthdayScheduler {
  private birthdayService: BirthdayService;
  private createMessagesTask?: cron.ScheduledTask;
  private processMessagesTask?: cron.ScheduledTask;

  constructor() {
    this.birthdayService = new BirthdayService();
  }

  start(): void {
    const createMessagesCron = process.env.BIRTHDAY_CHECK_CRON || '*/5 * * * *';

    this.createMessagesTask = cron.schedule(createMessagesCron, async () => {
      logger.info('Running scheduled birthday message creation...');
      try {
        await this.birthdayService.createBirthdayMessages();
      } catch (error) {
        logger.error('Error in scheduled birthday message creation:', error);
      }
    });

    this.processMessagesTask = cron.schedule('* * * * *', async () => {
      logger.info('Running scheduled message processing...');
      try {
        await this.birthdayService.processPendingMessages();
      } catch (error) {
        logger.error('Error in scheduled message processing:', error);
      }
    });

    logger.info('Birthday scheduler started');
    logger.info(`- Create messages: ${createMessagesCron}`);
    logger.info('- Process messages: Every minute');

    this.runRecoveryOnStartup();
  }

  private async runRecoveryOnStartup(): Promise<void> {
    try {
      logger.info('Running message recovery on startup...');
      await this.birthdayService.recoverUnsentMessages();
      logger.info('Message recovery completed');
    } catch (error) {
      logger.error('Error in startup message recovery:', error);
    }
  }

  stop(): void {
    if (this.createMessagesTask) {
      this.createMessagesTask.stop();
    }

    if (this.processMessagesTask) {
      this.processMessagesTask.stop();
    }

    logger.info('Birthday scheduler stopped');
  }
}
