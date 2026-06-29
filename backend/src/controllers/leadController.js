import Lead from '../models/Lead.js';
import ChatbotLead from '../models/ChatbotLead.js';
import KeywordRule from '../models/KeywordRule.js';
import WorkflowSession from '../models/WorkflowSession.js';
import Contact from '../models/Contact.js';
import Conversation from '../models/Conversation.js';
import leadService from '../services/leadService.js';
import { upsertEducationEnquiry } from '../services/educationEnquirySyncService.js';
import { normalizeTags, syncTagsForPhone } from '../services/leadTagSyncService.js';
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

function buildWorkflowOptionTitleMap(chatbot) {
  const map = new Map();
  const workflow = Array.isArray(chatbot?.replyContent?.workflow)
    ? chatbot.replyContent.workflow
    : [];

  workflow.forEach((step) => {
    const options = [
      ...(Array.isArray(step?.buttons) ? step.buttons : []),
      ...(Array.isArray(step?.listItems) ? step.listItems : []),
    ];

    options.forEach((option) => {
      const id = String(option?.id || '').trim();
      const title = String(option?.title || '').trim();
      if (id && title) map.set(id, title);
    });
  });

  return map;
}

function normalizeLeadResponsesForDisplay(responses, chatbot) {
  const optionTitleById = buildWorkflowOptionTitleMap(chatbot);
  return Object.fromEntries(
    Object.entries(responses || {})
      .filter(([key]) => !String(key).endsWith('__id'))
      .map(([key, value]) => {
        const normalizedValue = String(value ?? '').trim();
        return [key, optionTitleById.get(normalizedValue) || value];
      })
  );
}

function leadSafeResponseObject(value) {
  return Object.fromEntries(
    Object.entries(responseObject(value))
      .filter(([key]) => !String(key).endsWith('__id'))
  );
}

function normalizeCrmLead(lead) {
  const source =
    lead.source ||
    responseObject(lead.metadata)?.source ||
    (String(lead.conversationId || '').startsWith('manual_') ? 'manual' : 'live_chat');

  return {
    ...lead,
    _id: String(lead._id),
    source,
    tags: normalizeTags(lead.tags),
  };
}

