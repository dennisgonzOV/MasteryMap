import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configurations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: 'Too many requests',
    message: 'Please slow down your requests',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI requests per hour
  message: {
    error: 'AI usage limit exceeded',
    message: 'Please wait before making more AI requests',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Note: CSRF protection removed as it was not being used in the application
// JWT-based auth with HTTP-only cookies provides sufficient protection

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for React development
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"], // OpenAI API
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
});

// Parameter validation middleware
export const validateIntParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = parseInt(req.params[paramName]);
    
    if (isNaN(value) || value <= 0 || !Number.isInteger(value)) {
      return res.status(400).json({ 
        message: `Invalid ${paramName} parameter`,
        error: 'Parameter must be a positive integer'
      });
    }
    
    // Additional safety: Check for extremely large numbers
    if (value > Number.MAX_SAFE_INTEGER) {
      return res.status(400).json({
        message: `${paramName} parameter too large`,
        error: 'Parameter exceeds safe integer range'
      });
    }
    
    // Store validated value back to params
    req.params[paramName] = value.toString();
    next();
  };
};

// AI input sanitization
export const sanitizeForPrompt = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    // Remove potential instruction injection attempts
    .replace(/ignore\s+(previous\s+)?instructions?/gi, '[INSTRUCTION_BLOCKED]')
    .replace(/system\s*:/gi, '[SYSTEM_BLOCKED]')
    .replace(/assistant\s*:/gi, '[ASSISTANT_BLOCKED]')
    .replace(/user\s*:/gi, '[USER_BLOCKED]')
    
    // Remove script tags and other dangerous content
    .replace(/<script.*?>/gi, '[SCRIPT_BLOCKED]')
    .replace(/<\/script>/gi, '[/SCRIPT_BLOCKED]')
    .replace(/<iframe.*?>/gi, '[IFRAME_BLOCKED]')
    .replace(/javascript:/gi, '[JAVASCRIPT_BLOCKED]')
    
    // Limit length to prevent abuse
    .substring(0, 2000)
    
    // Trim whitespace
    .trim();
};

// Error response sanitization
export const createErrorResponse = (error: any, message: string, statusCode: number = 500) => {
  const response: any = {
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };
  
  // Only include error details in development, and even then, limit exposure
  if (process.env.NODE_ENV === 'development') {
    response.error = error?.message || 'Unknown error occurred';
    // Never expose full stack traces or sensitive data
  }
  
  return response;
};

// Validation middleware for common patterns
// Note: Email validation removed - system now uses username-based authentication

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password is too long' };
  }
  
  return { valid: true };
};