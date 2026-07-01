import { Request, Response } from 'express';
import mongoose from 'mongoose';

const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const healthCheck = (_req: Request, res: Response): void => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;

  // Return 503 when DB is unreachable so load-balancers and Docker healthcheck
  // can remove the instance from rotation until connectivity is restored.
  const status = dbConnected ? 200 : 503;

  res.status(status).json({
    success: dbConnected,
    message: dbConnected ? 'Server healthy' : 'Database unavailable',
    meta: {
      environment: process.env.NODE_ENV,
      database: DB_STATES[dbState] ?? 'unknown',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};
