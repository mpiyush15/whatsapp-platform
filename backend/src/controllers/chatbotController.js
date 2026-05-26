import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import KeywordRule from '../models/KeywordRule.js';
import ChatbotLead from '../models/ChatbotLead.js';
import WorkflowSession from '../models/WorkflowSession.js';
import Contact from '../models/Contact.js';
import Message from '../models/Message.js';
import { ContactType } from '../constants/enums.js';
import { compileFlowGraph } from '../services/chatbotFlowCompiler.js';

const VALID_MATCH_TYPES = new Set(['exact', 'contains', 'starts_with']);
const VALID_REPLY_TYPES = new Set(['text', 'template', 'workflow']);
const VALID_LEAD_STATUSES = new Set(['new', 'contacted', 'converted', 'rejected']);

const getAccountId = (req) => req.account?.accountId || req.user?.accountId || null;
const getProjectId = (req) => req.query?.projectId || req.body?.projectId || null;
const getChatbotId = (req) => req.params?.chatbotId || req.params?.id || null;

const normalizeString = (value) => String(value || '').trim();
const normalizeArray = (value) => Array.isArray(value) ? value : [];
const normalizeResponseObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
};

const parseKeywords = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean);
  }

  return normalizeString(value)
    .split(',')
    .map((item) => normalizeString(item))
    .filter(Boolean);
};

const serializeRule = (rule) => ({
  _id: String(rule._id),
  accountId: rule.accountId,
  projectId: rule.projectId || null,
  phoneNumberId: rule.phoneNumberId || null,
  name: rule.name,
  description: rule.description || '',
  keywords: normalizeArray(rule.keywords),
  matchType: rule.matchType,
  replyType: rule.replyType,
  replyContent: {
    text: rule.replyContent?.text || '',
    templateName: rule.replyContent?.templateName || '',
    templateParams: normalizeArray(rule.replyContent?.templateParams),
    workflow: normalizeArray(rule.replyContent?.workflow),
    flowGraph: rule.replyContent?.flowGraph || null,
  },
  timeoutMinutes: Number(rule.timeoutMinutes || 1),
  isActive: rule.isActive !== false,
  triggerCount: Number(rule.triggerCount || 0),
  successRate: Number(rule.successRate || 0),
  lastTriggeredAt: rule.lastTriggeredAt || null,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const calculateStats = (rules = []) => {
  const totalBots = rules.length;
  const activeBots = rules.filter((rule) => rule.isActive !== false).length;
  const totalInteractions = rules.reduce((sum, rule) => sum + Number(rule.triggerCount || 0), 0);
  const avgSuccessRate = totalBots > 0
    ? Number((rules.reduce((sum, rule) => sum + Number(rule.successRate || 0), 0) / totalBots).toFixed(1))
    : 0;
  const automationRate = totalBots > 0
    ? Number(((activeBots / totalBots) * 100).toFixed(1))
    : 0;

  return {
    totalBots,
    activeBots,
    totalInteractions,
    avgSuccessRate,
    automationRate,
  };
};

const buildRulePayload = (req, { partial = false } = {}) => {
  const name = normalizeString(req.body?.name);
  const description = normalizeString(req.body?.description);
  const keywords = parseKeywords(req.body?.keywords);
  const matchType = normalizeString(req.body?.matchType || 'contains').toLowerCase();
  const replyType = normalizeString(req.body?.replyType || 'text').toLowerCase();
  const timeoutMinutes = Number(req.body?.timeoutMinutes || 1);
  const phoneNumberId = normalizeString(req.body?.phoneNumberId) || null;
  const projectId = getProjectId(req);
  const rawReplyContent = req.body?.replyContent || {};

  if ((!partial || 'name' in (req.body || {})) && !name) {
    return { error: 'Chatbot name required' };
  }

  if ((!partial || 'keywords' in (req.body || {})) && keywords.length === 0) {
    return { error: 'At least one keyword required' };
  }

  if ((!partial || 'matchType' in (req.body || {})) && !VALID_MATCH_TYPES.has(matchType)) {
    return { error: 'Invalid match type' };
  }

  if ((!partial || 'replyType' in (req.body || {})) && !VALID_REPLY_TYPES.has(replyType)) {
    return { error: 'Invalid reply type' };
  }

  const nextReplyType = partial && !('replyType' in (req.body || {})) ? null : replyType;
  const replyContent = {};

  if (nextReplyType === 'text') {
    const text = normalizeString(rawReplyContent?.text || req.body?.replyText);
    if (!partial && !text) {
      return { error: 'Reply message required' };
    }
    if (text) replyContent.text = text;
  }

  if (nextReplyType === 'template') {
    const templateName = normalizeString(rawReplyContent?.templateName || req.body?.templateName);
    const templateParams = normalizeArray(rawReplyContent?.templateParams || req.body?.templateParams)
      .map((param) => normalizeString(param))
      .filter(Boolean);

    if (!partial && !templateName) {
      return { error: 'Template name required' };
    }

    if (templateName) replyContent.templateName = templateName;
    if (templateParams.length > 0) replyContent.templateParams = templateParams;
  }

  if (nextReplyType === 'workflow') {
    const flowGraph = rawReplyContent?.flowGraph || req.body?.flowGraph || null;
    const rawWorkflow = normalizeArray(rawReplyContent?.workflow || req.body?.workflow);
    const workflow = flowGraph ? compileFlowGraph(flowGraph) : rawWorkflow;

    // Only require steps when no visual flowGraph is provided (flowGraph is the source of truth)
    if (!partial && !flowGraph && workflow.length === 0) {
      return { error: 'Workflow requires at least one valid step' };
    }

    if (flowGraph) replyContent.flowGraph = flowGraph;
    if (workflow.length > 0) replyContent.workflow = workflow;
  }

  const payload = {
    ...(name ? { name } : {}),
    ...(description || (!partial && 'description' in (req.body || {})) ? { description } : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
    ...(VALID_MATCH_TYPES.has(matchType) ? { matchType } : {}),
    ...(nextReplyType ? { replyType: nextReplyType } : {}),
    ...(Object.keys(replyContent).length > 0 ? { replyContent } : {}),
    ...(Number.isFinite(timeoutMinutes) ? { timeoutMinutes: Math.max(1, Math.min(60, timeoutMinutes)) } : {}),
    ...(phoneNumberId !== null || (!partial && 'phoneNumberId' in (req.body || {})) ? { phoneNumberId } : {}),
    ...(projectId !== null ? { projectId } : {}),
  };

  if ('isActive' in (req.body || {})) {
    payload.isActive = Boolean(req.body.isActive);
  }

  return { payload };
};

const findRuleOr404 = async (req) => {
  const accountId = getAccountId(req);
  const chatbotId = getChatbotId(req);
  const projectId = getProjectId(req);

  if (!chatbotId) return null;

  return KeywordRule.findOne({
    _id: chatbotId,
    accountId,
    ...(projectId ? { projectId } : {}),
  });
};

export const createChatbot = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return sendValidationError(res, 'Account context required');
    }

    const { payload, error } = buildRulePayload(req);
    if (error) {
      return sendValidationError(res, error);
    }

    const rule = await KeywordRule.create({
      accountId,
      description: '',
      isActive: true,
      successRate: 0,
      ...payload,
    });

    logger.info('✅ Chatbot created', { chatbotId: String(rule._id), accountId, projectId: rule.projectId || null });
    return sendSuccess(res, serializeRule(rule), 'Chatbot created', 201);
  } catch (error) {
    return handleControllerError(res, error, 'createChatbot');
  }
};

