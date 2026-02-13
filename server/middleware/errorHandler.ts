import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, isOperationalError } from '../utils/errorTypes';

/**
 * Global error handler middleware that provides consistent error responses
 * and proper logging for all application errors
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle AppError instances with structured responses
  if (isAppError(err)) {
    logError(err, req);
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle validation errors from Zod or similar libraries
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    const validationError = new AppError(
      'Request validation failed',
      400,
      'VALIDATION_ERROR',
      `${req.method} ${req.path}`
    );
    logError(validationError, req);
    res.status(400).json(validationError.toJSON());
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const authError = new AppError(
      'Authentication failed',
      401,
      'UNAUTHORIZED',
      `${req.method} ${req.path}`
    );
    logError(authError, req);
    res.status(401).json(authError.toJSON());
    return;
  }

  // Handle database connection errors
  if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('Cannot set property message'))) {
    const dbError = new AppError(
      'Database connection failed',
      503,
      'DATABASE_UNAVAILABLE',
      `${req.method} ${req.path}`
    );
    logError(dbError, req);
    res.status(503).json(dbError.toJSON());
    return;
  }

  // Handle unexpected errors
  const unexpectedError = new AppError(
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    500,
    'INTERNAL_ERROR',
    `${req.method} ${req.path}`,
    false // Not operational
  );

  logError(err, req, 'CRITICAL');
  res.status(500).json(unexpectedError.toJSON());
}

/**
 * Enhanced error logging with context and correlation IDs
 */
function logError(error: Error, req: Request, level: string = 'ERROR'): void {
  const errorContext = {
    level,
    timestamp: new Date().toISOString(),
    errorId: isAppError(error) ? error.errorId : generateErrorId(),
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      userId: (req as any).user?.id
    },
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      isOperational: isOperationalError(error)
    }
  };

  if (level === 'CRITICAL') {
    console.error('🚨 CRITICAL ERROR:', errorContext);
  } else {
    console.error('❌ ERROR:', errorContext);
  }

  if (process.env.NODE_ENV === 'production' && !isOperationalError(error)) {}
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND',
    `${req.method} ${req.path}`
  );
  next(error);
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Shutdown handler for graceful error recovery
 */
export function handleUncaughtExceptions(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('🔥 UNCAUGHT EXCEPTION! Shutting down...', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('🔥 UNHANDLED REJECTION! Shutting down...', {
      reason,
      timestamp: new Date().toISOString()
    });

  });
}
