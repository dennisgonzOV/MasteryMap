import type { Response } from 'express';
import type { AuthenticatedRequest } from '../domains/auth';

/**
 * Standardized error response utility to eliminate duplicated error handling
 */
export interface ErrorResponseOptions {
  message: string;
  error?: Error | string;
  statusCode?: number;
  includeDetails?: boolean;
}

export function createStandardErrorResponse(
  res: Response,
  options: ErrorResponseOptions
): void {
  const {
    message,
    error,
    statusCode = 500,
    includeDetails = process.env.NODE_ENV === 'development'
  } = options;

  console.error(`Error: ${message}`, error);

  const errorMessage = error instanceof Error ? error.message : (error || "Unknown error occurred");
  
  const responseBody: any = {
    message,
    error: errorMessage
  };

  if (includeDetails && error) {
    responseBody.details = error;
  }

  res.status(statusCode).json(responseBody);
}

/**
 * Standard route error handler wrapper
 */
export function handleRouteError(
  res: Response,
  error: unknown,
  action: string,
  statusCode: number = 500
): void {
  createStandardErrorResponse(res, {
    message: `Failed to ${action}`,
    error: error as Error,
    statusCode
  });
}

/**
 * Entity not found response utility
 */
export function handleEntityNotFound(
  res: Response,
  entityName: string
): void {
  res.status(404).json({
    message: `${entityName} not found`
  });
}

/**
 * Validation error response utility
 */
export function handleValidationError(
  res: Response,
  field: string,
  value?: string | number
): void {
  res.status(400).json({
    message: `Invalid ${field}${value ? `: ${value}` : ''}`
  });
}

/**
 * Authorization error response utility
 */
export function handleAuthorizationError(
  res: Response,
  message: string = "Access denied"
): void {
  res.status(403).json({ message });
}

/**
 * Success response utility with consistent structure
 */
export function createSuccessResponse<T = any>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const responseBody: any = data;
  
  if (message) {
    responseBody.message = message;
  }

  res.status(statusCode).json(responseBody);
}

/**
 * Parse and validate integer parameter
 */
export function parseIntParam(
  paramValue: string,
  paramName: string = 'id'
): { value: number; error?: string } {
  const parsed = parseInt(paramValue);
  
  if (isNaN(parsed)) {
    return {
      value: 0,
      error: `Invalid ${paramName}`
    };
  }
  
  return { value: parsed };
}

/**
 * Role checking utility
 */
export function hasRequiredRole(
  user: any,
  allowedRoles: string[]
): boolean {
  return user && allowedRoles.includes(user.role);
}

/**
 * Teacher ownership checking utility
 */
export function isTeacherOwner(
  user: any,
  resource: { teacherId: number }
): boolean {
  return user?.role === 'admin' || 
         (user?.role === 'teacher' && resource.teacherId === user.id);
}

/**
 * Generic route wrapper with standard error handling
 */
export function wrapRoute<T = any>(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<T>
) {
  return async (req: AuthenticatedRequest, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleRouteError(res, error, 'process request');
    }
  };
}