export const getChatbot = async (req, res) => {
  try {
    const rule = await findRuleOr404(req);
    if (!rule) {
      return sendNotFound(res, 'Chatbot');
    }

    return sendSuccess(res, serializeRule(rule), 'Chatbot retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getChatbot');
  }
};

export const listChatbots = async (req, res) => {
  return getChatbots(req, res);
};

export const getChatbots = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    const projectId = getProjectId(req);

    if (!accountId) {
      return sendValidationError(res, 'Account context required');
    }

    const rules = await KeywordRule.find({
      accountId,
      ...(projectId ? { projectId } : {}),
    }).sort({ updatedAt: -1, createdAt: -1 });

    const bots = rules.map(serializeRule);
    const stats = calculateStats(bots);

    return res.status(200).json({
      success: true,
      data: { bots, stats },
      bots,
      stats,
      message: 'Chatbots retrieved',
    });
  } catch (error) {
    return handleControllerError(res, error, 'getChatbots');
  }
};

export const updateChatbot = async (req, res) => {
  try {
    const rule = await findRuleOr404(req);
    if (!rule) {
      return sendNotFound(res, 'Chatbot');
    }

    const { payload, error } = buildRulePayload(req, { partial: true });
    if (error) {
      return sendValidationError(res, error);
    }

    Object.assign(rule, payload);
    await rule.save();

    logger.info('✅ Chatbot updated', { chatbotId: String(rule._id), accountId: rule.accountId });
    return sendSuccess(res, serializeRule(rule), 'Chatbot updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateChatbot');
  }
};

