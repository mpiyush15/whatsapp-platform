import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Input Validation Middleware
 * Validates request data BEFORE it touches the database
 */

// Validation rules for different resources
const validationRules = {
  contact: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    phone: { required: true, type: 'string', pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, maxLength: 20 },
    whatsappNumber: { required: true, type: 'string', pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, maxLength: 20 },
    email: { required: false, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, maxLength: 100 },
    type: { required: false, type: 'string', enum: ['customer', 'lead', 'other'] }
  },
  
  message: {
    conversationId: { required: true, type: 'string' },
    content: { required: true, type: 'string', minLength: 1, maxLength: 4096 },
    mediaUrl: { required: false, type: 'string', maxLength: 1000 },
    type: { required: false, type: 'string', enum: ['text', 'image', 'document', 'audio', 'video'] }
  },
  
  broadcast: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
    phoneNumberId: { required: true, type: 'string' },
    messageType: { required: false, type: 'string', enum: ['text', 'template', 'media'] },
    content: { required: true, type: 'object' }
  },
  
  template: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    category: { required: true, type: 'string', enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'] },
    body: { required: true, type: 'string', minLength: 1, maxLength: 1024 }
  },
  
  lead: {
    conversationId: { required: true, type: 'string' },
    contactId: { required: true, type: 'string' },
    status: { required: false, type: 'string', enum: ['new', 'contacted', 'qualified', 'converted', 'lost'] }
  }
};

/**
 * Validate a single field against rules
 */
const validateField = (value, rules, fieldName) => {
  const errors = [];

  // Check required
  if (rules.required && (value === undefined || value === null || value === '')) {
    return [`${fieldName} is required`];
  }

  // If not required and empty, skip further validation
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return [];
  }

  // Check type
  if (rules.type) {
    const actualType = typeof value;
    if (rules.type === 'object' && actualType !== 'object') {
      errors.push(`${fieldName} must be an object`);
    } else if (rules.type !== 'object' && actualType !== rules.type) {
      errors.push(`${fieldName} must be a ${rules.type}`);
    }
  }

  // Only continue if value is string
  if (typeof value === 'string') {
    // Check min length
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }

    // Check max length
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
    }

    // Check pattern (regex)
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Check enum
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }
  }

  return errors;
};

/**
 * Validate entire object against rules
 */
const validateObject = (data, rules) => {
  const allErrors = {};

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const value = data[fieldName];
    const fieldErrors = validateField(value, fieldRules, fieldName);
    
    if (fieldErrors.length > 0) {
      allErrors[fieldName] = fieldErrors;
    }
  }

  return Object.keys(allErrors).length === 0 ? null : allErrors;
};

/**
 * Middleware factory - creates validation middleware for a resource type
 */
const createValidator = (resourceType) => {
  return (req, res, next) => {
    const rules = validationRules[resourceType];
    
    if (!rules) {
      console.warn(`No validation rules found for resource type: ${resourceType}`);
      return next();
    }

    const errors = validateObject(req.body, rules);

    if (errors) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        errors: errors
      });
    }

    next();
  };
};

/**
 * Generic validation middleware for custom rules
 */
const validateCustom = (customRules) => {
  return (req, res, next) => {
    const errors = validateObject(req.body, customRules);

    if (errors) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        errors: errors
      });
    }

    next();
  };
};

export { createValidator, validateCustom, validationRules };

export default {
  validateSendMessage: [],
  validateSendTemplateMessage: [],
  validateCreateContact: [],
  validateUpdateContact: [],
  validateCreateBroadcast: [],
  validateCreateTemplate: [],
  validateGetConversations: [],
  validateObjectId: [],
  createValidator,
  validateCustom,
  validationRules
};
