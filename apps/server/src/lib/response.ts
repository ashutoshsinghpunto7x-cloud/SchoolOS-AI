import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Created successfully'
): Response<SuccessResponse<T>> => {
  return sendSuccess(res, data, message, 201);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number }
): Response<PaginatedResponse<T>> => {
  const totalPages = Math.ceil(meta.total / meta.limit);
  return res.status(200).json({
    success: true,
    data,
    meta: {
      ...meta,
      totalPages,
      hasNextPage: meta.page < totalPages,
      hasPrevPage: meta.page > 1,
    },
  });
};

export const sendError = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  code = 'INTERNAL_ERROR'
): Response<ErrorResponse> => {
  return res.status(statusCode).json({
    success: false,
    error: { message, code, statusCode },
  });
};
