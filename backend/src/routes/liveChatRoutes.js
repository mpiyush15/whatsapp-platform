import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  processIncomingMessage,
  getConversations,
  getConversation,
  sendMessage,
  assignConversation,
  resolveConversation
} from '../controllers/liveChatController.js';

const router = express.Router();

/**
 * Live Chat Routes
 * All routes require authentication
 */

// Get all conversations
router.get('/conversations', authenticateToken, (req, res) => {
  getConversations(req, res);
});

// Get single conversation
router.get('/conversations/:conversationId', authenticateToken, (req, res) => {
  getConversation(req, res);
});

// Send message/reply
router.post('/conversations/:conversationId/send', authenticateToken, (req, res) => {
  // Pass io from req.app
  sendMessage(req, res, req.app.get('io'));
});

// Assign conversation to agent
router.post('/conversations/:conversationId/assign', authenticateToken, (req, res) => {
  assignConversation(req, res, req.app.get('io'));
});

// Resolve conversation
router.post('/conversations/:conversationId/resolve', authenticateToken, (req, res) => {
  resolveConversation(req, res, req.app.get('io'));
});

export default router;
