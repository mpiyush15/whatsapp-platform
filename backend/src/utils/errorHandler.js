/**
 * Centralized Error Handler Utility
 * 
 * Purpose: Standardize error handling across all backend files
 * - Controllers catch errors and use handleControllerError()
 * - Services throw custom errors using createAppError()
 * - Consistent error response format across all endpoints
 * 
 * Features:
 * - Automatic status code mapping based on error type
 * - Structured error logging with context
 * - Safe error message handling (no credential leaks)
 * - Standard response format: { success: false, error: string, code: string, statusCode: number }
 */

import logger from './logger.js';

/**
 * Custom application error class
 * Services throw this with type for automatic status code mapping
 */
export class AppError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

/**
 * Map error to HTTP status code
 */
const getStatusCode = (error) => {
  // AppError subclasses (custom status codes)
  if (error instanceof AppError) return error.statusCode;
  
  // MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongoNetworkError') return 500;
  if (error.name === 'MongoParseError') return 400;
  if (error.name === 'CastError') return 400; // Invalid ObjectId
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'DuplicateKeyError') return 409;
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') return 401;
  if (error.name === 'TokenExpiredError') return 401;
  
  // Default
  return 500;
};

/**
 * Get safe error message (prevents credential leaks)
 */
const getSafeMessage = (error) => {
  // Already a custom error
  if (error instanceof AppError) return error.message;
  
  // Safe system errors
  if (error.name === 'ValidationError') return `Validation failed: ${error.message}`;
  if (error.name === 'CastError') return `Invalid ID format`;
  if (error.name === 'DuplicateKeyError') return `Duplicate entry found`;
  if (error.name === 'JsonWebTokenError') return `Invalid token`;
  if (error.name === 'TokenExpiredError') return `Token expired`;
  
  // Generic safe message (never expose full error details in production)
  return process.env.NODE_ENV === 'development' 
    ? error.message 
    : 'An error occurred. Please try again.';
};

/**
 * Get error code for API response
 */
const getErrorCode = (error) => {
  if (error instanceof AppError) return error.code;
  if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
  if (error.name === 'CastError') return 'INVALID_ID';
  if (error.name === 'DuplicateKeyError') return 'DUPLICATE_ENTRY';
  if (error.name === 'JsonWebTokenError') return 'INVALID_TOKEN';
  if (error.name === 'TokenExpiredError') return 'TOKEN_EXPIRED';
  return 'INTERNAL_ERROR';
};

/**
 * Main error handler for controllers
 * 
 * Usage:
 * try {
 *   // controller logic
 * } catch (error) {
 *   return handleControllerError(res, error, 'operationName');
 * }
 */
export const handleControllerError = (res, error, operation = 'Operation') => {
  const statusCode = getStatusCode(error);
  const message = getSafeMessage(error);
  const code = getErrorCode(error);
  
  // Log error with context
  if (statusCode >= 500) {
    logger.error(`❌ ${operation} failed:`, error);
  } else {
    logger.warn(`🟡 ${operation} validation error: ${message}`);
  }
  
  // Return standardized error response
  return res.status(statusCode).json({
    success: false,
    error: message,
    code: code,
    statusCode: statusCode
  });
};

/**
 * Validate request body has required fields
 * Throws ValidationError if validation fails
 * 
 * Usage:
 * validateInput(req.body, ['name', 'email', 'phone']);
 */
export const validateInput = (data, requiredFields, operationName = 'Input validation') => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Validate request has required fields
 * Throws ValidationError if missing
 * 
 * Usage:
 * validateRequest(req, ['accountId', 'body']);
 */
export const validateRequest = (req, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    const parts = field.split('.');
    let value = req;
    
    for (const part of parts) {
      value = value ? value[part] : undefined;
    }
    
    if (value === undefined || value === null) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required request data: ${missing.join(', ')}`);
  }
};

/**
 * Create custom application error with status code
 * 
 * Usage:
 * if (!user) throw createAppError('User not found', 'USER_NOT_FOUND', 404);
 */
export const createAppError = (message, code = 'INTERNAL_ERROR', statusCode = 500) => {
  return new AppError(message, code, statusCode);
};

/**
 * Async error wrapper for Express routes
 * Automatically catches errors and passes to next() middleware
 * 
 * Usage:
 * app.get('/api/users/:id', asyncHandler(async (req, res) => {
 *   const user = await User.findById(req.params.id);
 *   res.json(user);
 * }));
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error response formatter
 * Used by error middleware to format final error response
 */
export const formatErrorResponse = (error) => {
  const statusCode = getStatusCode(error);
  const message = getSafeMessage(error);
  const code = getErrorCode(error);
  
  return {
    success: false,
    error: message,
    code: code,
    statusCode: statusCode
  };
};

/**
 * Express error middleware
 * Place this at the very end of app.js after all other routes
 * 
 * Usage in app.js:
 * import { errorMiddleware } from './utils/errorHandler.js';
 * app.use(errorMiddleware);
 */
export const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  
  const statusCode = getStatusCode(error);
  const message = getSafeMessage(error);
  const code = getErrorCode(error);
  
  // Log error
  if (statusCode >= 500) {
    logger.error('❌ Unhandled error:', error);
  } else {
    logger.warn(`🟡 Error (${code}): ${message}`);
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    code: code,
    statusCode: statusCode
  });
};

export default {
  // Error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  
  // Handlers
  handleControllerError,
  asyncHandler,
  errorMiddleware,
  
  // Utilities
  validateInput,
  validateRequest,
  createAppError,
  formatErrorResponse,
  getStatusCode,
  getSafeMessage,
  getErrorCode
};
