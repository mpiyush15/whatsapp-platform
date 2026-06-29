/**
 * Organizations Routes
 * Admin endpoints for managing registered organizations/users
 */

import express from 'express';
import logger from '../utils/logger.js';
import { requireSuperAdmin } from '../middlewares/jwtAuth.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  getAllOrganizations,
  createOrganization,
  getOrganizationById,
  getOrganizationOperational,
  updateOrganization,
  deleteOrganization,
  migrateBillingDates,
  generatePaymentLink,
  createInvoice,
  resetOrganizationPassword,
  assignPlanToOrganization,
  setOrganizationInternalFlag
} from '../controllers/organizationsController.js';

const router = express.Router();

/**
 * @route   GET /api/admin/organizations
 * @desc    Get all registered users/organizations
 * @access  Admin only (requires JWT auth)
 */
router.get('/', getAllOrganizations);

/**
 * @route   POST /api/admin/organizations
 * @desc    Create new organization/user (FREE - no invoice)
 * @access  Admin only (requires JWT auth)
 */
router.post('/', createOrganization);

/**
 * @route   POST /api/admin/organizations/migrate/billing-dates
 * @desc    Migrate existing organizations with missing billing dates
 * @access  Admin only (requires JWT auth)
 */
router.post('/migrate/billing-dates', migrateBillingDates);

/**
 * @route   POST /api/admin/organizations/:id/generate-payment-link
 * @desc    Generate payment link for a client (creates invoice + subscription)
 * @access  Admin only (requires JWT auth)
 */
router.post('/:id/generate-payment-link', generatePaymentLink);

/**
 * @route   POST /api/admin/organizations/:id/create-invoice
 * @desc    Create simple invoice for free clients or retroactive
 * @access  Admin only (requires JWT auth)
 */
router.post('/:id/create-invoice', createInvoice);

/**
 * @route   GET /api/admin/organizations/:id/operational
 * @desc    Projects, phones, usage for organization
 */
router.get('/:id/operational', getOrganizationOperational);

/**
 * @route   GET /api/admin/organizations/:id
 * @desc    Get single organization by ID
 * @access  Admin only (requires JWT auth)
 */
router.get('/:id', getOrganizationById);

/**
 * @route   PUT /api/admin/organizations/:id
 * @desc    Update organization details
 * @access  Admin only (requires JWT auth)
 */
router.put('/:id', updateOrganization);

/**
 * @route   DELETE /api/admin/organizations/:id
 * @desc    Delete organization
 * @access  Admin only (requires JWT auth)
 */
router.delete('/:id', deleteOrganization);

/**
 * @route   POST /api/admin/organizations/:id/reset-password
 * @desc    Reset organization password and send via email
 * @access  Admin only (requires JWT auth)
 */
router.post('/:id/reset-password', resetOrganizationPassword);

/**
 * @route   PUT /api/admin/organizations/:accountId/assign-plan
 * @desc    Assign a pricing plan to an organization
 * @access  Admin only (requires JWT auth)
 */
router.put('/:accountId/assign-plan', assignPlanToOrganization);

/**
 * @route   PATCH /api/admin/organizations/:accountId/set-internal
 * @desc    Toggle internal billing-exempt org flag
 * @access  Superadmin only
 */
router.patch('/:accountId/set-internal', requireSuperAdmin, setOrganizationInternalFlag);

export default router;
