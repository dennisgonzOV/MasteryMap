import type { Request, Response, NextFunction } from 'express';
import { parseIntParam, handleValidationError } from '../utils/routeHelpers';

/**
 * Enhanced parameter validation middleware to replace duplicated validation logic
 */
export function validateIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.params[paramName];
    
    if (!paramValue) {
      return handleValidationError(res, paramName, 'missing');
    }

    const { value, error } = parseIntParam(paramValue, paramName);
    
    if (error) {
      return handleValidationError(res, paramName, paramValue);
    }

    // Store the parsed value back to params for easy access
    (req.params as any)[`${paramName}Parsed`] = value;
    next();
  };
}

/**
 * Multiple ID parameter validation
 */
export function validateMultipleIdParams(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const paramName of paramNames) {
      const paramValue = req.params[paramName];
      
      if (!paramValue) {
        return handleValidationError(res, paramName, 'missing');
      }

      const { value, error } = parseIntParam(paramValue, paramName);
      
      if (error) {
        return handleValidationError(res, paramName, paramValue);
      }

      (req.params as any)[`${paramName}Parsed`] = value;
    }
    next();
  };
}

/**
 * Required fields validation middleware
 */
export function validateRequiredFields(...fieldNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = fieldNames.filter(field => 
      req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Array validation middleware
 */
export function validateArrayField(fieldName: string, options: {
  required?: boolean;
  minLength?: number;
  itemValidator?: (item: any) => boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const field = req.body[fieldName];
    
    if (options.required && (!field || !Array.isArray(field))) {
      return res.status(400).json({
        message: `${fieldName} must be a non-empty array`
      });
    }

    if (field && !Array.isArray(field)) {
      return res.status(400).json({
        message: `${fieldName} must be an array`
      });
    }

    if (field && options.minLength && field.length < options.minLength) {
      return res.status(400).json({
        message: `${fieldName} must contain at least ${options.minLength} items`
      });
    }

    if (field && options.itemValidator && !field.every(options.itemValidator)) {
      return res.status(400).json({
        message: `${fieldName} contains invalid items`
      });
    }

    next();
  };
}