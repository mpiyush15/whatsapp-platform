import express from 'express';
import agentController from '../controllers/agentController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';

const router = express.Router();

/**
 * Agent Management Routes
 * All routes require authentication
 * Subdomain detection is OPTIONAL - falls back to accountId
 */

/**
 * CREATE AGENT
 * POST /api/agents
 * Create new agent and send invitation email
 * Requires: manager or higher role
 */
router.post('/', requireJWT, agentController.createAgent);

/**
 * ACCEPT INVITATION & CREATE ACCOUNT
 * POST /api/agents/accept-invitation
 * Public endpoint - no auth needed
 * Called when agent clicks invitation link
 * MUST BE BEFORE /:agentId routes to match correctly
 */
router.post('/accept-invitation', agentController.acceptInvitation);

/**
 * GET ALL AGENTS
 * GET /api/agents
 * List agents in workspace
 * Supports filtering: ?status=active&role=agent&search=john
 */
router.get('/', requireJWT, agentController.getAgents);

/**
 * GET SINGLE AGENT
 * GET /api/agents/:agentId
 * Get details of specific agent
 */
router.get('/:agentId', requireJWT, agentController.getAgent);

/**
 * UPDATE AGENT
 * PUT /api/agents/:agentId
 * Update agent details
 */
router.put('/:agentId', requireJWT, agentController.updateAgent);

/**
 * RESEND INVITATION EMAIL
 * POST /api/agents/:agentId/resend-invitation
 * Resend invitation email to agent
 */
router.post('/:agentId/resend-invitation', requireJWT, agentController.resendInvitationEmail);

/**
 * ASSIGN CONVERSATION TO AGENT
 * POST /api/agents/:agentId/assign
 * Assign conversation to agent
 */
router.post('/:agentId/assign', requireJWT, agentController.assignConversation);

/**
 * UNASSIGN CONVERSATION FROM AGENT
 * POST /api/agents/:agentId/unassign
 * Unassign conversation from agent
 */
router.post('/:agentId/unassign', requireJWT, agentController.unassignConversation);

/**
 * DELETE AGENT (soft delete)
 * DELETE /api/agents/:agentId
 * Soft delete agent - doesn't remove data, marks as deleted
 */
router.delete('/:agentId', requireJWT, agentController.deleteAgent);

export default router;
