/**
 * Centralized Input Validators
 * Provides reusable validation functions for all controller inputs
 * Standardizes validation across entire codebase
 */

import logger from './logger.js';

// ✅ EMAIL VALIDATION
export const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' };
  return { valid: true };
};

// ✅ PHONE NUMBER VALIDATION (WhatsApp format: +1234567890)
export const validatePhoneNumber = (phone) => {
  if (!phone) return { valid: false, error: 'Phone number is required' };
  // Accept: +1234567890 or 1234567890 (with or without +)
  const phoneRegex = /^\+?[\d\s\-()]{6,}$/;
  if (!phoneRegex.test(phone)) return { valid: false, error: 'Invalid phone number format' };
  if (phone.replace(/\D/g, '').length < 10) return { valid: false, error: 'Phone number must be at least 10 digits' };
  return { valid: true };
};

// ✅ PASSWORD VALIDATION (min 8 chars, has uppercase, lowercase, number)
export const validatePassword = (password) => {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, error: 'Password must contain lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain number' };
  return { valid: true };
};

// ✅ STRING VALIDATION (non-empty, length limits)
export const validateString = (value, fieldName = 'Field', minLength = 1, maxLength = 500) => {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  if (value.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }
  return { valid: true };
};

// ✅ NUMBER VALIDATION (integer, range)
export const validateNumber = (value, fieldName = 'Field', min = 0, max = Infinity) => {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  const num = parseInt(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  if (num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  if (num > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max}` };
  }
  return { valid: true };
};

// ✅ ENUM VALIDATION (value must be in allowed list)
export const validateEnum = (value, fieldName = 'Field', allowedValues = []) => {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (!allowedValues.includes(value)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowedValues.join(', ')}` };
  }
  return { valid: true };
};

// ✅ ARRAY VALIDATION (is array, non-empty, length limits)
export const validateArray = (value, fieldName = 'Field', minLength = 1, maxLength = Infinity) => {
  if (!Array.isArray(value)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }
  if (value.length < minLength) {
    return { valid: false, error: `${fieldName} must have at least ${minLength} items` };
  }
  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} items` };
  }
  return { valid: true };
};

// ✅ DATE VALIDATION (ISO string or Date object)
export const validateDate = (value, fieldName = 'Field') => {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date (ISO 8601 format)` };
  }
  return { valid: true };
};

// ✅ OBJECT_ID VALIDATION (MongoDB ObjectId format)
export const validateObjectId = (value, fieldName = 'Field') => {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }
  // ObjectId is 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(value.toString())) {
    return { valid: false, error: `${fieldName} must be a valid MongoDB ObjectId` };
  }
  return { valid: true };
};

// ✅ URL VALIDATION (http/https)
export const validateURL = (value, fieldName = 'Field') => {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }
  try {
    new URL(value);
    return { valid: true };
  } catch {
    return { valid: false, error: `${fieldName} must be a valid URL` };
  }
};

// ✅ BOOLEAN VALIDATION (true/false or 'true'/'false' strings)
export const validateBoolean = (value, fieldName = 'Field') => {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (typeof value === 'boolean') return { valid: true };
  if (typeof value === 'string' && (value === 'true' || value === 'false')) return { valid: true };
  return { valid: false, error: `${fieldName} must be a boolean (true/false)` };
};

// ✅ REQUIRED FIELDS VALIDATION (check if all required fields present in object)
export const validateRequiredFields = (obj, fieldNames = []) => {
  const missing = [];
  for (const field of fieldNames) {
    if (!obj[field] && obj[field] !== 0 && obj[field] !== false) {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }
  return { valid: true };
};

// ✅ PAGINATION VALIDATION (limit and offset)
export const validatePagination = (limit, offset) => {
  const limitValidation = validateNumber(limit, 'limit', 1, 1000);
  if (!limitValidation.valid) return limitValidation;
  
  const offsetValidation = validateNumber(offset, 'offset', 0, 999999);
  if (!offsetValidation.valid) return offsetValidation;
  
  return { valid: true, limit: parseInt(limit), offset: parseInt(offset) };
};

// ✅ SORT ORDER VALIDATION (1 for ascending, -1 for descending)
export const validateSortOrder = (order) => {
  const orderInt = parseInt(order);
  if (orderInt !== 1 && orderInt !== -1) {
    return { valid: false, error: 'Sort order must be 1 (ascending) or -1 (descending)' };
  }
  return { valid: true, order: orderInt };
};

// ✅ BATCH VALIDATOR - Check multiple fields at once
export const validateFields = (data, schema) => {
  /**
   * Schema format:
   * {
   *   email: { validator: validateEmail },
   *   phone: { validator: validatePhoneNumber },
   *   name: { validator: validateString, args: ['name', 1, 100] },
   *   status: { validator: validateEnum, args: ['status', ['active', 'inactive']] }
   * }
   */
  const errors = {};
  
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fieldValue = data[fieldName];
    const validator = fieldSchema.validator;
    const args = fieldSchema.args || [];
    
    const result = validator(fieldValue, ...args);
    if (!result.valid) {
      errors[fieldName] = result.error;
    }
  }
  
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
};

// ✅ SANITIZE - Remove suspicious characters from strings
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Remove leading/trailing whitespace
  str = str.trim();
  // Remove potential XSS characters (basic sanitization)
  str = str.replace(/<script[^>]*>.*?<\/script>/gi, '');
  str = str.replace(/<[^>]+>/g, '');
  return str;
};

// ✅ SANITIZE OBJECT - Sanitize all string fields in object
export const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * USAGE EXAMPLES:
 * 
 * // Single field validation
 * const emailResult = validateEmail(req.body.email);
 * if (!emailResult.valid) return sendValidationError(res, emailResult.error);
 * 
 * // Multiple fields
 * const validation = validateRequiredFields(req.body, ['email', 'password']);
 * if (!validation.valid) return sendValidationError(res, validation.error);
 * 
 * // Batch validation
 * const schema = {
 *   email: { validator: validateEmail },
 *   password: { validator: validatePassword },
 *   name: { validator: validateString, args: ['name', 1, 100] }
 * };
 * const result = validateFields(req.body, schema);
 * if (!result.valid) {
 *   return res.status(400).json({
 *     success: false,
 *     errors: result.errors,
 *     message: 'Validation failed'
 *   });
 * }
 * 
 * // Sanitize before saving
 * const sanitized = sanitizeObject(req.body);
 * const newContact = await Contact.create(sanitized);
 */

export default {
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateString,
  validateNumber,
  validateEnum,
  validateArray,
  validateDate,
  validateObjectId,
  validateURL,
  validateBoolean,
  validateRequiredFields,
  validatePagination,
  validateSortOrder,
  validateFields,
  sanitizeString,
  sanitizeObject
};
