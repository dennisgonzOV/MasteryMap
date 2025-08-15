/**
 * Standardized error types and utilities for consistent error handling
 */

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  errorId: string;
  context?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: string;
  public readonly errorId: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    context?: string,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.generateErrorCode(statusCode);
    this.context = context;
    this.errorId = this.generateErrorId();
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  private generateErrorCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'VALIDATION_ERROR';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 429: return 'RATE_LIMITED';
      case 500: return 'INTERNAL_ERROR';
      default: return 'UNKNOWN_ERROR';
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  toJSON(): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      timestamp: new Date().toISOString(),
      errorId: this.errorId,
      context: this.context,
      details: process.env.NODE_ENV === 'development' ? {
        stack: this.stack,
        statusCode: this.statusCode
      } : undefined
    };
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, field?: string, context?: string) {
    const finalContext = field ? `${context || 'validation'}.${field}` : context;
    super(message, 400, 'VALIDATION_ERROR', finalContext);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: string) {
    super(message, 401, 'UNAUTHORIZED', context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: string) {
    super(message, 403, 'FORBIDDEN', context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number, context?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: string) {
    super(message, 409, 'CONFLICT', context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: string) {
    super(message, 429, 'RATE_LIMITED', context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, context?: string) {
    super(message, 500, 'DATABASE_ERROR', context);
    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

export class AIServiceError extends AppError {
  public readonly aiProvider: string;
  public readonly originalError?: Error;

  constructor(
    message: string, 
    aiProvider: string = 'OpenAI',
    originalError?: Error,
    context?: string
  ) {
    super(message, 500, 'AI_SERVICE_ERROR', context);
    this.aiProvider = aiProvider;
    this.originalError = originalError;
    
    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  toJSON(): ApiErrorResponse & { aiProvider: string } {
    return {
      ...super.toJSON(),
      aiProvider: this.aiProvider,
      details: process.env.NODE_ENV === 'development' ? {
        ...super.toJSON().details,
        originalError: this.originalError?.message
      } : undefined
    };
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: string) {
    super(message, 503, 'NETWORK_ERROR', context);
  }
}

// Error detection utilities
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: any): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

// Error context helpers
export function createErrorContext(
  operation: string,
  userId?: number,
  additionalContext?: Record<string, any>
): string {
  const context = { operation, userId, ...additionalContext };
  return Object.entries(context)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
}

// Database error parsing
export function parseDatabaseError(error: any, context?: string): AppError {
  const message = error.message || 'Database operation failed';
  
  // Handle common database errors
  if (message.includes('duplicate key')) {
    return new ConflictError('Resource already exists', context);
  }
  
  if (message.includes('foreign key constraint')) {
    return new ValidationError('Referenced resource not found', undefined, context);
  }
  
  if (message.includes('connection')) {
    return new NetworkError('Database connection failed', context);
  }
  
  return new DatabaseError(message, error, context);
}

// AI service error parsing  
export function parseAIServiceError(error: any, context?: string): AIServiceError {
  const message = error.message || 'AI service request failed';
  
  // Handle OpenAI specific errors
  if (error.status === 401) {
    return new AIServiceError('AI service authentication failed', 'OpenAI', error, context);
  }
  
  if (error.status === 429) {
    return new AIServiceError('AI service rate limit exceeded', 'OpenAI', error, context);
  }
  
  if (error.status === 503) {
    return new AIServiceError('AI service temporarily unavailable', 'OpenAI', error, context);
  }
  
  return new AIServiceError(message, 'OpenAI', error, context);
}