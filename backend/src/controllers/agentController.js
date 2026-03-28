import Agent from '../models/Agent.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
import { emailService } from '../services/emailService.js';
import crypto from 'crypto';
import { sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const createAgent = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const workspaceId = accountId;
    const { name, email, phone, role = 'agent', department, reportingTo } = req.body;
    
    if (!name || !email) {
      return sendValidationError(res, 'Name and email are required');
    }
    
    const existingAgent = await Agent.findOne({
      accountId,
      email: email.toLowerCase(),
      deletedAt: null
    });
    
    if (existingAgent) {
      return sendValidationError(res, 'Agent with this email already exists');
    }
    
    const validRoles = ['agent', 'team-lead', 'supervisor', 'manager'];
    if (!validRoles.includes(role)) {
      return sendValidationError(res, 'Invalid role specified');
    }
    
    const agentId = `AGT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const initialStatus = (req.user?.role === 'superadmin' || req.user?.role === 'admin') ? 'active' : 'inactive';
    
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
    
    logger.info('✅ Agent created:', agent.agentId);
    
    const invitationUrl = `${process.env.FRONTEND_URL}/auth/agent-invitation?token=${invitationToken}`;
    logger.info('\n📧 INVITATION LINK (for testing):', invitationUrl);
    
    const account = await Account.findById(accountId).select('organizationName businessName name');
    const accountName = account?.organizationName || account?.businessName || account?.name || 'Replysys';
    
    try {
      await emailService.sendAgentInvitationEmail(email, name, invitationToken, accountName);
    } catch (emailError) {
      logger.error('⚠️ Email sending failed:', emailError.message);
    }
    
    return res.json({
      success: true,
      invitationUrl,
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
    return handleControllerError(res, error, 'createAgent');
  }
};

export const getAgents = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { status, role, search } = req.query;
    
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
    
    return res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    return handleControllerError(res, error, 'getAgents');
  }
};

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
      return sendNotFound(res, 'Agent not found');
    }
    
    return res.json({
      success: true,
      agent
    });
  } catch (error) {
    return handleControllerError(res, error, 'getAgent');
  }
};

export const updateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const accountId = req.account.accountId;
    const updates = req.body;
    
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
      return sendNotFound(res, 'Agent not found');
    }
    
    return res.json({
      success: true,
      agent
    });
  } catch (error) {
    return handleControllerError(res, error, 'updateAgent');
  }
};

export const resendInvitationEmail = async (req, res) => {
  try {
    const { agentId } = req.params;
    const accountId = req.account.accountId;
    
    const agent = await Agent.findOne({
      _id: agentId,
      accountId,
      deletedAt: null
    });
    
    if (!agent) {
      return sendNotFound(res, 'Agent not found');
    }
    
    if (!agent.invitationToken || new Date() > agent.invitationExpiresAt) {
      agent.invitationToken = crypto.randomBytes(32).toString('hex');
      agent.invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await agent.save();
    }
    
    const account = await Account.findOne({ accountId }).select('organizationName businessName name');
    const accountName = account?.organizationName || account?.businessName || account?.name || 'Replysys';
    
    try {
      await emailService.sendAgentInvitationEmail(
        agent.email,
        agent.name,
        agent.invitationToken,
        accountName
      );
      
      return res.json({
        success: true,
        message: 'Invitation email sent'
      });
    } catch (emailError) {
      logger.error('⚠️ Email sending failed:', emailError.message);
      return res.json({
        success: true,
        emailFailed: true,
        message: 'Invitation link generated but email failed to send'
      });
    }
  } catch (error) {
    return handleControllerError(res, error, 'resendInvitationEmail');
  }
};

export const acceptInvitation = async (req, res) => {
  try {
    const { invitationToken, email, password, name: providedName } = req.body;
    
    if (!invitationToken || !email || !password) {
      return sendValidationError(res, 'Missing required fields');
    }
    
    const agent = await Agent.findOne({
      invitationToken,
      email: email.toLowerCase(),
      deletedAt: null
    });
    
    if (!agent) {
      return sendNotFound(res, 'Invalid invitation link');
    }
    
    if (agent.invitationExpiresAt < new Date()) {
      return sendValidationError(res, 'Invitation has expired. Please request a new one.');
    }
    
    if (agent.accountCreated) {
      return sendValidationError(res, 'This invitation has already been used');
    }
    
    const user = await User.create({
      email: email.toLowerCase(),
      name: providedName || agent.name,
      password: password,
      accountId: agent.accountId,
      role: agent.role,
      status: 'active'
    });
    
    agent.userId = user._id;
    agent.accountCreated = true;
    agent.invitationAcceptedAt = new Date();
    agent.status = 'active';
    agent.invitationToken = null;
    await agent.save();

    logger.info('✅ Agent invitation accepted:', agent.agentId);

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

    return res.json({
      success: true,
      token,
      agent: {
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        role: agent.role
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'acceptInvitation');
  }
};

export const assignConversation = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { conversationId } = req.body;
    const accountId = req.account.accountId;
    
    if (!conversationId) {
      return sendValidationError(res, 'Conversation ID is required');
    }
    
    const agent = await Agent.findOne({
      agentId,
      accountId,
      deletedAt: null,
      status: 'active'
    });
    
    if (!agent) {
      return sendNotFound(res, 'Agent not found or not active');
    }
    
    if (agent.currentActiveConversations >= agent.maxConcurrentConversations) {
      return sendValidationError(res, `Agent has reached maximum conversations (${agent.maxConcurrentConversations})`);
    }
    
    agent.assignedConversations.push({
      conversationId,
      assignedAt: new Date(),
      status: 'active'
    });
    agent.currentActiveConversations += 1;
    await agent.save();
    
    return res.json({
      success: true,
      agent: {
        agentId: agent.agentId,
        currentActiveConversations: agent.currentActiveConversations
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'assignConversation');
  }
};

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
      return sendNotFound(res, 'Agent not found');
    }
    
    const assignmentIndex = agent.assignedConversations.findIndex(
      a => a.conversationId.toString() === conversationId
    );
    
    if (assignmentIndex === -1) {
      return sendNotFound(res, 'Conversation assignment not found');
    }
    
    agent.assignedConversations[assignmentIndex].unassignedAt = new Date();
    agent.assignedConversations[assignmentIndex].status = 'resolved';
    agent.currentActiveConversations = Math.max(0, agent.currentActiveConversations - 1);
    await agent.save();
    
    return res.json({
      success: true,
      agent: {
        agentId: agent.agentId,
        currentActiveConversations: agent.currentActiveConversations
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'unassignConversation');
  }
};

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
      return sendNotFound(res, 'Agent not found');
    }
    
    return res.json({
      success: true,
      message: 'Agent deleted'
    });
  } catch (error) {
    return handleControllerError(res, error, 'deleteAgent');
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
