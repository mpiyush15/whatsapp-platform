import Lead from '../models/Lead.js';
import ChatbotLead from '../models/ChatbotLead.js';
import KeywordRule from '../models/KeywordRule.js';
import WorkflowSession from '../models/WorkflowSession.js';
import leadService from '../services/leadService.js';
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';

function accountIdFromReq(req) {
  return req.account?.accountId || req.user?.accountId || req.accountId;
}

function getProjectId(req) {
  return req.query?.projectId || req.body?.projectId || null;
}

function responseObject(value) {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}

function getResponseValue(responses, keys = []) {
  for (const key of keys) {
    const value = responses?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeChatbotLead(lead, botById = new Map()) {
  const responses = responseObject(lead.responses);
  const chatbotId = String(lead.chatbotId || '');
  const chatbot = botById.get(chatbotId);
  const name =
    getResponseValue(responses, ['name', 'fullName', 'customerName']) ||
    lead.customerName ||
    lead.customerPhone;
  const email = getResponseValue(responses, ['email', 'emailAddress']);
  const replyCount = Object.keys(responses || {}).length;

  return {
    _id: String(lead._id),
    accountId: lead.accountId,
    projectId: lead.projectId || null,
    name,
    email,
    phone: lead.customerPhone,
    company: '',
    intent: 'chatbot_workflow',
    keywords: chatbot?.keywords || [],
    messageCount: replyCount,
    status: lead.status === 'rejected' ? 'lost' : lead.status,
    score: Math.min(100, 50 + Math.min(40, replyCount * 10)),
    source: 'chatbot',
    chatbotId,
    chatbotName: chatbot?.name || 'Chatbot',
    responses,
    workflowSessionId: lead.workflowSessionId || null,
    notes: lead.notes || '',
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

async function getChatbotLeadRows(accountId, filters = {}) {
  const query = { accountId };

  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status === 'lost' ? { $in: ['lost', 'rejected'] } : filters.status;
  }

  const savedLeads = await ChatbotLead.find(query).sort({ createdAt: -1 }).lean();
  const savedSessionIds = new Set(
    savedLeads
      .map((lead) => String(lead.workflowSessionId || ''))
      .filter(Boolean)
  );

  const sessions = await WorkflowSession.find({
    accountId,
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    responses: { $exists: true },
  }).sort({ updatedAt: -1 }).lean();

  const sessionLeadDocs = await Promise.all(
    sessions
      .filter((session) => !savedSessionIds.has(String(session._id)))
      .map(async (session) => {
        const responses = responseObject(session.responses);
        if (Object.keys(responses).length === 0) return null;

        const customerName =
          responses.name ||
          responses.fullName ||
          responses.customerName ||
          undefined;

        return ChatbotLead.findOneAndUpdate(
          {
            workflowSessionId: String(session._id),
            accountId,
          },
          {
            $set: {
              chatbotId: session.ruleId,
              accountId,
              projectId: session.projectId || null,
              phoneNumberId: session.phoneNumberId,
              customerPhone: session.contactPhone,
              ...(customerName ? { customerName } : {}),
              responses,
              workflowSessionId: String(session._id),
              status: session.status === 'completed' ? 'new' : 'contacted',
              updatedAt: session.updatedAt || session.lastActivityAt || new Date(),
            },
            $setOnInsert: {
              createdAt: session.createdAt || session.startedAt || new Date(),
            },
          },
          { new: true, upsert: true, lean: true }
        );
      })
  );

  const chatbotLeads = [
    ...savedLeads,
    ...sessionLeadDocs.filter(Boolean),
  ];
  if (chatbotLeads.length === 0) return [];

  const chatbotIds = [...new Set(chatbotLeads.map((lead) => String(lead.chatbotId)).filter(Boolean))];
  const chatbots = await KeywordRule.find({
    accountId,
    _id: { $in: chatbotIds },
  }).select('name keywords').lean();
  const botById = new Map(chatbots.map((bot) => [String(bot._id), bot]));

  let rows = chatbotLeads.map((lead) => normalizeChatbotLead(lead, botById));

  if (filters.status && filters.status !== 'all') {
    rows = rows.filter((lead) => lead.status === filters.status);
  }

  if (filters.search) {
    const search = String(filters.search).toLowerCase();
    rows = rows.filter((lead) => {
      const haystack = [
        lead.name,
        lead.email,
        lead.phone,
        lead.chatbotName,
        ...Object.values(lead.responses || {}).map((value) => String(value)),
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  return rows;
}

function buildStats(leads = []) {
  const stats = {
    total: leads.length,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    stale: 0,
    averageScore: 0,
  };

  let scoreTotal = 0;
  leads.forEach((lead) => {
    if (Object.prototype.hasOwnProperty.call(stats, lead.status)) {
      stats[lead.status] += 1;
    }
    scoreTotal += Number(lead.score || 0);
  });

  stats.averageScore = leads.length > 0 ? Math.round(scoreTotal / leads.length) : 0;
  return stats;
}

export const getLeads = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    if (!accountId) {
      return sendValidationError(res, 'Account context required');
    }

    const filters = {
      status: req.query.status,
      intent: req.query.intent,
      minScore: req.query.minScore,
      search: req.query.search,
      projectId: getProjectId(req),
    };
    const [crmLeads, chatbotLeads] = await Promise.all([
      leadService.getLeads(accountId, filters),
      getChatbotLeadRows(accountId, filters),
    ]);
    const leads = [...crmLeads.map((lead) => ({ ...lead, source: lead.source || 'crm' })), ...chatbotLeads]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const stats = buildStats(leads);

    return res.status(200).json({
      success: true,
      data: { leads, stats },
      leads,
      stats,
      message: 'Leads retrieved',
    });
  } catch (error) {
    return handleControllerError(res, error, 'getLeads');
  }
};

export const getLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const lead = await Lead.findOne({ _id: req.params.id, accountId });
    if (lead) {
      return res.status(200).json({
        success: true,
        data: lead,
        lead,
        message: 'Lead retrieved',
      });
    }

    const chatbotLead = await ChatbotLead.findOne({ _id: req.params.id, accountId }).lean();
    if (!chatbotLead) return sendNotFound(res, 'Lead not found');

    const chatbots = await KeywordRule.find({
      accountId,
      _id: String(chatbotLead.chatbotId),
    }).select('name keywords').lean();
    const botById = new Map(chatbots.map((bot) => [String(bot._id), bot]));
    const normalizedLead = normalizeChatbotLead(chatbotLead, botById);

    return res.status(200).json({
      success: true,
      data: normalizedLead,
      lead: normalizedLead,
      message: 'Lead retrieved',
    });
  } catch (error) {
    return handleControllerError(res, error, 'getLead');
  }
};

export const createLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const { name, email, phone, company, intent } = req.body;
    if (!name) return sendValidationError(res, 'Name is required');

    const lead = await Lead.create({
      accountId,
      conversationId: `manual_${Date.now()}`,
      contactId: req.body.contactId || accountId,
      phoneNumberId: req.body.phoneNumberId || 'manual',
      name,
      email,
      phone,
      company,
      intent: intent || 'inquiry',
      status: 'new',
      score: 0,
    });

    return sendSuccess(res, lead, 'Lead created', 201);
  } catch (error) {
    return handleControllerError(res, error, 'createLead');
  }
};

export const updateLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, accountId },
      { $set: { ...req.body, updatedAt: new Date() } },
      { new: true }
    );
    if (!lead) {
      const chatbotStatusMap = {
        new: 'new',
        contacted: 'contacted',
        converted: 'converted',
        lost: 'rejected',
      };
      const update = {};
      if (req.body.status && chatbotStatusMap[req.body.status]) {
        update.status = chatbotStatusMap[req.body.status];
      }
      if (req.body.notes !== undefined) {
        update.notes = String(req.body.notes || '').trim();
      }

      const chatbotLead = await ChatbotLead.findOneAndUpdate(
        { _id: req.params.id, accountId },
        { $set: { ...update, updatedAt: new Date() } },
        { new: true }
      );

      if (!chatbotLead) return sendNotFound(res, 'Lead not found');
      return sendSuccess(res, normalizeChatbotLead(chatbotLead), 'Lead updated');
    }

    return sendSuccess(res, lead, 'Lead updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateLead');
  }
};

