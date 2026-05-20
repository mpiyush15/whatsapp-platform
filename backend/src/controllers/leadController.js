import Lead from '../models/Lead.js';
import leadService from '../services/leadService.js';
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';

function accountIdFromReq(req) {
  return req.account?.accountId || req.user?.accountId || req.accountId;
}

export const getLeads = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    if (!accountId) {
      return sendValidationError(res, 'Account context required');
    }

    const leads = await leadService.getLeads(accountId, {
      status: req.query.status,
      intent: req.query.intent,
      minScore: req.query.minScore,
      search: req.query.search,
    });
    const stats = await leadService.getLeadStats(accountId);

    return sendSuccess(res, { leads, stats }, 'Leads retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getLeads');
  }
};

export const getLead = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const lead = await Lead.findOne({ _id: req.params.id, accountId });
    if (!lead) return sendNotFound(res, 'Lead not found');
    return sendSuccess(res, lead, 'Lead retrieved');
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
    if (!lead) return sendNotFound(res, 'Lead not found');
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
    const leads = await leadService.getLeads(accountId, req.query);
    const header = 'name,email,phone,status,intent,score,accountId,createdAt\n';
    const rows = leads
      .map(
        (l) =>
          `"${l.name}","${l.email || ''}","${l.phone || ''}","${l.status}","${l.intent}",${l.score || 0},"${l.accountId}","${l.createdAt}"`
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
