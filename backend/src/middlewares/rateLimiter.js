import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
/**
 * Rate Limiting Middleware
 * Prevents abuse and DDoS attacks
 */

// Message sending limiter - 100 messages per minute per account
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 messages per minute
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many messages sent. Please wait 60 seconds before sending more.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Rate limit per account, not per IP (for multi-user scenarios)
    // If no account, use IPv6-safe IP generator
    return req.account?._id?.toString() || ipKeyGenerator(req, res);
  },
  skip: (req, res) => {
    // Skip rate limiting for superadmin
    return req.account?.role === 'superadmin';
  }
});

// Broadcast limiter - 10 broadcasts per hour
export const broadcastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                    // 10 broadcasts per hour
  message: {
    success: false,
    code: 'BROADCAST_LIMIT_EXCEEDED',
    message: 'Too many broadcasts started. Maximum 10 per hour. Try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.account?._id?.toString() || ipKeyGenerator(req, res),
  skip: (req, res) => req.account?.role === 'superadmin'
});

// Template submission limiter - 5 per hour
export const templateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // 5 templates per hour
  message: {
    success: false,
    code: 'TEMPLATE_LIMIT_EXCEEDED',
    message: 'Too many templates submitted. Maximum 5 per hour.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.account?._id?.toString() || ipKeyGenerator(req, res),
  skip: (req, res) => req.account?.role === 'superadmin'
});

// Contact creation limiter - 1000 per hour
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 1000,                  // 1000 contacts per hour
  message: {
    success: false,
    code: 'CONTACT_LIMIT_EXCEEDED',
    message: 'Too many contacts created. Please wait before creating more.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.account?._id?.toString() || ipKeyGenerator(req, res),
  skip: (req, res) => req.account?.role === 'superadmin'
});

// API key endpoint limiter - 1000 per hour
export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 1000,                  // 1000 requests per hour
  message: {
    success: false,
    code: 'API_RATE_LIMIT_EXCEEDED',
    message: 'API rate limit exceeded. Maximum 1000 requests per hour.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.headers['x-api-key'] || ipKeyGenerator(req, res)
});

export default {
  messageLimiter,
  broadcastLimiter,
  templateLimiter,
  contactLimiter,
  apiKeyLimiter
};
