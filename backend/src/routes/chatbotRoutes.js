import express from 'express';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import { 
  getChatbots, 
  getChatbot,
  createChatbot,
  updateChatbot,
  toggleChatbot,
  deleteChatbot,
  getChatbotInteractions,
  getChatbotLeads,
  updateLead,
  convertLeadToClient,
  deleteLead
} from '../controllers/chatbotController.js';

const router = express.Router();

// JWT auth is handled at app.js level, no need for authenticate here

// ===== LEADS ROUTES (Must come BEFORE /:id routes) =====
// Get all leads for a chatbot
router.get('/:chatbotId/leads', getChatbotLeads);

// Update lead status/notes
router.patch('/leads/:leadId', updateLead);

// Convert lead to contact
router.post('/leads/:leadId/convert', convertLeadToClient);

// Delete lead
router.delete('/leads/:leadId', deleteLead);

// ===== CHATBOT ROUTES =====

// Get all chatbots with stats
router.get('/', getChatbots);

// Get single chatbot
router.get('/:id', getChatbot);

// Get chatbot interaction history
router.get('/:id/interactions', getChatbotInteractions);

// Create new chatbot
router.post('/', createChatbot);

// Update chatbot
router.put('/:id', updateChatbot);

// Toggle chatbot active status
router.patch('/:id/toggle', toggleChatbot);

// Delete chatbot
router.delete('/:id', deleteChatbot);

export default router;