export const toggleChatbot = async (req, res) => {
  try {
    const rule = await findRuleOr404(req);
    if (!rule) {
      return sendNotFound(res, 'Chatbot');
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    return sendSuccess(res, serializeRule(rule), 'Chatbot toggled');
  } catch (error) {
    return handleControllerError(res, error, 'toggleChatbot');
  }
};

export const deleteChatbot = async (req, res) => {
  try {
    const rule = await findRuleOr404(req);
    if (!rule) {
      return sendNotFound(res, 'Chatbot');
    }

    await Promise.all([
      KeywordRule.deleteOne({ _id: rule._id }),
      ChatbotLead.deleteMany({ chatbotId: String(rule._id), accountId: rule.accountId }),
    ]);

    return sendSuccess(res, { chatbotId: String(rule._id) }, 'Chatbot deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteChatbot');
  }
};

export const getChatbotInteractions = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    const chatbotId = getChatbotId(req);

    const interactions = await Message.find({
      accountId,
      'metadata.ruleId': String(chatbotId),
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('recipientPhone senderPhone direction messageType status content.text content.caption createdAt metadata');

    return sendSuccess(res, interactions, 'Interactions retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getChatbotInteractions');
  }
};

export const getChatbotLeads = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    const chatbotId = req.params?.chatbotId;
    const projectId = getProjectId(req);

    const savedLeads = await ChatbotLead.find({
      chatbotId: String(chatbotId),
      accountId,
      ...(projectId ? { projectId } : {}),
    }).sort({ createdAt: -1 });

    const savedSessionIds = new Set(
      savedLeads
        .map((lead) => String(lead.workflowSessionId || ''))
        .filter(Boolean)
    );
    const sessions = await WorkflowSession.find({
      ruleId: String(chatbotId),
      accountId,
      ...(projectId ? { projectId } : {}),
      responses: { $exists: true },
    }).sort({ updatedAt: -1 }).lean();

    const sessionLeads = sessions
      .filter((session) => !savedSessionIds.has(String(session._id)))
      .map((session) => {
        const responses = normalizeResponseObject(session.responses);
        if (Object.keys(responses).length === 0) return null;

        return {
          _id: `session_${session._id}`,
          chatbotId: String(chatbotId),
          accountId,
          projectId: session.projectId || null,
          phoneNumberId: session.phoneNumberId,
          customerPhone: session.contactPhone,
          customerName: responses.name || responses.fullName || responses.customerName || '',
          responses,
          workflowSessionId: String(session._id),
          status: session.status === 'completed' ? 'new' : 'contacted',
          notes: session.status === 'active' ? 'Workflow still in progress' : '',
          createdAt: session.createdAt || session.startedAt,
          updatedAt: session.updatedAt || session.lastActivityAt,
          isSessionOnly: true,
        };
      })
      .filter(Boolean);

    const leads = [...savedLeads, ...sessionLeads]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return sendSuccess(res, leads, 'Chatbot leads retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getChatbotLeads');
  }
};

export const updateLead = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    const { leadId } = req.params;
    const { status, notes } = req.body || {};

    const lead = await ChatbotLead.findOne({ _id: leadId, accountId });
    if (!lead) {
      return sendNotFound(res, 'Lead');
    }

    if (status) {
      const normalizedStatus = normalizeString(status).toLowerCase();
      if (!VALID_LEAD_STATUSES.has(normalizedStatus)) {
        return sendValidationError(res, 'Invalid lead status');
      }
      lead.status = normalizedStatus;
    }

    if (notes !== undefined) {
      lead.notes = normalizeString(notes);
    }

    await lead.save();
    return sendSuccess(res, lead, 'Lead updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateLead');
  }
};

export const convertLeadToClient = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    const { leadId } = req.params;
    const actorId = req.user?.id || req.user?._id || null;

    const lead = await ChatbotLead.findOne({ _id: leadId, accountId });
    if (!lead) {
      return sendNotFound(res, 'Lead');
    }

    const responses = lead.responses || {};
    const customerName = normalizeString(responses.name || responses.fullName || responses.customerName || lead.customerName || lead.customerPhone);
    const email = normalizeString(responses.email);

    const contact = await Contact.findOneAndUpdate(
      { accountId, whatsappNumber: lead.customerPhone },
      {
        $set: {
          projectId: lead.projectId || null,
          name: customerName,
          phone: lead.customerPhone,
          whatsappNumber: lead.customerPhone,
          ...(email ? { email } : {}),
          source: 'Chatbot Workflow',
          type: ContactType.CUSTOMER,
          isOptedIn: true,
          optInDate: new Date(),
          metadata: {
            chatbotLeadId: String(lead._id),
            responses,
          },
          notes: lead.notes || '',
          lastContactedAt: new Date(),
        },
        $setOnInsert: {
          firstContactAt: new Date(),
          messageCount: 0,
          conversationCount: 0,
        },
      },
      { new: true, upsert: true }
    );

    lead.status = 'converted';
    lead.convertedAt = new Date();
    lead.convertedBy = actorId ? String(actorId) : undefined;
    lead.convertedContactId = String(contact._id);
    await lead.save();

    logger.info('✅ Lead converted to contact', { leadId, contactId: String(contact._id), accountId });
    return sendSuccess(res, { lead, contact }, 'Lead converted to client');
  } catch (error) {
    return handleControllerError(res, error, 'convertLeadToClient');
  }
};

export const deleteLead = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    const { leadId } = req.params;

    const deleted = await ChatbotLead.findOneAndDelete({ _id: leadId, accountId });
    if (!deleted) {
      return sendNotFound(res, 'Lead');
    }

    return sendSuccess(res, { leadId }, 'Lead deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteLead');
  }
};

export default {
  createChatbot,
  getChatbot,
  listChatbots,
  getChatbots,
  updateChatbot,
  toggleChatbot,
  deleteChatbot,
  getChatbotInteractions,
  getChatbotLeads,
  updateLead,
  convertLeadToClient,
  deleteLead,
};
