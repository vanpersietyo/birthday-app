import moment from 'moment-timezone';
import { prisma } from '../config/database';
import { MessageStatus, MessageType, User } from '@prisma/client';
import { EmailService } from './EmailService';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class BirthdayService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  private isBirthdayToday(birthday: string, timezone: string): boolean {
    const now = moment.tz(timezone);
    const birthDate = moment(birthday, 'YYYY-MM-DD');

    return (
      now.month() === birthDate.month() &&
      now.date() === birthDate.date()
    );
  }

  private getScheduledTime(timezone: string, targetDate: string): Date {
    const hour = parseInt(process.env.BIRTHDAY_MESSAGE_HOUR || '9');
    const minute = parseInt(process.env.BIRTHDAY_MESSAGE_MINUTE || '0');

    return moment.tz(targetDate, timezone)
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0)
      .toDate();
  }

  async createBirthdayMessages(): Promise<void> {
    try {
      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
      });

      logger.info(`Checking birthdays for ${activeUsers.length} active users`);

      for (const user of activeUsers) {
        if (this.isBirthdayToday(user.birthday, user.timezone)) {
          await this.ensureBirthdayMessage(user);
        }
      }

      logger.info('Birthday message creation completed');
    } catch (error) {
      logger.error('Error creating birthday messages:', error);
      throw error;
    }
  }

  private async ensureBirthdayMessage(user: User): Promise<void> {
    const today = moment.tz(user.timezone).format('YYYY-MM-DD');
    const scheduledAt = this.getScheduledTime(user.timezone, today);

    try {
      const existingMessage = await prisma.messageLog.findUnique({
        where: {
          userId_messageType_scheduledDate: {
            userId: user.id,
            messageType: MessageType.BIRTHDAY,
            scheduledDate: today,
          },
        },
      });

      if (!existingMessage) {
        const fullName = `${user.firstName} ${user.lastName}`;
        const message = `Hey, ${fullName} it's your birthday`;

        await prisma.messageLog.create({
          data: {
            userId: user.id,
            messageType: MessageType.BIRTHDAY,
            message,
            scheduledDate: today,
            scheduledAt,
            status: MessageStatus.PENDING,
          },
        });

        logger.info(`Created birthday message for ${user.email} scheduled at ${scheduledAt}`);
      }
    } catch (error) {
      logger.error(`Error ensuring birthday message for user ${user.id}:`, error);
    }
  }

  async processPendingMessages(): Promise<void> {
    try {
      const now = new Date();

      const pendingMessages = await prisma.messageLog.findMany({
        where: {
          status: {
            in: [MessageStatus.PENDING, MessageStatus.RETRY],
          },
          scheduledAt: {
            lte: now,
          },
          OR: [
            { lockId: null },
            { lockedUntil: { lte: now } },
          ],
        },
        include: {
          user: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });

      logger.info(`Processing ${pendingMessages.length} pending messages`);

      for (const messageLog of pendingMessages) {
        await this.processMessage(messageLog.id);
      }

      logger.info('Pending message processing completed');
    } catch (error) {
      logger.error('Error processing pending messages:', error);
      throw error;
    }
  }

  private async processMessage(messageId: string): Promise<void> {
    const lockId = uuidv4();
    const lockDuration = 5 * 60 * 1000;
    const lockedUntil = new Date(Date.now() + lockDuration);

    try {
      const updated = await prisma.messageLog.updateMany({
        where: {
          id: messageId,
          OR: [
            { lockId: null },
            { lockedUntil: { lte: new Date() } },
          ],
        },
        data: {
          lockId,
          lockedUntil,
        },
      });

      if (updated.count === 0) {
        logger.debug(`Message ${messageId} is already locked`);
        return;
      }

      const messageLog = await prisma.messageLog.findUnique({
        where: { id: messageId },
        include: { user: true },
      });

      if (!messageLog || !messageLog.user) {
        logger.warn(`Message ${messageId} not found or user deleted`);
        return;
      }

      logger.info(`Processing message ${messageId} for ${messageLog.user.email}`);

      const result = await this.emailService.sendBirthdayMessage(
        messageLog.user.email,
        `${messageLog.user.firstName} ${messageLog.user.lastName}`
      );

      if (result.success) {
        await prisma.messageLog.update({
          where: { id: messageId },
          data: {
            status: MessageStatus.SENT,
            sentAt: new Date(),
            lockId: null,
            lockedUntil: null,
            errorMessage: null,
          },
        });

        logger.info(`Message ${messageId} sent successfully`);
      } else {
        const maxRetries = parseInt(process.env.EMAIL_SERVICE_MAX_RETRIES || '3');
        const newRetryCount = messageLog.retryCount + 1;

        await prisma.messageLog.update({
          where: { id: messageId },
          data: {
            status: newRetryCount >= maxRetries ? MessageStatus.FAILED : MessageStatus.RETRY,
            retryCount: newRetryCount,
            errorMessage: result.error || 'Unknown error',
            lockId: null,
            lockedUntil: null,
          },
        });

        logger.warn(
          `Message ${messageId} failed (attempt ${newRetryCount}/${maxRetries}): ${result.error}`
        );
      }
    } catch (error) {
      logger.error(`Error processing message ${messageId}:`, error);

      await prisma.messageLog.updateMany({
        where: { id: messageId, lockId },
        data: {
          lockId: null,
          lockedUntil: null,
        },
      });
    }
  }

  async recoverUnsentMessages(): Promise<void> {
    try {
      logger.info('Starting recovery of unsent messages...');

      const unsentMessages = await prisma.messageLog.findMany({
        where: {
          status: {
            in: [MessageStatus.PENDING, MessageStatus.RETRY],
          },
          scheduledAt: {
            lt: new Date(),
          },
        },
      });

      logger.info(`Found ${unsentMessages.length} unsent messages to recover`);

      for (const message of unsentMessages) {
        await this.processMessage(message.id);
      }

      logger.info('Message recovery completed');
    } catch (error) {
      logger.error('Error recovering unsent messages:', error);
      throw error;
    }
  }
}
