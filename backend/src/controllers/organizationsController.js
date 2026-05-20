import { sendSuccess, sendValidationError, sendNotFound, sendForbidden, sendError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import platformAdminService from '../services/platformAdminService.js';

export const createOrganization = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return sendValidationError(res, 'Name and email required');
    }

    return sendSuccess(res, {
      organizationId: `org_${Date.now()}`,
      name,
      status: 'active'
    }, 'Organization created');
  } catch (error) {
    return handleControllerError(res, error, 'createOrganization');
  }
};

export const getOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    return sendSuccess(res, { organizationId }, 'Organization retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getOrganization');
  }
};

export const listOrganizations = async (req, res) => {
  try {
    return sendSuccess(res, { organizations: [] }, 'Organizations retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'listOrganizations');
  }
};

export const getAllOrganizations = async (req, res) => {
  try {
    const isSuperadmin =
      req.account?.type === 'internal' || req.user?.role === 'superadmin';
    if (!isSuperadmin) {
      return sendForbidden(res, 'Only superadmins can view organizations');
    }

    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 500));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const status = req.query.status || 'all';

  // Clients, agencies, and internal (billing-exempt) accounts
    const filter = {
      $or: [
        { type: { $in: ['client', 'agency', 'internal'] } },
        { isInternal: true },
      ],
    };
    if (status !== 'all') {
      filter.status = status;
    }

    const [organizations, total] = await Promise.all([
      Account.find(filter)
        .select(
          'accountId name email company phone plan billingCycle type role status isInternal createdAt subscriptionId'
        )
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      Account.countDocuments(filter),
    ]);

    const statsMap = await platformAdminService.getOrgStatsMap(
      organizations.map((o) => o.accountId)
    );

    const enriched = organizations.map((org) => {
      const stats = statsMap.get(org.accountId) || {};
      return {
        _id: org._id,
        accountId: org.accountId,
        name: org.name,
        email: org.email,
        company: org.company,
        phone: org.phone,
        plan: org.plan,
        billingCycle: org.billingCycle,
        status: org.status,
        role: org.role,
        type: org.type,
        isInternal: Boolean(org.isInternal),
        createdAt: org.createdAt,
        projectCount: stats.projectCount ?? 0,
        phoneCount: stats.phoneCount ?? 0,
        connectedProjects: stats.connectedProjects ?? 0,
        hasMultipleProjects: Boolean(stats.hasMultipleProjects),
        messages7d: stats.messages7d ?? 0,
        projectsByVertical: stats.projectsByVertical ?? {},
        verticals: stats.verticals ?? [],
        hasMultipleVerticals: Boolean(stats.hasMultipleVerticals),
      };
    });

    return sendSuccess(
      res,
      {
        organizations: enriched,
        pagination: { total, limit, offset, status },
      },
      'Organizations retrieved'
    );
  } catch (error) {
    return handleControllerError(res, error, 'getAllOrganizations');
  }
};

export const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    // Only superadmin can view organization details
    if (user.role !== 'superadmin') {
      return sendError(res, 'Unauthorized: Only superadmin can view organization details', 403);
    }
    
    // Query by accountId using Mongoose
    const Account = mongoose.model('Account');
    const organization = await Account.findOne({
      accountId: id
    }).lean();
    
    if (!organization) {
      return sendError(res, 'Organization not found', 404);
    }

    let operational = null;
    try {
      operational = await platformAdminService.getOrganizationOperationalDetail(id);
    } catch (opsErr) {
      logger.warn('Operational detail partial failure:', opsErr.message);
    }
    
    return sendSuccess(res, { ...organization, operational }, 'Organization retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getOrganizationById');
  }
};

export const getOrganizationOperational = async (req, res) => {
  try {
    if (req.account?.type !== 'internal') {
      return sendForbidden(res, 'Only superadmins can view organization operational data');
    }
    const { id } = req.params;
    const data = await platformAdminService.getOrganizationOperationalDetail(id);
    return sendSuccess(res, data, 'Organization operational detail');
  } catch (error) {
    return handleControllerError(res, error, 'getOrganizationOperational');
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    return sendSuccess(res, { organizationId, updated: true }, 'Organization updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateOrganization');
  }
};

export const deleteOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    return sendSuccess(res, { organizationId, deleted: true }, 'Organization deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteOrganization');
  }
};

export const migrateBillingDates = async (req, res) => {
  try {
    return sendSuccess(res, { migrated: 0 }, 'Billing dates migrated');
  } catch (error) {
    return handleControllerError(res, error, 'migrateBillingDates');
  }
};

