import express from 'express';
import * as pricingController from '../controllers/pricingController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * PUBLIC ROUTES - No Auth Required
 */

// Get all active public pricing plans
router.get('/plans/public', pricingController.getPublicPricingPlans);

// Get specific plan details
router.get('/plans/public/:planId', pricingController.getPricingPlanDetails);

/**
 * ADMIN ROUTES - Requires JWT Auth
 */

// Pricing Plan Management (Superadmin only)
router.post('/admin/plans', requireJWT, pricingController.createPricingPlan);
router.get('/admin/plans', requireJWT, pricingController.getAllPricingPlans);
router.put('/admin/plans/:planId', requireJWT, pricingController.updatePricingPlan);
router.delete('/admin/plans/:planId', requireJWT, pricingController.deletePricingPlan);

// Feature management
router.post('/admin/plans/:planId/features', requireJWT, pricingController.addFeatureToPlan);
router.delete('/admin/plans/:planId/features/:featureId', requireJWT, pricingController.removeFeatureFromPlan);

export default router;