function normalizeChatbotLead(lead, botById = new Map()) {
  const chatbotId = String(lead.chatbotId || '');
  const chatbot = botById.get(chatbotId);
  const responses = normalizeLeadResponsesForDisplay(responseObject(lead.responses), chatbot);
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
    tags: normalizeTags(lead.tags),
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
  if (filters.tag && filters.tag !== 'all') {
    query.tags = filters.tag;
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
        const responses = leadSafeResponseObject(session.responses);
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
              tags: normalizeTags(session.tags),
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
  }).select('name keywords replyContent.workflow').lean();
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
        ...(lead.tags || []),
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
      tag: req.query.tag,
      projectId: getProjectId(req),
    };
    const [crmLeads, chatbotLeads] = await Promise.all([
      leadService.getLeads(accountId, filters),
      getChatbotLeadRows(accountId, filters),
    ]);
    const leads = [...crmLeads.map(normalizeCrmLead), ...chatbotLeads]
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
    const query = { _id: req.params.id, accountId };
    if (req.projectId) query.projectId = req.projectId;

    const lead = await Lead.findOne(query);
    if (lead) {
      return res.status(200).json({
        success: true,
        data: normalizeCrmLead(lead.toObject ? lead.toObject() : lead),
        lead: normalizeCrmLead(lead.toObject ? lead.toObject() : lead),
        message: 'Lead retrieved',
      });
    }

    const chatbotQuery = { _id: req.params.id, accountId };
    if (req.projectId) chatbotQuery.projectId = req.projectId;

    const chatbotLead = await ChatbotLead.findOne(chatbotQuery).lean();
    if (!chatbotLead) return sendNotFound(res, 'Lead not found');

    const chatbots = await KeywordRule.find({
      accountId,
      _id: String(chatbotLead.chatbotId),
    }).select('name keywords replyContent.workflow').lean();
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
    const conversationId = String(req.body.conversationId || `manual_${Date.now()}`);
    const cleanPhone = String(phone || req.body.userPhone || '').replace(/[\s+()-]/g, '');
    const leadName = String(name || req.body.userName || cleanPhone || 'Lead').trim();
    if (!leadName) return sendValidationError(res, 'Name is required');

    let conversation = null;
    if (req.body.conversationId) {
      conversation = await Conversation.findOne({ accountId, conversationId }).lean();
    }

    const phoneNumberId = req.body.phoneNumberId || conversation?.phoneNumberId || 'manual';
    const projectId = getProjectId(req) || conversation?.projectId || null;
    const tags = normalizeTags(req.body.tags);
    const source = String(req.body.source || (conversation ? 'live_chat' : 'manual')).trim() || 'manual';

    let contactId = req.body.contactId || null;
    if (!contactId && cleanPhone) {
      const contact = await Contact.findOneAndUpdate(
        { accountId, whatsappNumber: cleanPhone },
        {
          $set: {
            ...(projectId ? { projectId } : {}),
            name: leadName,
            phone: cleanPhone,
            whatsappNumber: cleanPhone,
            ...(email ? { email } : {}),
            source: source === 'live_chat' ? 'Live Chat' : 'Lead',
            type: 'lead',
            tags,
            notes: req.body.notes || '',
            lastMessageAt: conversation?.lastMessageAt || new Date(),
          },
          $setOnInsert: {
            firstContactAt: new Date(),
            isOptedIn: true,
            optInDate: new Date(),
          },
        },
        { new: true, upsert: true }
      );
      contactId = contact._id;
    }

    if (!contactId) {
      return sendValidationError(res, 'Phone or contact is required');
    }

    const lead = await Lead.findOneAndUpdate(
      { accountId, conversationId },
      {
        $set: {
          accountId,
          projectId,
          conversationId,
          contactId,
          phoneNumberId,
          name: leadName,
          email,
          phone: cleanPhone,
          company,
          intent: intent || 'inquiry',
          tags,
          notes: req.body.notes || '',
          sourceMessage: req.body.sourceMessage || conversation?.lastMessagePreview || '',
          metadata: new Map(Object.entries({ source })),
          status: req.body.status || 'new',
          score: Number(req.body.score || 50),
          lastMessage: conversation?.lastMessageAt || new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          firstMessage: conversation?.createdAt || new Date(),
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true, lean: true }
    );

    const educationEnquiry = await upsertEducationEnquiry({
      accountId,
      projectId,
      phone: cleanPhone,
      name: leadName,
      email,
      notes: req.body.notes || '',
      tags,
      source,
      responses: req.body.responses || {},
      courseId: req.body.courseId,
      batchId: req.body.batchId,
      fees: req.body.fees,
    });

    return sendSuccess(
      res,
      {
        ...normalizeCrmLead(lead),
        ...(educationEnquiry ? { educationEnquiryId: String(educationEnquiry._id), educationSynced: true } : {}),
      },
      educationEnquiry ? 'Lead saved to education enquiries' : 'Lead saved',
      201
    );
  } catch (error) {
    return handleControllerError(res, error, 'createLead');
  }
};

