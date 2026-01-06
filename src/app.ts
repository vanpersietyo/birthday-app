import express, { Application, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './config/database';
import { logger } from './config/logger';
import userRoutes from './routes/userRoutes';
import { BirthdayScheduler } from './jobs/birthdayScheduler';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/api', userRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

let scheduler: BirthdayScheduler;

const startServer = async () => {
  try {
    await initializeDatabase();

    scheduler = new BirthdayScheduler();
    scheduler.start();

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  if (scheduler) {
    scheduler.stop();
  }

  await closeDatabase();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();

export default app;
