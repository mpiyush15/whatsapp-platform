import express from 'express';
import * as pricingController from '../controllers/pricingController.js';
import { requireJWT, requireSuperAdmin } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * PUBLIC ROUTES - No Auth Required
 */

// Get all active public pricing plans (?productLine=whatsapp|healthcare)
router.get('/plans/public', pricingController.getPublicPricingPlans);

// Feature comparison matrix for public pricing page
router.get('/plans/feature-matrix', pricingController.getPricingFeatureMatrix);

// Get specific plan details
router.get('/plans/public/:planId', pricingController.getPricingPlanDetails);

/**
 * ADMIN ROUTES - Requires JWT Auth + Superadmin
 */

// Plan feature catalog for superadmin editor
router.get('/admin/catalog', requireJWT, requireSuperAdmin, pricingController.getPlanFeatureCatalog);

// Pricing Plan Management (Superadmin only)
router.post('/admin/plans', requireJWT, requireSuperAdmin, pricingController.createPricingPlan);
router.get('/admin/plans', requireJWT, requireSuperAdmin, pricingController.getAllPricingPlans);
router.get('/admin/plans/:planId', requireJWT, requireSuperAdmin, pricingController.getPlanById);
router.put('/admin/plans/:planId', requireJWT, requireSuperAdmin, pricingController.updatePricingPlan);
router.delete('/admin/plans/:planId', requireJWT, requireSuperAdmin, pricingController.deletePricingPlan);
router.patch('/admin/plans/:planId/suspend', requireJWT, requireSuperAdmin, pricingController.suspendPlan);
router.patch('/admin/plans/:planId/publish', requireJWT, requireSuperAdmin, pricingController.publishPlan);

// Feature management
router.post('/admin/plans/:planId/features', requireJWT, requireSuperAdmin, pricingController.addFeatureToPlan);
router.delete('/admin/plans/:planId/features/:featureId', requireJWT, requireSuperAdmin, pricingController.removeFeatureFromPlan);

// Offers/Discount Management (Superadmin only)
router.post('/admin/offers', requireJWT, requireSuperAdmin, pricingController.createOffer);
router.get('/admin/offers', requireJWT, requireSuperAdmin, pricingController.getAllOffers);
router.get('/admin/offers/:offerId', requireJWT, requireSuperAdmin, pricingController.getOfferById);
router.put('/admin/offers/:offerId', requireJWT, requireSuperAdmin, pricingController.updateOffer);
router.delete('/admin/offers/:offerId', requireJWT, requireSuperAdmin, pricingController.deleteOffer);
router.patch('/admin/offers/:offerId/deactivate', requireJWT, requireSuperAdmin, pricingController.deactivateOffer);

// Utility
router.get('/admin/plans/:planId/applicable-offers', requireJWT, requireSuperAdmin, pricingController.getApplicableOffers);

export default router;