export const deleteLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, accountId });
    if (!lead) return sendNotFound(res, 'Lead not found');
    return sendSuccess(res, { deleted: true }, 'Lead deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteLead');
  }
};

export const getLeadStats = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const stats = await leadService.getLeadStats(accountId);
    return sendSuccess(res, { stats }, 'Lead stats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getLeadStats');
  }
};

export const markStaleLeads = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const count = await leadService.markStaleLeads(accountId);
    return sendSuccess(res, { markedStale: count }, 'Stale leads marked');
  } catch (error) {
    return handleControllerError(res, error, 'markStaleLeads');
  }
};

export const autoCaptureLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const lead = await leadService.captureLeadFromConversation(
      accountId,
      req.params.conversationId
    );
    return sendSuccess(res, lead, 'Lead auto-captured');
  } catch (error) {
    return handleControllerError(res, error, 'autoCaptureLead');
  }
};

export const exportLeads = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const filters = { ...req.query, projectId: getProjectId(req) };
    const [crmLeads, chatbotLeads] = await Promise.all([
      leadService.getLeads(accountId, filters),
      getChatbotLeadRows(accountId, filters),
    ]);
    const leads = [...crmLeads.map((lead) => ({ ...lead, source: lead.source || 'crm' })), ...chatbotLeads]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const header = 'name,email,phone,status,intent,score,source,chatbot,responses,accountId,createdAt\n';
    const rows = leads
      .map(
        (l) =>
          `"${l.name}","${l.email || ''}","${l.phone || ''}","${l.status}","${l.intent}",${l.score || 0},"${l.source || 'crm'}","${l.chatbotName || ''}","${JSON.stringify(l.responses || {}).replace(/"/g, '""')}","${l.accountId}","${l.createdAt}"`
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    return res.send(header + rows);
  } catch (error) {
    return handleControllerError(res, error, 'exportLeads');
  }
};

export default {
  createLead,
  getLead,
  updateLead,
  getLeads,
  deleteLead,
  autoCaptureLead,
  getLeadStats,
  markStaleLeads,
  exportLeads,
};
