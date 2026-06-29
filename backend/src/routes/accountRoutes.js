/**
 * Self-Service Account Routes
 * Endpoints for account owners to manage their own account
 */

import express from 'express';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  getMyAccount,
  updateMyAccount,
  regenerateMyApiKey,
  generateIntegrationToken,
  getIntegrationToken,
  getConnectedPlatforms,
  testPlatformConnection,
  revokeIntegrationToken
} from '../controllers/accountController.js';

const router = express.Router();

// ==========================================
// SELF-SERVICE ROUTES (requires account auth)
// ==========================================

// Apply JWT authentication to all routes in this router
router.use(requireJWT);

/**
 * @route   GET /api/account/me
 * @desc    Get own account details
 * @access  Authenticated account
 */
router.get('/me', getMyAccount);
router.put('/me', updateMyAccount);

/**
 * @route   POST /api/account/api-key/regenerate
 * @desc    Regenerate own API key
 * @access  Authenticated account
 */
router.post('/api-key/regenerate', regenerateMyApiKey);

/**
 * @route   POST /api/account/integration-token
 * @desc    Generate integration token for external apps (Enromatics, etc.)
 * @access  Authenticated account
 */
router.post('/integration-token', generateIntegrationToken);

/**
 * @route   GET /api/account/integration-token
 * @desc    Get integration token info (prefix, created date, last used)
 * @access  Authenticated account
 */
router.get('/integration-token', getIntegrationToken);

/**
 * @route   GET /api/account/connected-platforms
 * @desc    Get list of connected platforms with their status
 * @access  Authenticated account
 */
router.get('/connected-platforms', getConnectedPlatforms);

/**
 * @route   POST /api/account/test-platform-connection
 * @desc    Test if a platform connection is working properly
 * @access  Authenticated account
 */
router.post('/test-platform-connection', testPlatformConnection);

/**
 * @route   DELETE /api/account/integration-token
 * @desc    Revoke integration token
 * @access  Authenticated account
 */
router.delete('/integration-token', revokeIntegrationToken);

export default router;
