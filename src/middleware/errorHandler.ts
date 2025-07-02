import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createApiResponse, createApiError, ApiErrorType } from '../types';

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public type: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    type: string = ApiErrorType.INTERNAL_ERROR,
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.name = 'ApiError';
  }
}

// Global error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    const apiError = createApiError(
      ApiErrorType.VALIDATION_ERROR,
      'Validation failed',
      { validationErrors }
    );

    res.status(400).json(createApiResponse(false, null, apiError.message, 'Validation error'));
    return;
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    const apiError = createApiError(
      error.type as any,
      error.message,
      error.details
    );

    res.status(error.statusCode).json(
      createApiResponse(false, null, apiError.message, error.message)
    );
    return;
  }

  // Handle generic errors
  const apiError = createApiError(
    ApiErrorType.INTERNAL_ERROR,
    process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  );

  res.status(500).json(
    createApiResponse(false, null, apiError.message, 'Internal server error')
  );
};

// 404 handler for unknown routes
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiError = createApiError(
    ApiErrorType.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  );

  res.status(404).json(
    createApiResponse(false, null, apiError.message, 'Route not found')
  );
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 