export const generatePaymentLink = async (req, res) => {
  try {
    const { organizationId } = req.params;
    return sendSuccess(res, { paymentLink: '#' }, 'Payment link generated');
  } catch (error) {
    return handleControllerError(res, error, 'generatePaymentLink');
  }
};

export const createInvoice = async (req, res) => {
  try {
    const { organizationId } = req.params;
    return sendSuccess(res, { invoiceId: `inv_${Date.now()}` }, 'Invoice created');
  } catch (error) {
    return handleControllerError(res, error, 'createInvoice');
  }
};

export const resetOrganizationPassword = async (req, res) => {
  try {
    const { organizationId } = req.params;
    return sendSuccess(res, { organizationId, reset: true }, 'Password reset');
  } catch (error) {
    return handleControllerError(res, error, 'resetOrganizationPassword');
  }
};

export const assignPlanToOrganization = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { plan, billingCycle, reason, markAsPaid } = req.body;

    // Validation
    if (!accountId) {
      return sendValidationError(res, 'Account ID is required');
    }

    const validPlans = ['free', 'starter', 'pro', 'enterprise', 'custom'];
    if (plan && !validPlans.includes(plan)) {
      return sendValidationError(res, `Invalid plan. Must be one of: ${validPlans.join(', ')}`);
    }

    const validCycles = ['monthly', 'quarterly', 'annual'];
    if (billingCycle && !validCycles.includes(billingCycle)) {
      return sendValidationError(res, `Invalid billing cycle. Must be one of: ${validCycles.join(', ')}`);
    }

    // Get Account model
    const Account = mongoose.model('Account');
    
    const account = await Account.findOne({ accountId });
    if (!account) {
      return sendNotFound(res, 'Organization not found');
    }

    // Update plan and billing cycle
    if (plan) account.plan = plan;
    if (billingCycle) account.billingCycle = billingCycle;

    // Track plan assignment history
    if (!account.planAssignmentHistory) {
      account.planAssignmentHistory = [];
    }

    account.planAssignmentHistory.push({
      plan: plan || account.plan,
      billingCycle: billingCycle || account.billingCycle,
      assignedBy: req.user?.email || 'system',
      reason: reason || '',
      assignedAt: new Date(),
      markedAsPaid: markAsPaid || false
    });

    // If marked as paid, update billing status for old organizations
    if (markAsPaid) {
      account.billingStatus = 'active';
      account.lastPaymentDate = new Date();
      
      logger.info('✅ Old organization plan assigned and marked as paid', {
        accountId,
        plan,
        billingCycle,
        markedAsPaid: true,
        assignedBy: req.user?.email
      });
    }

    await account.save();

    logger.info('✅ Plan assigned to organization', {
      accountId,
      plan,
      billingCycle,
      reason,
      markAsPaid,
      assignedBy: req.user?.email
    });

    return sendSuccess(res, {
      accountId: account.accountId,
      name: account.name,
      plan: account.plan,
      billingCycle: account.billingCycle,
      markedAsPaid: markAsPaid || false
    }, 'Plan assigned successfully');
  } catch (error) {
    return handleControllerError(res, error, 'assignPlanToOrganization');
  }
}

export const setOrganizationInternalFlag = async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return sendForbidden(res, 'Only superadmin can update internal organization flag');
    }

    const { accountId } = req.params;
    const { isInternal } = req.body;

    if (typeof isInternal !== 'boolean') {
      return sendValidationError(res, 'isInternal (boolean) is required');
    }

    const Account = mongoose.model('Account');
    const account = await Account.findOne({ accountId });

    if (!account) {
      return sendNotFound(res, 'Organization not found');
    }

    account.isInternal = isInternal;
    await account.save();

    logger.info('✅ Organization internal flag updated', {
      accountId,
      isInternal,
      updatedBy: req.user?.email || req.user?.accountId || 'unknown'
    });

    return sendSuccess(res, {
      accountId: account.accountId,
      name: account.name,
      isInternal: account.isInternal,
      updatedAt: account.updatedAt,
    }, 'Organization internal flag updated');
  } catch (error) {
    return handleControllerError(res, error, 'setOrganizationInternalFlag');
  }
};

export default { 
  createOrganization, 
  getOrganization, 
  listOrganizations,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  migrateBillingDates,
  generatePaymentLink,
  createInvoice,
  resetOrganizationPassword,
  assignPlanToOrganization,
  setOrganizationInternalFlag
};
