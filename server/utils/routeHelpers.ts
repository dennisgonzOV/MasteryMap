import type { Response } from 'express';
import type { AuthenticatedRequest } from '../domains/auth';
import type { ApiErrorPayload } from '../../shared/contracts/api';

/**
 * Standardized error response utility to eliminate duplicated error handling
 */
export interface ErrorResponseOptions {
  message: string;
  error?: unknown;
  details?: unknown;
  statusCode?: number;
  includeDetails?: boolean;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}

export function createErrorPayload(options: ErrorResponseOptions): ApiErrorPayload {
  const {
    message,
    error,
    details,
    includeDetails = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
  } = options;

  const payload: ApiErrorPayload = { message };

  if (error !== undefined) {
    payload.error = toErrorMessage(error);
  }

  if (includeDetails) {
    if (details !== undefined) {
      payload.details = details;
    } else if (error !== undefined && typeof error === "object" && error !== null) {
      payload.details = error;
    }
  }

  return payload;
}

export function sendErrorResponse(
  res: Response,
  options: ErrorResponseOptions,
): void {
  const { statusCode = 500 } = options;
  res.status(statusCode).json(createErrorPayload(options));
}

export function createStandardErrorResponse(
  res: Response,
  options: ErrorResponseOptions
): void {
  const {
    message,
    error,
    statusCode = 500,
    includeDetails = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  } = options;

  console.error(`Error: ${message}`, error);
  sendErrorResponse(res, {
    message,
    error,
    statusCode,
    includeDetails,
  });
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
  sendErrorResponse(res, {
    message: `${entityName} not found`
    ,
    statusCode: 404,
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
  sendErrorResponse(res, {
    message: `Invalid ${field}${value ? `: ${value}` : ''}`
    ,
    statusCode: 400,
  });
}

/**
 * Authorization error response utility
 */
export function handleAuthorizationError(
  res: Response,
  message: string = "Access denied"
): void {
  sendErrorResponse(res, { message, statusCode: 403 });
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
