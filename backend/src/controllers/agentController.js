import Agent from '../models/Agent.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
import { emailService } from '../services/emailService.js';
import crypto from 'crypto';

/**
 * Agent Controller
 * Handles agent CRUD, assignment, and invitation workflow
 */

// Note: Email sending via ZeptoMail can be added later if needed
// For now, we'll log invitation URLs for testing

/**
 * CREATE AGENT
 * POST /api/agents
 * Create new agent and send invitation email
 */
export const createAgent = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    // Use accountId as workspaceId (consistent with conversation/message storage)
    const workspaceId = accountId;
    const { name, email, phone, role = 'agent', department, reportingTo } = req.body;
    
    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }
    
    // Check if agent already exists in this account/workspace
    const existingAgent = await Agent.findOne({
      accountId,
      email: email.toLowerCase(),
      deletedAt: null
    });
    
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this email already exists in your workspace'
      });
    }
    
    // Validate role hierarchy
    const validRoles = ['agent', 'team-lead', 'supervisor', 'manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Generate unique agent ID
    const agentId = `AGT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Determine initial status: active for superadmin/admin direct creation, inactive for managers
    const initialStatus = (req.user?.role === 'superadmin' || req.user?.role === 'admin') ? 'active' : 'inactive';
    
    // Create agent
    const agent = await Agent.create({
      agentId,
      accountId,
      workspaceId,
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      role,
      department,
      reportingTo: reportingTo || null,
      invitationToken,
      invitationSentAt: new Date(),
      invitationExpiresAt,
      status: initialStatus
    });
    
    console.log('✅ Agent created:', agent.agentId);
    
    // Send invitation email
    const invitationUrl = `${process.env.FRONTEND_URL}/auth/agent-invitation?token=${invitationToken}`;
    
    console.log('\n📧 INVITATION LINK (for testing):');
    console.log(`   ${invitationUrl}`);
    console.log('\n   Share this link with agent to accept invitation\n');
    
    // Get account name for email
    const account = await Account.findById(accountId).select('organizationName businessName name');
    const accountName = account?.organizationName || account?.businessName || account?.name || 'Replysys';
    
    // Send invitation email via ZeptoMail (don't fail the agent creation if email fails)
    try {
      await emailService.sendAgentInvitationEmail(email, name, invitationToken, accountName);
    } catch (emailError) {
      console.error('⚠️  Email sending failed (agent creation still successful):', emailError.message);
      // Continue - don't fail the entire request if email fails
    }
    
    res.json({
      success: true,
      message: 'Agent created successfully. Invitation link sent to ' + email,
      invitationUrl,  // For testing - remove in production
      agent: {
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        status: agent.status,
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Create agent error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET ALL AGENTS
 * GET /api/agents
 * List agents in workspace
 */
export const getAgents = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { status, role, search } = req.query;
    
    // Build query - use accountId for filtering (works with or without subdomain)
    const query = {
      accountId,
      deletedAt: null
    };
    
    if (status) query.status = status;
    if (role) query.role = role;
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { agentId: new RegExp(search, 'i') }
      ];
    }
    
    const agents = await Agent.find(query)
      .populate('reportingTo', 'name email agentId')
      .populate('userId', 'email phone')
      .select('-invitationToken')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    console.error('❌ Get agents error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET SINGLE AGENT
 * GET /api/agents/:agentId
 */
export const getAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const accountId = req.account.accountId;
    
    const agent = await Agent.findOne({
      agentId,
      accountId,
      deletedAt: null
    })
      .populate('reportingTo', 'name email agentId')
      .populate('userId', 'email phone')
      .populate('teamMembers', 'name email agentId status');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('❌ Get agent error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * UPDATE AGENT
 * PUT /api/agents/:agentId
 */
export const updateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const accountId = req.account.accountId;
    const updates = req.body;
    
    // Don't allow updating certain fields
    delete updates.agentId;
    delete updates.invitationToken;
    delete updates.accountCreated;
    delete updates.accountId;
    delete updates.workspaceId;
    
    const agent = await Agent.findOneAndUpdate(
      { agentId, accountId, deletedAt: null },
      { ...updates, updatedAt: new Date() },
      { new: true }
    )
      .populate('reportingTo', 'name email agentId');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Agent updated successfully',
      agent
    });
  } catch (error) {
    console.error('❌ Update agent error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * RESEND INVITATION EMAIL
 * POST /api/agents/:agentId/resend-invitation
 * Resend invitation email to agent
 */
export const resendInvitationEmail = async (req, res) => {
  try {
    const { agentId } = req.params;  // This is the MongoDB _id
    const accountId = req.account.accountId;
    
    // Find agent by MongoDB _id and accountId
    const agent = await Agent.findOne({
      _id: agentId,
      accountId,
      deletedAt: null
    });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Generate new invitation token if expired
    if (!agent.invitationToken || new Date() > agent.invitationExpiresAt) {
      agent.invitationToken = crypto.randomBytes(32).toString('hex');
      agent.invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await agent.save();
    }
    
    // Get account name for email - use findOne with accountId string, not findById
    const account = await Account.findOne({ accountId }).select('organizationName businessName name');
    const accountName = account?.organizationName || account?.businessName || account?.name || 'Replysys';
    
    // Send invitation email
    try {
      await emailService.sendAgentInvitationEmail(
        agent.email,
        agent.name,
        agent.invitationToken,
        accountName
      );
      
      res.json({
        success: true,
        message: `Invitation email sent to ${agent.email}`
      });
    } catch (emailError) {
      console.error('⚠️  Email sending failed:', emailError.message);
      if (emailError.response?.data) {
        console.error('📧 Zepto error response:', emailError.response.data);
      }
      // Return success but indicate email wasn't sent
      res.json({
        success: true,
        message: `Email sending failed (${emailError.message}). Share the invitation link manually.`,
        emailFailed: true
      });
    }
  } catch (error) {
    console.error('❌ Resend invitation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * ACCEPT INVITATION & CREATE ACCOUNT
 * POST /api/agents/accept-invitation
 * Called by agent when they click invitation link
 */
export const acceptInvitation = async (req, res) => {
  try {
    const { invitationToken, email, password, name: providedName } = req.body;
    
    if (!invitationToken || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Find agent by token
    const agent = await Agent.findOne({
      invitationToken,
      email: email.toLowerCase(),
      deletedAt: null
    });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation link'
      });
    }
    
    // Check if invitation has expired
    if (agent.invitationExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invitation has expired. Please request a new one.'
      });
    }
    
    // Check if already accepted
    if (agent.accountCreated) {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been used'
      });
    }
    
    // Create User account for this agent
    const user = await User.create({
      email: email.toLowerCase(),
      name: providedName || agent.name,
      password: password, // Should be hashed in pre-save hook
      accountId: agent.accountId,
      role: agent.role,
      status: 'active'
    });
    
    // Update agent with user ID and mark as account created
    agent.userId = user._id;
    agent.accountCreated = true;
    agent.invitationAcceptedAt = new Date();
    agent.status = 'active';
    agent.invitationToken = null; // Clear token
    await agent.save();

    console.log('✅ Agent invitation accepted:', agent.agentId);

    // Generate JWT token for immediate login (optional - users can also login manually)
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/jwt.js');
    
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        accountId: user.accountId,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      agent: {
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        role: agent.role
      }
    });
  } catch (error) {
    console.error('❌ Accept invitation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * ASSIGN AGENT TO CONVERSATION
 * POST /api/agents/:agentId/assign
 */
export const assignConversation = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { conversationId } = req.body;
    const accountId = req.account.accountId;
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }
    
    const agent = await Agent.findOne({
      agentId,
      accountId,
      deletedAt: null,
      status: 'active'
    });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found or not active'
      });
    }
    
    // Check if agent is at capacity
    if (agent.currentActiveConversations >= agent.maxConcurrentConversations) {
      return res.status(400).json({
        success: false,
        message: `Agent has reached maximum conversations (${agent.maxConcurrentConversations})`
      });
    }
    
    // Add conversation to agent
    agent.assignedConversations.push({
      conversationId,
      assignedAt: new Date(),
      status: 'active'
    });
    agent.currentActiveConversations += 1;
    await agent.save();
    
    res.json({
      success: true,
      message: 'Conversation assigned successfully',
      agent: {
        agentId: agent.agentId,
        currentActiveConversations: agent.currentActiveConversations
      }
    });
  } catch (error) {
    console.error('❌ Assign conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * UNASSIGN AGENT FROM CONVERSATION
 * POST /api/agents/:agentId/unassign
 */
export const unassignConversation = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { conversationId } = req.body;
    const accountId = req.account.accountId;
    
    const agent = await Agent.findOne({
      agentId,
      accountId,
      deletedAt: null
    });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Find and remove the conversation assignment
    const assignmentIndex = agent.assignedConversations.findIndex(
      a => a.conversationId.toString() === conversationId
    );
    
    if (assignmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Conversation assignment not found'
      });
    }
    
    agent.assignedConversations[assignmentIndex].unassignedAt = new Date();
    agent.assignedConversations[assignmentIndex].status = 'resolved';
    agent.currentActiveConversations = Math.max(0, agent.currentActiveConversations - 1);
    await agent.save();
    
    res.json({
      success: true,
      message: 'Conversation unassigned successfully',
      agent: {
        agentId: agent.agentId,
        currentActiveConversations: agent.currentActiveConversations
      }
    });
  } catch (error) {
    console.error('❌ Unassign conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE AGENT (soft delete)
 * DELETE /api/agents/:agentId
 */
export const deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const accountId = req.account.accountId;
    
    const agent = await Agent.findOneAndUpdate(
      { agentId, accountId },
      {
        deletedAt: new Date(),
        status: 'inactive'
      },
      { new: true }
    );
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete agent error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  createAgent,
  getAgents,
  getAgent,
  updateAgent,
  resendInvitationEmail,
  acceptInvitation,
  assignConversation,
  unassignConversation,
  deleteAgent
};
