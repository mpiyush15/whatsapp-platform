import billingReconciliationService from '../services/billingReconciliationService.js';
import { sendForbidden, sendSuccess, sendValidationError } from '../utils/responseHandler.js';
import { handleControllerError } from '../utils/errorHandler.js';

function ensureInternalAdmin(req, res) {
  if (req.account?.type !== 'internal') {
    sendForbidden(res, 'Superadmin access required');
    return false;
  }
  return true;
}

export const getBillingReconciliationOverview = async (req, res) => {
  try {
    if (!ensureInternalAdmin(req, res)) return;

    const { olderThanMinutes = 30, sampleLimit = 20 } = req.query;
    const result = await billingReconciliationService.getOverview({
      olderThanMinutes: Number(olderThanMinutes),
      sampleLimit: Number(sampleLimit),
    });

    return sendSuccess(res, result, 'Billing reconciliation overview retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getBillingReconciliationOverview');
  }
};

export const getStuckPaymentsReport = async (req, res) => {
  try {
    if (!ensureInternalAdmin(req, res)) return;

    const { olderThanMinutes = 30, limit = 100 } = req.query;
    const payments = await billingReconciliationService.getStuckPayments({
      olderThanMinutes: Number(olderThanMinutes),
      limit: Number(limit),
    });

    return sendSuccess(res, { payments, count: payments.length }, 'Stuck payments report retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getStuckPaymentsReport');
  }
};

export const getMissingInvoicesReport = async (req, res) => {
  try {
    if (!ensureInternalAdmin(req, res)) return;

    const { limit = 100 } = req.query;
    const payments = await billingReconciliationService.getMissingInvoices({ limit: Number(limit) });

    return sendSuccess(res, { payments, count: payments.length }, 'Missing invoices report retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMissingInvoicesReport');
  }
};

export const getMissingSubscriptionsReport = async (req, res) => {
  try {
    if (!ensureInternalAdmin(req, res)) return;

    const { limit = 100 } = req.query;
    const payments = await billingReconciliationService.getMissingSubscriptions({ limit: Number(limit) });

    return sendSuccess(res, { payments, count: payments.length }, 'Missing subscriptions report retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getMissingSubscriptionsReport');
  }
};

export const getCreditMismatchReport = async (req, res) => {
  try {
    if (!ensureInternalAdmin(req, res)) return;

    const { limit = 100 } = req.query;
    const accounts = await billingReconciliationService.getCreditMismatches({ limit: Number(limit) });

    return sendSuccess(res, { accounts, count: accounts.length }, 'Credit mismatch report retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getCreditMismatchReport');
  }
};

export const recomputeCreditBalance = async (req, res) => {
  try {
    if (!ensureInternalAdmin(req, res)) return;

    const { accountId } = req.params;
    if (!accountId) {
      return sendValidationError(res, 'accountId is required');
    }

    const result = await billingReconciliationService.recomputeAccountCreditBalance(accountId);
    return sendSuccess(res, result, 'Credit balance recomputed successfully');
  } catch (error) {
    return handleControllerError(res, error, 'recomputeCreditBalance');
  }
};

export default {
  getBillingReconciliationOverview,
  getStuckPaymentsReport,
  getMissingInvoicesReport,
  getMissingSubscriptionsReport,
  getCreditMismatchReport,
  recomputeCreditBalance,
};
