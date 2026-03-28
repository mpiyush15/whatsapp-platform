import express from 'express';
import * as campaignController from '../controllers/campaignController.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * All routes require authentication via app.js middleware
 * (requireJWT is applied at /api/campaigns level in app.js)
 */

/**
 * GET /api/campaigns/segments
 * Get available segments for audience selection
 */
router.get('/segments', 
  campaignController.getAvailableSegments
);

/**
 * POST /api/campaigns
 * Create new campaign
 */
router.post('/', 
  campaignController.createCampaign
);

/**
 * GET /api/campaigns
 * Get all campaigns with filters
 * Query params: status, type, startDate, endDate, search, limit, skip
 */
router.get('/', 
  campaignController.getCampaigns
);

/**
 * POST /api/campaigns/estimate-reach
 * Estimate audience reach for given filters
 */
router.post('/estimate-reach', 
  campaignController.estimateAudienceReach
);

/**
 * GET /api/campaigns/:campaignId
 * Get campaign by ID
 */
router.get('/:campaignId', 
  campaignController.getCampaignById
);

/**
 * PUT /api/campaigns/:campaignId
 * Update campaign
 */
router.put('/:campaignId', 
  campaignController.updateCampaign
);

/**
 * DELETE /api/campaigns/:campaignId
 * Delete campaign
 */
router.delete('/:campaignId', 
  campaignController.deleteCampaign
);

/**
 * POST /api/campaigns/:campaignId/validate
 * Validate campaign before sending
 */
router.post('/:campaignId/validate', 
  campaignController.validateCampaign
);

/**
 * POST /api/campaigns/:campaignId/start
 * Start campaign (begin sending)
 */
router.post('/:campaignId/start', 
  campaignController.startCampaign
);

/**
 * POST /api/campaigns/:campaignId/pause
 * Pause campaign
 */
router.post('/:campaignId/pause', 
  campaignController.pauseCampaign
);

/**
 * POST /api/campaigns/:campaignId/resume
 * Resume paused campaign
 */
router.post('/:campaignId/resume', 
  campaignController.resumeCampaign
);

/**
 * POST /api/campaigns/:campaignId/cancel
 * Cancel campaign
 */
router.post('/:campaignId/cancel', 
  campaignController.cancelCampaign
);

/**
 * GET /api/campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/:campaignId/stats', 
  campaignController.getCampaignStats
);

/**
 * POST /api/campaigns/:campaignId/save-as-template
 * Save campaign as template
 */
router.post('/:campaignId/save-as-template', 
  campaignController.saveCampaignAsTemplate
);

/**
 * POST /api/campaigns/:campaignId/duplicate
 * Duplicate campaign
 */
router.post('/:campaignId/duplicate', 
  campaignController.duplicateCampaign
);

export default router;

