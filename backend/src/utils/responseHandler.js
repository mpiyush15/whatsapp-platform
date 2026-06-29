/**
 * Standardized API Response Handler
 * All responses follow the format: { success: boolean, data?: any, message?: string, error?: string }
 * This ensures consistent response structure across all API endpoints
 */

/**
 * Send successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data (optional)
 * @param {string} message - Success message (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, data = null, message = null, statusCode = 200) => {
  const response = {
    success: true,
    ...(data !== null && { data }),
    ...(message && { message }),
  };
  res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} data - Additional error data (optional)
 */
export const sendError = (res, error, statusCode = 500, data = null) => {
  const response = {
    success: false,
    error,
    ...(data !== null && { data }),
  };
  res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {Object} errors - Detailed validation errors (optional)
 */
export const sendValidationError = (res, message = 'Validation failed', errors = null) => {
  const response = {
    success: false,
    error: message,
    ...(errors && { validationErrors: errors }),
  };
  res.status(400).json(response);
};

/**
 * Send not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name that was not found
 */
export const sendNotFound = (res, resource = 'Resource') => {
  sendError(res, `${resource} not found`, 404);
};

/**
 * Send unauthorized error response
 * @param {Object} res - Express response object
 * @param {string} message - Unauthorized message (optional)
 */
export const sendUnauthorized = (res, message = 'Unauthorized - Please login') => {
  sendError(res, message, 401);
};

/**
 * Send forbidden error response
 * @param {Object} res - Express response object
 * @param {string} message - Forbidden message (optional)
 */
export const sendForbidden = (res, message = 'Forbidden - Insufficient permissions') => {
  sendError(res, message, 403);
};

/**
 * Send conflict error response (409)
 * @param {Object} res - Express response object
 * @param {string} message - Conflict message
 */
export const sendConflict = (res, message = 'Resource already exists') => {
  sendError(res, message, 409);
};

/**
 * Send internal server error response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} context - Context for debugging
 */
export const sendInternalError = (res, error, context = '') => {
  console.error(`❌ Internal Error ${context}:`, error);
  sendError(res, 'Internal server error', 500);
};

/**
 * Catch-all error handler for try-catch blocks
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} context - Context for debugging
 */
export const handleCatch = (res, error, context = '') => {
  console.error(`❌ Error in ${context}:`, error.message);
  
  // If it's a known error with statusCode, use it
  if (error.statusCode) {
    return sendError(res, error.message, error.statusCode);
  }
  
  // Default to 500
  sendInternalError(res, error, context);
};
