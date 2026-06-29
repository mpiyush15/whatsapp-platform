import Agent from '../models/Agent.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
import { emailService } from '../services/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middlewares/jwtAuth.js';
import { sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const generateSixDigitPassword = () => crypto.randomInt(100000, 1000000).toString();

const getPrimaryFrontendUrl = () => {
  const raw = (process.env.FRONTEND_URL || '').trim();
  if (!raw) return 'http://localhost:3000';
  const urls = raw.split(',').map((url) => url.trim()).filter(Boolean);
  const publicUrl = urls.find((url) => /^https:\/\//i.test(url));
  return (publicUrl || urls[0] || 'http://localhost:3000').replace(/\/$/, '');
};

const buildAgentLoginUrl = (projectId) => {
  const frontendUrl = getPrimaryFrontendUrl();
  const nextPath = projectId
    ? `/projects/${encodeURIComponent(projectId)}/live-chat-v2`
    : '/dashboard';
  return `${frontendUrl}/auth/login?next=${encodeURIComponent(nextPath)}`;
};

const mapAgentRoleToUserRole = (role) => (role === 'manager' ? 'manager' : 'agent');

export const createAgent = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const workspaceId = accountId;
    const { name, email, phone, role = 'agent', department, reportingTo } = req.body;
    const projectId = req.body.projectId || req.query.projectId || null;
    const normalizedEmail = normalizeEmail(email);
    
    if (!name || !normalizedEmail) {
      return sendValidationError(res, 'Name and email are required');
    }
    
    const existingAgent = await Agent.findOne({
      accountId,
      email: normalizedEmail,
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
    const temporaryPassword = generateSixDigitPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const loginUrl = buildAgentLoginUrl(projectId);
    const userRole = mapAgentRoleToUserRole(role);

    let existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && String(existingUser.accountId || '') !== String(accountId)) {
      return sendValidationError(res, 'This email is already used in another workspace');
    }

    if (existingUser && !['agent', 'user', 'manager'].includes(existingUser.role)) {
      return sendValidationError(res, 'This email belongs to an admin user. Use another email for an agent login.');
    }

    let user = existingUser;
    if (user) {
      user.name = name.trim();
      user.phone = phone || user.phone;
      user.password = passwordHash;
      user.role = userRole;
      user.status = 'active';
      await user.save();
    } else {
      user = await User.create({
        email: normalizedEmail,
        name: name.trim(),
        phone,
        password: passwordHash,
        accountId,
        role: userRole,
        status: 'active'
      });
    }
    
    const agent = await Agent.create({
      agentId,
      accountId,
      projectId,
      workspaceId,
      name: name.trim(),
      email: normalizedEmail,
      phone,
      role,
      department,
      reportingTo: reportingTo || null,
      userId: user._id,
      accountCreated: true,
      invitationAcceptedAt: new Date(),
      invitationSentAt: new Date(),
      invitationExpiresAt: null,
      status: 'active'
    });
    
    logger.info('✅ Agent created:', agent.agentId);
    
    logger.info('\n📧 AGENT LOGIN URL:', loginUrl);
    
    const account = await Account.findOne({ accountId }).select('organizationName businessName name');
    const accountName = account?.organizationName || account?.businessName || account?.name || 'Replysys';
    let emailResult = { success: false, skipped: false };
    
    try {
      emailResult = await emailService.sendAgentLoginEmail({
        to: normalizedEmail,
        name,
        accountName,
        loginUrl,
        temporaryPassword,
        projectId
      });
    } catch (emailError) {
      logger.error('⚠️ Email sending failed:', emailError.message);
      emailResult = { success: false, error: emailError.message };
    }
    
    return res.json({
      success: true,
      loginUrl,
      emailSent: Boolean(emailResult?.success && !emailResult?.skipped),
      emailSkipped: Boolean(emailResult?.skipped),
      emailError: emailResult?.error || null,
      temporaryPassword,
      agent: {
        _id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        projectId: agent.projectId,
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
    const { status, role, search, projectId } = req.query;
    
    const query = {
      accountId,
      deletedAt: null
    };
    
    if (status) query.status = status;
    if (role) query.role = role;
    if (projectId) query.projectId = projectId;
    
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
      $or: [{ _id: agentId }, { agentId }],
      accountId,
      deletedAt: null
    });
    
    if (!agent) {
      return sendNotFound(res, 'Agent not found');
    }
    
    const temporaryPassword = generateSixDigitPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const userRole = mapAgentRoleToUserRole(agent.role);
    const loginUrl = buildAgentLoginUrl(agent.projectId);
    let user = agent.userId ? await User.findById(agent.userId) : null;

    if (!user) {
      user = await User.findOne({ email: normalizeEmail(agent.email), accountId });
    }

    if (user) {
      user.password = passwordHash;
      user.name = agent.name;
      user.phone = agent.phone || user.phone;
      user.role = userRole;
      user.status = 'active';
      await user.save();
    } else {
      user = await User.create({
        email: normalizeEmail(agent.email),
        name: agent.name,
        phone: agent.phone,
        password: passwordHash,
        accountId,
        role: userRole,
        status: 'active'
      });
    }

    agent.userId = user._id;
    agent.accountCreated = true;
    agent.status = 'active';
    agent.invitationToken = null;
    agent.invitationExpiresAt = null;
    agent.invitationSentAt = new Date();
    await agent.save();
    
    const account = await Account.findOne({ accountId }).select('organizationName businessName name');
    const accountName = account?.organizationName || account?.businessName || account?.name || 'Replysys';
    
    try {
      const emailResult = await emailService.sendAgentLoginEmail({
        to: agent.email,
        name: agent.name,
        accountName,
        loginUrl,
        temporaryPassword,
        projectId: agent.projectId
      });
      
      return res.json({
        success: true,
        emailSent: Boolean(emailResult?.success && !emailResult?.skipped),
        emailSkipped: Boolean(emailResult?.skipped),
        temporaryPassword,
        loginUrl,
        message: emailResult?.skipped ? 'Login details generated. Email is disabled.' : 'Agent login details sent'
      });
    } catch (emailError) {
      logger.error('⚠️ Email sending failed:', emailError.message);
      return res.json({
        success: true,
        emailFailed: true,
        temporaryPassword,
        loginUrl,
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
      password: await bcrypt.hash(password, 10),
      accountId: agent.accountId,
      role: mapAgentRoleToUserRole(agent.role),
      status: 'active'
    });
    
    agent.userId = user._id;
    agent.accountCreated = true;
    agent.invitationAcceptedAt = new Date();
    agent.status = 'active';
    agent.invitationToken = null;
    await agent.save();

    logger.info('✅ Agent invitation accepted:', agent.agentId);

    const token = generateToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      accountId: user.accountId,
      role: user.role,
      type: 'client',
      agentId: agent.agentId,
      agentMongoId: String(agent._id),
      agentProjectId: agent.projectId || null
    });

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
