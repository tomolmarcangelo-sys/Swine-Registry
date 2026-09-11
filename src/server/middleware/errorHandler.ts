import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  meta?: any;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  console.error('[API Error Handler]:', err.message || err);

  // Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload format',
      errors: err.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma Known Request Error Handling (by error code)
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          status: 'error',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this unique key already exists.',
          meta: err.meta,
        });
      case 'P2025':
        return res.status(404).json({
          status: 'error',
          code: 'RECORD_NOT_FOUND',
          message: 'The requested database record was not found.',
        });
      case 'P2003':
        return res.status(400).json({
          status: 'error',
          code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
          message: 'Foreign key constraint failed on reference.',
        });
      case 'P2000':
        return res.status(400).json({
          status: 'error',
          code: 'VALUE_TOO_LONG',
          message: 'The provided value is too long for the database column.',
        });
    }
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected database error occurred.';

  return res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message,
  });
}
