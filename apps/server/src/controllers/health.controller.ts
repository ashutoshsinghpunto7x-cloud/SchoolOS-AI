import { Request, Response } from 'express';
import mongoose from 'mongoose';

const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;

  // readyState only reports connect/disconnect, not whether the connection is
  // actually responsive — a saturated pool or a stalled server can leave the
  // driver "connected" while every query queues indefinitely. A bounded ping
  // catches that: if it hasn't answered within the timeout, treat this
  // instance as unhealthy the same as a hard disconnect.
  let dbResponsive = false;
  if (dbConnected && mongoose.connection.db) {
    try {
      await Promise.race([
        mongoose.connection.db.admin().ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 2000)),
      ]);
      dbResponsive = true;
    } catch {
      dbResponsive = false;
    }
  }

  const healthy = dbConnected && dbResponsive;
  // Return 503 when DB is unreachable/unresponsive so load-balancers and
  // Docker healthcheck can remove the instance from rotation.
  const status = healthy ? 200 : 503;

  res.status(status).json({
    success: healthy,
    message: healthy ? 'Server healthy' : dbConnected ? 'Database connected but unresponsive' : 'Database unavailable',
    meta: {
      environment: process.env.NODE_ENV,
      database: DB_STATES[dbState] ?? 'unknown',
      databaseResponsive: dbResponsive,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};