export const updateLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const allowedLeadUpdate = {};
    if (req.body.status !== undefined) allowedLeadUpdate.status = req.body.status;
    if (req.body.notes !== undefined) allowedLeadUpdate.notes = String(req.body.notes || '').trim();
    if (req.body.tags !== undefined) allowedLeadUpdate.tags = normalizeTags(req.body.tags);
    if (req.body.assignedTo !== undefined) allowedLeadUpdate.assignedTo = req.body.assignedTo;
    if (req.body.nextFollowUp !== undefined) allowedLeadUpdate.nextFollowUp = req.body.nextFollowUp || null;

    const query = { _id: req.params.id, accountId };
    if (req.projectId) query.projectId = req.projectId;

    const lead = await Lead.findOneAndUpdate(
      query,
      { $set: { ...allowedLeadUpdate, updatedAt: new Date() } },
      { new: true, lean: true }
    );
    if (lead) {
      if (req.body.tags !== undefined) {
        await syncTagsForPhone(accountId, lead.phone, allowedLeadUpdate.tags, {
          projectId: lead.projectId || null,
        });
        lead.tags = allowedLeadUpdate.tags;
      }
      
      // Sync Lead status back to Contact and trigger Campaign Refresh
      if (req.body.status !== undefined && lead.phone) {
        setImmediate(async () => {
          try {
            const { phoneLookupVariants } = await import('../utils/normalizePhone.js');
            const variants = phoneLookupVariants(lead.phone);
            
            await Contact.updateMany(
              { accountId, $or: [{ phone: { $in: variants } }, { whatsappNumber: { $in: variants } }] },
              { $set: { leadStatus: req.body.status } }
            );

            const Campaign = (await import('../models/Campaign.js')).default;
            const { refreshCampaignStatsFromMessages } = await import('../services/campaignStatsService.js');
            const matchingCampaigns = await Campaign.find({
              accountId,
              'sentPhones.0': { $exists: true },
              sentPhones: { $in: variants }
            }).select('_id');
            
            for (const c of matchingCampaigns) {
              await refreshCampaignStatsFromMessages(c._id, accountId);
            }
          } catch (err) {
            console.error(`Failed to refresh campaigns on lead update: ${err.message}`);
          }
        });
      }
    }

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
      if (req.body.tags !== undefined) {
        update.tags = normalizeTags(req.body.tags);
      }

      const chatbotQuery = { _id: req.params.id, accountId };
      if (req.projectId) chatbotQuery.projectId = req.projectId;

      const chatbotLead = await ChatbotLead.findOneAndUpdate(
        chatbotQuery,
        { $set: { ...update, updatedAt: new Date() } },
        { new: true, lean: true }
      );

      if (!chatbotLead) return sendNotFound(res, 'Lead not found');
      if (chatbotLead) {
        if (req.body.tags !== undefined) {
          await syncTagsForPhone(accountId, chatbotLead.customerPhone, update.tags, {
            projectId: chatbotLead.projectId || null,
          });
          chatbotLead.tags = update.tags;
        }

        // Sync Chatbot Lead status back to Contact
        if (req.body.status !== undefined && chatbotLead.customerPhone) {
          setImmediate(async () => {
            try {
              const { phoneLookupVariants } = await import('../utils/normalizePhone.js');
              const variants = phoneLookupVariants(chatbotLead.customerPhone);
              
              await Contact.updateMany(
                { accountId, $or: [{ phone: { $in: variants } }, { whatsappNumber: { $in: variants } }] },
                { $set: { leadStatus: req.body.status } }
              );
            } catch (err) {
              console.error(`Failed to sync chatbot lead update to contact: ${err.message}`);
            }
          });
        }
      }

      if (update.status && chatbotLead.customerPhone) {
        setImmediate(async () => {
          try {
            const { phoneLookupVariants } = await import('../utils/normalizePhone.js');
            const variants = phoneLookupVariants(chatbotLead.customerPhone);
            
            await Contact.updateMany(
              { accountId, $or: [{ phone: { $in: variants } }, { whatsappNumber: { $in: variants } }] },
              { $set: { leadStatus: req.body.status } } // Use req.body.status (the CRM version of status)
            );

            const Campaign = (await import('../models/Campaign.js')).default;
            const { refreshCampaignStatsFromMessages } = await import('../services/campaignStatsService.js');
            const matchingCampaigns = await Campaign.find({
              accountId,
              'sentPhones.0': { $exists: true },
              sentPhones: { $in: variants }
            }).select('_id');
            
            for (const c of matchingCampaigns) {
              await refreshCampaignStatsFromMessages(c._id, accountId);
            }
          } catch (err) {
            console.error(`Failed to refresh campaigns on chatbot lead update: ${err.message}`);
          }
        });
      }

      return sendSuccess(res, normalizeChatbotLead(chatbotLead), 'Lead updated');
    }

    return sendSuccess(res, normalizeCrmLead(lead), 'Lead updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateLead');
  }
};

export const deleteLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const query = { _id: req.params.id, accountId };
    if (req.projectId) query.projectId = req.projectId;

    const lead = await Lead.findOneAndDelete(query);
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
    const leads = [...crmLeads.map(normalizeCrmLead), ...chatbotLeads]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const header = 'name,email,phone,status,intent,score,source,tags,chatbot,responses,accountId,createdAt\n';
    const rows = leads
      .map(
        (l) =>
          `"${l.name}","${l.email || ''}","${l.phone || ''}","${l.status}","${l.intent}",${l.score || 0},"${l.source || 'live_chat'}","${(l.tags || []).join('|')}","${l.chatbotName || ''}","${JSON.stringify(l.responses || {}).replace(/"/g, '""')}","${l.accountId}","${l.createdAt}"`
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
