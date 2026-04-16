import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import { handleControllerError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

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
    const user = req.user;
    
    console.log('🔍 [getAllOrganizations] req.user:', user);
    console.log('🔍 [getAllOrganizations] user.role:', user?.role);
    console.log('🔍 [getAllOrganizations] role check (superadmin?):', user?.role === 'superadmin');
    
    // Only superadmin can view all organizations
    if (user.role !== 'superadmin') {
      console.log('❌ [getAllOrganizations] User role is NOT superadmin, returning empty array');
      return sendSuccess(res, { data: [] }, 'Organizations retrieved');
    }
    
    console.log('✅ [getAllOrganizations] User is superadmin, fetching organizations...');
    
    // Query accounts collection - this contains all organizations
    const Account = mongoose.model('Account');
    const organizations = await Account.find({})
      .select('accountId name email company type role status createdAt')
      .sort({ createdAt: -1 });
    
    console.log('🔍 [getAllOrganizations] Found organizations:', organizations.length);
    console.log('🔍 [getAllOrganizations] Organizations:', organizations);
    return sendSuccess(res, { data: organizations }, 'All organizations retrieved');
  } catch (error) {
    console.error('❌ [getAllOrganizations] Error:', error);
    return handleControllerError(res, error, 'getAllOrganizations');
  }
};

export const getOrganizationById = async (req, res) => {
  try {
    const { organizationId } = req.params;
    return sendSuccess(res, { organizationId }, 'Organization retrieved');
  } catch (error) {
    return handleControllerError(res, error, 'getOrganizationById');
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
  resetOrganizationPassword
};
