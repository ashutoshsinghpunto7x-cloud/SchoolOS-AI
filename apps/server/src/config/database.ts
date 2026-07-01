import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../lib/logger';

// Safe to call from multiple entry points (server.ts for local/Docker, app.ts for
// serverless platforms like Vercel that import the app directly without running
// server.ts). Skips reconnecting if a connection is already up or in progress.
export const connectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected', {
      host: mongoose.connection.host,
      db: mongoose.connection.name,
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — retrying automatically');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
};
