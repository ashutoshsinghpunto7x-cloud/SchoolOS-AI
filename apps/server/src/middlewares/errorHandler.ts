import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import mongoose from 'mongoose';
import { logger } from '../lib/logger';
import { sendError } from '../lib/response';
import { recordSecurityEvent } from '../lib/security-events';
import { recordErrorEvent } from '../lib/error-events';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route not found: ${req.method} ${req.path}`, 404, 'ROUTE_NOT_FOUND');
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    recordErrorEvent({
      statusCode: 400, code: 'VALIDATION_ERROR', message,
      path: req.originalUrl, method: req.method,
      userId: req.user?.userId, role: req.user?.role, schoolId: req.user?.schoolId,
    });
    sendError(res, message, 400, 'VALIDATION_ERROR');
    return;
  }

  if (err instanceof mongoose.mongo.MongoServerError && (err as { code?: number }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue ?? {};
    const field = Object.keys(keyValue)[0] ?? 'field';
    const message = `${field} already exists`;
    recordErrorEvent({
      statusCode: 409, code: 'DUPLICATE_KEY', message,
      path: req.originalUrl, method: req.method,
      userId: req.user?.userId, role: req.user?.role, schoolId: req.user?.schoolId,
      stack: err.stack,
    });
    sendError(res, message, 409, 'DUPLICATE_KEY');
    return;
  }

  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'That file is too large — try a smaller photo or recording.'
      : err.code === 'LIMIT_UNEXPECTED_FILE'
      ? 'Only one file can be uploaded at a time.'
      : 'Could not upload that file.';
    recordErrorEvent({
      statusCode: 400, code: 'VALIDATION_ERROR', message,
      path: req.originalUrl, method: req.method,
      userId: req.user?.userId, role: req.user?.role, schoolId: req.user?.schoolId,
    });
    sendError(res, message, 400, 'VALIDATION_ERROR');
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { path: req.path, stack: err.stack });
    } else {
      logger.warn(`[${err.code}] ${err.message}`, { path: req.path });
    }

    if (err.statusCode === 401 || err.statusCode === 403) {
      // 401/403 get their own Security Center view instead — recording them
      // here too would just duplicate the same events across two screens.
      const isLoginAttempt = req.originalUrl.includes('/auth/login');
      recordSecurityEvent({
        type: err.statusCode === 403 ? 'permission_denied' : isLoginAttempt ? 'failed_login' : 'invalid_token',
        severity: err.statusCode === 403 ? 'medium' : isLoginAttempt ? 'medium' : 'high',
        message: err.message,
        ip: req.ip,
        path: req.originalUrl,
        userId: req.user?.userId,
        role: req.user?.role,
        schoolId: req.user?.schoolId,
      });
    } else {
      recordErrorEvent({
        statusCode: err.statusCode, code: err.code, message: err.message,
        path: req.originalUrl, method: req.method,
        userId: req.user?.userId, role: req.user?.role, schoolId: req.user?.schoolId,
        stack: err.statusCode >= 500 ? err.stack : undefined,
      });
    }

    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  recordErrorEvent({
    statusCode: 500, code: 'INTERNAL_ERROR', message: err.message,
    path: req.originalUrl, method: req.method,
    userId: req.user?.userId, role: req.user?.role, schoolId: req.user?.schoolId,
    stack: err.stack,
  });
  sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
};
