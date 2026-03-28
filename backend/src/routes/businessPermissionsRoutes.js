/**
 * Business Permissions Routes
 * API endpoints for managing business advanced management permissions
 */

import express from 'express';
import {
  getPermissionStatus,
  requestPermissions,
  verifyPermissions,
  revokePermissions,
  checkScope,
  getPhonePermissionStatus,
  updatePhonePermissions
} from '../controllers/businessPermissionsController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import { requireApiKey } from '../middlewares/apiKeyAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

// Apply auth middleware to all routes
router.use(requireJWT);

/**
 * Account-level permission endpoints
 */

// Get current permission status
router.get('/status', getPermissionStatus);

// Request advanced management permissions
router.post('/request', requestPermissions);

// Verify/update permissions (from webhook or manual)
router.put('/verify', verifyPermissions);

// Revoke all permissions
router.delete('/revoke', revokePermissions);

// Check if account has specific scope
router.post('/check-scope', checkScope);

/**
 * Phone-level permission endpoints
 */

// Get phone-level permission status
router.get('/phone-status/:phoneNumberId', getPhonePermissionStatus);

// Update phone-level permissions
router.put('/phone-restrict/:phoneNumberId', updatePhonePermissions);

export default router;
