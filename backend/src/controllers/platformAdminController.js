import { sendSuccess, sendForbidden, sendNotFound, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';
import platformAdminService from '../services/platformAdminService.js';
import invoiceAdminService from '../services/invoiceAdminService.js';

function guard(req, res) {
  try {
    platformAdminService.requirePlatformAdmin(req);
    return true;
  } catch (error) {
    if (error.statusCode === 403) {
      sendForbidden(res, 'Only superadmins can access platform admin APIs');
      return false;
    }
    handleControllerError(res, error, 'platformAdmin');
    return false;
  }
}

export async function getMetrics(req, res) {
  try {
    if (!guard(req, res)) return;
    const data = await platformAdminService.getPlatformOverview();
    return sendSuccess(res, data, 'Platform metrics');
  } catch (error) {
    return handleControllerError(res, error, 'getMetrics');
  }
}

export async function getDashboard(req, res) {
  try {
    if (!guard(req, res)) return;
    const data = await platformAdminService.getSuperadminDashboard();
    return sendSuccess(res, data, 'Superadmin dashboard');
  } catch (error) {
    return handleControllerError(res, error, 'getDashboard');
  }
}

export async function getRecentCustomers(req, res) {
  try {
    if (!guard(req, res)) return;
    const limit = Math.min(50, parseInt(req.query?.limit, 10) || 10);
    const data = await platformAdminService.getRecentOrganizations(limit);
    return sendSuccess(res, data, 'Recent organizations');
  } catch (error) {
    return handleControllerError(res, error, 'getRecentCustomers');
  }
}

export async function getPlatformAnalytics(req, res) {
  try {
    if (!guard(req, res)) return;
    const data = await platformAdminService.getPlatformAnalytics(req.query);
    return sendSuccess(res, data, 'Platform analytics');
  } catch (error) {
    return handleControllerError(res, error, 'getPlatformAnalytics');
  }
}

export async function getPlatformCampaigns(req, res) {
  try {
    if (!guard(req, res)) return;
    const data = await platformAdminService.getPlatformCampaigns(req.query);
    return sendSuccess(res, data, 'Platform campaigns');
  } catch (error) {
    return handleControllerError(res, error, 'getPlatformCampaigns');
  }
}

export async function getPlatformLeads(req, res) {
  try {
    if (!guard(req, res)) return;
    const { leads, stats } = await platformAdminService.getPlatformLeads(req.query);
    return sendSuccess(res, { leads, stats }, 'Platform leads');
  } catch (error) {
    return handleControllerError(res, error, 'getPlatformLeads');
  }
}

export async function patchPlatformLead(req, res) {
  try {
    if (!guard(req, res)) return;
    if (!req.body?.status) {
      return sendValidationError(res, 'status is required');
    }
    const lead = await platformAdminService.updatePlatformLead(req.params.leadId, req.body);
    return sendSuccess(res, lead, 'Lead updated');
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, 'Lead not found');
    return handleControllerError(res, error, 'patchPlatformLead');
  }
}

export async function getAdminInvoices(req, res) {
  try {
    if (!guard(req, res)) return;
    const data = await invoiceAdminService.listPlatformInvoices({
      limit: req.query?.limit,
    });
    return sendSuccess(res, data, 'Invoices retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getAdminInvoices');
  }
}

export async function backfillAdminInvoices(req, res) {
  try {
    if (!guard(req, res)) return;
    const result = await invoiceAdminService.backfillInvoicesFromPayments({
      limit: req.body?.limit || req.query?.limit || 100,
    });
    return sendSuccess(res, result, 'Invoice backfill completed');
  } catch (error) {
    return handleControllerError(res, error, 'backfillAdminInvoices');
  }
}

export async function downloadExportCsv(req, res) {
  try {
    if (!guard(req, res)) return;
    const dataset = req.params.dataset || req.query?.dataset;
    if (!dataset) {
      return sendValidationError(res, 'dataset is required');
    }
    const csv = await platformAdminService.buildExportCsv(String(dataset));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="replysys-${dataset}-${Date.now()}.csv"`
    );
    return res.send(csv);
  } catch (error) {
    if (error.statusCode === 400) return sendValidationError(res, error.message);
    return handleControllerError(res, error, 'downloadExportCsv');
  }
}

export default {
  getMetrics,
  getRecentCustomers,
  getPlatformAnalytics,
  getPlatformCampaigns,
  getPlatformLeads,
  patchPlatformLead,
  downloadExportCsv,
  getAdminInvoices,
  backfillAdminInvoices,
  getDashboard,
};
