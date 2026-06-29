import express from 'express';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  autoCaptureLead,
  getLeadStats,
  markStaleLeads,
  exportLeads
} from '../controllers/leadController.js';

import { validateProjectFromQuery } from '../middleware/projectAuth.js';

const router = express.Router();

// Get all leads with filters and stats
router.get('/', validateProjectFromQuery, getLeads);

// Get lead statistics summary
router.get('/stats/summary', validateProjectFromQuery, getLeadStats);

// Export leads as CSV
router.get('/bulk/export', validateProjectFromQuery, exportLeads);

// Auto-capture lead from conversation
router.post('/auto-capture/:conversationId', autoCaptureLead);

// Mark stale leads
router.post('/maintenance/mark-stale', markStaleLeads);

// Get single lead
router.get('/:id', validateProjectFromQuery, getLead);

// Create lead manually
router.post('/', createLead);

// Update lead (status, assignment, notes)
router.patch('/:id', updateLead);

// Delete lead
router.delete('/:id', deleteLead);

export default router;
