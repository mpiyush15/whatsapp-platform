import express from 'express';
import {
  generateApiKey,
  listApiKeys,
  deleteApiKey,
  revokeApiKey,
  updateApiKey
} from '../controllers/apiKeyController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

// All routes require JWT authentication
router.use(requireJWT);

/**
 * Generate new API key
 * POST /api/integrations/api-keys/generate
 */
router.post('/generate', generateApiKey);

/**
 * List all API keys for account
 * GET /api/integrations/api-keys
 */
router.get('/', listApiKeys);

/**
 * Update API key (rename)
 * PATCH /api/integrations/api-keys/:keyId
 */
router.patch('/:keyId', updateApiKey);

/**
 * Revoke API key (disable it)
 * POST /api/integrations/api-keys/:keyId/revoke
 */
router.post('/:keyId/revoke', revokeApiKey);

/**
 * Delete API key
 * DELETE /api/integrations/api-keys/:keyId
 */
router.delete('/:keyId', deleteApiKey);

export default router;
