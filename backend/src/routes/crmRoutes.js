import express from 'express';
import crmController from '../controllers/crmController.js';
import { authenticate } from '../middlewares/auth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * CRM Routes
 * All routes require JWT authentication (user logged in)
 */

// Dashboard & Overview
router.get('/dashboard', authenticate, crmController.getCRMDashboard);

// Contact Management
router.get('/contacts', authenticate, crmController.getCRMContacts);
router.post('/contacts', authenticate, crmController.createCRMContact);
router.put('/contacts/:id', authenticate, crmController.updateCRMContact);

// Conversation Management
router.get('/conversations', authenticate, crmController.getCRMConversations);
router.get('/conversation/:conversationId', authenticate, crmController.getCRMConversationDetail);

// Analytics
router.get('/analytics', authenticate, crmController.getCRMAnalytics);

export default router;
