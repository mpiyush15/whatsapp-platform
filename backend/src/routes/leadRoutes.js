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

const router = express.Router();

// Get all leads with filters and stats
router.get('/', getLeads);

// Get lead statistics summary
router.get('/stats/summary', getLeadStats);

// Get single lead
router.get('/:id', getLead);

// Create lead manually
router.post('/', createLead);

// Update lead (status, assignment, notes)
router.patch('/:id', updateLead);

// Delete lead
router.delete('/:id', deleteLead);

// Auto-capture lead from conversation
router.post('/auto-capture/:conversationId', autoCaptureLead);

// Mark stale leads
router.post('/maintenance/mark-stale', markStaleLeads);

// Export leads as CSV
router.get('/bulk/export', exportLeads);

export default router;
