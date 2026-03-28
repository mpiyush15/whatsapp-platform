import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';

export const createLead = async (req, res) => {
  try {
    const { name, email, phone, source } = req.body;

    if (!name || !email) {
      return sendValidationError(res, 'Name and email required');
    }

    return sendSuccess(res, {
      leadId: `lead_${Date.now()}`,
      name,
      email,
      status: 'new'
    }, 'Lead created');
  } catch (error) {
    return handleControllerError(res, error, 'createLead');
  }
};

export const getLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    return sendSuccess(res, { leadId }, 'Lead retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getLead');
  }
};

export const listLeads = async (req, res) => {
  try {
    return sendSuccess(res, { leads: [] }, 'Leads retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listLeads');
  }
};

export const updateLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    return sendSuccess(res, { leadId }, 'Lead updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateLead');
  }
};

export const getLeads = async (req, res) => {
  try {
    return sendSuccess(res, { leads: [] }, 'Leads retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getLeads');
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    return sendSuccess(res, { leadId: id, deleted: true }, 'Lead deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteLead');
  }
};

export const autoCaptureLead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    return sendSuccess(res, { conversationId, leadId: `lead_${Date.now()}` }, 'Lead auto-captured');
  } catch (error) {
    return handleControllerError(res, error, 'autoCaptureLead');
  }
};

export const getLeadStats = async (req, res) => {
  try {
    return sendSuccess(res, { stats: {} }, 'Lead stats retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getLeadStats');
  }
};

export const markStaleLeads = async (req, res) => {
  try {
    return sendSuccess(res, { markedStale: 0 }, 'Stale leads marked');
  } catch (error) {
    return handleControllerError(res, error, 'markStaleLeads');
  }
};

export const exportLeads = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    return res.send('leadId,name,email\n');
  } catch (error) {
    return handleControllerError(res, error, 'exportLeads');
  }
};

export default { 
  createLead,
  getLead,
  listLeads,
  updateLead,
  getLeads,
  deleteLead,
  autoCaptureLead,
  getLeadStats,
  markStaleLeads,
  exportLeads
};
