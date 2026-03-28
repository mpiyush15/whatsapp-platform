/**
 * Multer Error Handler Middleware
 * Provides user-friendly error messages for file upload failures
 */

import multer from 'multer';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Handle multer errors with friendly messages
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error('❌ Multer error:', err.code, err.message);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File is too large. Maximum size is ${(16 * 1024 * 1024 / 1024 / 1024).toFixed(1)}MB.`,
        error: 'FILE_TOO_LARGE',
        maxSize: '16MB',
        received: `${(err.limit / 1024 / 1024).toFixed(2)}MB`,
        tip: 'Compress your image/video using online tools or your device.'
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. You can only upload 1 file at a time.`,
        error: 'TOO_MANY_FILES',
        received: err.limit,
        allowedCount: 1
      });
    }

    if (err.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Request has too many form fields. Please try again.',
        error: 'TOO_MANY_FIELDS'
      });
    }

    if (err.code === 'LIMIT_FIELD_KEY') {
      return res.status(400).json({
        success: false,
        message: 'Field name is too long.',
        error: 'FIELD_KEY_TOO_LONG'
      });
    }

    if (err.code === 'LIMIT_FIELD_VALUE') {
      return res.status(400).json({
        success: false,
        message: 'Field value is too long.',
        error: 'FIELD_VALUE_TOO_LONG'
      });
    }

    // Generic multer error
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
      error: 'UPLOAD_ERROR',
      code: err.code
    });
  }

  if (err instanceof Error) {
    // Custom validation error
    if (err.message.includes('File type not allowed')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'INVALID_FILE_TYPE',
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });
    }
  }

  // Pass to next error handler if not a multer error
  next(err);
};

export default handleMulterError;
