import express from 'express';
import mongoose from 'mongoose';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';
import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
import {
  getOrganizations,
  getPendingUsers,
  sendPaymentReminder,
  sendReminderAllPending,
  changeUserStatus,
  insertOldCashfreeOrders,
  getTransactions,
  syncCashfreeTransactions,
  activateAccount
} from '../controllers/adminController.js';
import {
  getBillingReconciliationOverview,
  getStuckPaymentsReport,
  getMissingInvoicesReport,
  getMissingSubscriptionsReport,
  getCreditMismatchReport,
  recomputeCreditBalance,
} from '../controllers/billingAdminController.js';

const router = express.Router();

const getMaintenanceAudienceFilter = (segment = 'all') => {
  const normalized = String(segment || 'all');

  if (normalized === 'paid') return { type: { $in: ['client', 'agency'] }, status: 'active' };
  if (normalized === 'trial') return { type: { $in: ['client', 'agency'] }, plan: 'trial' };
  if (normalized === 'internal-excluded') return { type: { $in: ['client', 'agency'] }, isInternal: { $ne: true } };

  return { type: { $in: ['client', 'agency'] } };
};

/**
 * GET /api/admin/organizations
 * List all organizations with status, subscriptions, and invoices (superadmin only)
 */
router.get('/organizations', getOrganizations);

/**
 * GET /api/admin/pending-users
 * List all accounts with pending payment (superadmin only)
 */
router.get('/pending-users', getPendingUsers);

/**
 * POST /api/admin/send-payment-reminder
 * Send payment reminder to a specific pending user (superadmin only)
 */
router.post('/send-payment-reminder', sendPaymentReminder);

/**
 * POST /api/admin/send-reminder-all-pending
 * Send payment reminders to all pending users (superadmin only)
 */
router.post('/send-reminder-all-pending', sendReminderAllPending);

/**
 * POST /api/admin/change-user-status
 * Change user status from pending to active (superadmin only)
 */
router.post('/change-user-status', changeUserStatus);

/**
 * POST /api/admin/insert-old-cashfree-orders
 * Insert old Cashfree orders for testing sync (superadmin only)
 */
router.post('/insert-old-cashfree-orders', insertOldCashfreeOrders);

/**
 * GET /api/admin/transactions
 * Get all platform transactions (superadmin only)
 */
router.get('/transactions', getTransactions);

/**
 * POST /api/admin/sync-cashfree
 * Sync transactions from Cashfree API (superadmin only)
 */
router.post('/sync-cashfree', syncCashfreeTransactions);

/**
 * POST /api/admin/accounts/:accountId/activate
 * Manually activate account & create subscription + invoice + send email (superadmin only)
 */
router.post('/accounts/:accountId/activate', activateAccount);

/**
 * GET /api/admin/billing/reconciliation/overview
 * Summary + sample reconciliation report (superadmin only)
 */
router.get('/billing/reconciliation/overview', getBillingReconciliationOverview);

/**
 * GET /api/admin/billing/reconciliation/stuck-payments
 * Inspect old pending/processing payments (superadmin only)
 */
router.get('/billing/reconciliation/stuck-payments', getStuckPaymentsReport);

/**
 * GET /api/admin/billing/reconciliation/missing-invoices
 * Inspect completed payments without invoice linkage (superadmin only)
 */
router.get('/billing/reconciliation/missing-invoices', getMissingInvoicesReport);

/**
 * GET /api/admin/billing/reconciliation/missing-subscriptions
 * Inspect completed payments without subscription linkage (superadmin only)
 */
router.get('/billing/reconciliation/missing-subscriptions', getMissingSubscriptionsReport);

/**
 * GET /api/admin/billing/reconciliation/credit-mismatches
 * Inspect account credit cache mismatches vs ledger (superadmin only)
 */
router.get('/billing/reconciliation/credit-mismatches', getCreditMismatchReport);

/**
 * POST /api/admin/billing/reconciliation/credits/:accountId/recompute
 * Safely recompute account creditBalance from ledger (superadmin only)
 */
router.post('/billing/reconciliation/credits/:accountId/recompute', recomputeCreditBalance);

/**
 * GET /api/admin/maintenance-announcements
 * List maintenance announcements (superadmin operations)
 */
router.get('/maintenance-announcements', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const items = await db
      .collection('maintenance_announcements')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return res.json({ success: true, data: items });
  } catch (error) {
    logger.error('maintenance list error', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch maintenance announcements' });
  }
});

/**
 * POST /api/admin/maintenance-announcements
 * Create maintenance announcement (superadmin operations)
 */
router.post('/maintenance-announcements', async (req, res) => {
  try {
    const { title, message, segment = 'all', scheduledAt = null } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    const db = mongoose.connection.db;
    const now = new Date();
    const actor = req.user?.email || req.user?.name || 'superadmin';

    const payload = {
      title: String(title).trim(),
      message: String(message).trim(),
      segment: String(segment || 'all'),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? 'scheduled' : 'draft',
      delivery: {
        targeted: 0,
        sent: 0,
        failed: 0,
        acknowledged: 0,
      },
      createdBy: actor,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('maintenance_announcements').insertOne(payload);

    await db.collection('admin_audit_logs').insertOne({
      actor,
      action: 'maintenance.create',
      entityType: 'maintenance_announcement',
      entityId: result.insertedId,
      metadata: {
        title: payload.title,
        segment: payload.segment,
        status: payload.status,
      },
      createdAt: now,
    });

    return res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...payload,
      },
      message: 'Maintenance announcement created',
    });
  } catch (error) {
    logger.error('maintenance create error', error);
    return res.status(500).json({ success: false, message: 'Failed to create maintenance announcement' });
  }
});

/**
 * PATCH /api/admin/maintenance-announcements/:id
 * Update maintenance announcement status
 */
router.patch('/maintenance-announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['draft', 'scheduled', 'sent', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const db = mongoose.connection.db;
    const now = new Date();
    const actor = req.user?.email || req.user?.name || 'superadmin';

    const updated = await db.collection('maintenance_announcements').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { status, updatedAt: now } },
      { returnDocument: 'after' }
    );

    const updatedDoc = updated?.value || updated;

    if (!updatedDoc?._id) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await db.collection('admin_audit_logs').insertOne({
      actor,
      action: 'maintenance.status.update',
      entityType: 'maintenance_announcement',
      entityId: updatedDoc._id,
      metadata: { status },
      createdAt: now,
    });

    return res.json({ success: true, data: updatedDoc, message: 'Status updated' });
  } catch (error) {
    logger.error('maintenance update error', error);
    return res.status(500).json({ success: false, message: 'Failed to update maintenance announcement' });
  }
});

/**
 * POST /api/admin/maintenance-announcements/:id/send
 * Simulate dispatch and update delivery stats
 */
router.post('/maintenance-announcements/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const db = mongoose.connection.db;
    const now = new Date();
    const actor = req.user?.email || req.user?.name || 'superadmin';

    const item = await db.collection('maintenance_announcements').findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const targeted = await db.collection('accounts').countDocuments(getMaintenanceAudienceFilter(item.segment));
    const failed = Math.floor(targeted * 0.02);
    const sent = Math.max(targeted - failed, 0);

    const updated = await db.collection('maintenance_announcements').findOneAndUpdate(
      { _id: item._id },
      {
        $set: {
          status: 'sent',
          updatedAt: now,
          sentAt: now,
          delivery: {
            targeted,
            sent,
            failed,
            acknowledged: item.delivery?.acknowledged || 0,
          },
        }
      },
      { returnDocument: 'after' }
    );

    const updatedDoc = updated?.value || updated;

    await db.collection('admin_audit_logs').insertOne({
      actor,
      action: 'maintenance.send',
      entityType: 'maintenance_announcement',
      entityId: item._id,
      metadata: { targeted, sent, failed },
      createdAt: now,
    });

    return res.json({ success: true, data: updatedDoc, message: 'Maintenance announcement sent' });
  } catch (error) {
    logger.error('maintenance send error', error);
    return res.status(500).json({ success: false, message: 'Failed to send maintenance announcement' });
  }
});

/**
 * POST /api/admin/maintenance-announcements/:id/acknowledge
 * Increment acknowledgement count (preview workflow)
 */
router.post('/maintenance-announcements/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const db = mongoose.connection.db;
    const now = new Date();

    const updated = await db.collection('maintenance_announcements').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $inc: { 'delivery.acknowledged': 1 },
        $set: { updatedAt: now }
      },
      { returnDocument: 'after' }
    );

    const updatedDoc = updated?.value || updated;
    if (!updatedDoc?._id) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    return res.json({ success: true, data: updatedDoc, message: 'Acknowledgement recorded' });
  } catch (error) {
    logger.error('maintenance acknowledge error', error);
    return res.status(500).json({ success: false, message: 'Failed to record acknowledgement' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Basic audit explorer for sensitive admin operations
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const { actor, action, limit = 100 } = req.query || {};
    const db = mongoose.connection.db;

    const query = {};
    if (actor) query.actor = String(actor);
    if (action) query.action = String(action);

    const logs = await db
      .collection('admin_audit_logs')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 200))
      .toArray();

    return res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('audit logs fetch error', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/admin/feature-flags
 * List feature flags and kill-switch controls
 */
router.get('/feature-flags', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const flags = await db.collection('feature_flags').find({}).sort({ key: 1 }).toArray();
    return res.json({ success: true, data: flags });
  } catch (error) {
    logger.error('feature flags list error', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch feature flags' });
  }
});

/**
 * PUT /api/admin/feature-flags/:key
 * Upsert a feature flag
 */
router.put('/feature-flags/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled = false, description = '', scope = 'global' } = req.body || {};
    const db = mongoose.connection.db;
    const now = new Date();
    const actor = req.user?.email || req.user?.name || 'superadmin';

    const updated = await db.collection('feature_flags').findOneAndUpdate(
      { key: String(key) },
      {
        $set: {
          key: String(key),
          enabled: Boolean(enabled),
          description: String(description || ''),
          scope: String(scope || 'global'),
          updatedAt: now,
          updatedBy: actor,
        },
        $setOnInsert: {
          createdAt: now,
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const updatedDoc = updated?.value || updated;

    await db.collection('admin_audit_logs').insertOne({
      actor,
      action: 'feature_flag.upsert',
      entityType: 'feature_flag',
      entityId: String(key),
      metadata: {
        enabled: Boolean(enabled),
        scope: String(scope || 'global'),
      },
      createdAt: now,
    });

    return res.json({ success: true, data: updatedDoc, message: 'Feature flag updated' });
  } catch (error) {
    logger.error('feature flag update error', error);
    return res.status(500).json({ success: false, message: 'Failed to update feature flag' });
  }
});

/**
 * GET /api/admin/exports
 * List generated export snapshots
 */
router.get('/exports', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const items = await db
      .collection('admin_exports')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return res.json({ success: true, data: items });
  } catch (error) {
    logger.error('exports list error', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch exports' });
  }
});

/**
 * POST /api/admin/exports
 * Create lightweight export snapshot metadata (foundation)
 */
router.post('/exports', async (req, res) => {
  try {
    const { dataset = 'billing' } = req.body || {};
    const db = mongoose.connection.db;
    const now = new Date();
    const actor = req.user?.email || req.user?.name || 'superadmin';

    const allowedDatasets = ['billing', 'usage', 'offers', 'health', 'audit'];
    if (!allowedDatasets.includes(String(dataset))) {
      return res.status(400).json({ success: false, message: 'Invalid dataset' });
    }

    let counts = {};
    if (dataset === 'billing') {
      const [payments, invoices, subscriptions] = await Promise.all([
        db.collection('payments').countDocuments({}),
        db.collection('invoices').countDocuments({}),
        db.collection('subscriptions').countDocuments({}),
      ]);
      counts = { payments, invoices, subscriptions };
    } else if (dataset === 'usage') {
      const [messages, contacts, conversations] = await Promise.all([
        db.collection('messages').countDocuments({}),
        db.collection('contacts').countDocuments({}),
        db.collection('conversations').countDocuments({}),
      ]);
      counts = { messages, contacts, conversations };
    } else if (dataset === 'offers') {
      const [discountOffers, promoOffers, plans] = await Promise.all([
        db.collection('discountoffers').countDocuments({}),
        db.collection('promotionaloffers').countDocuments({}),
        db.collection('pricingplans').countDocuments({}),
      ]);
      counts = { discountOffers, promoOffers, plans };
    } else if (dataset === 'health') {
      const [queuedMessages, failedMessages, openSupportTickets] = await Promise.all([
        db.collection('messages').countDocuments({ status: 'queued' }),
        db.collection('messages').countDocuments({ status: 'failed' }),
        db.collection('supporttickets').countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      ]);
      counts = { queuedMessages, failedMessages, openSupportTickets };
    } else if (dataset === 'audit') {
      const [auditLogs, maintenanceEvents, featureFlagChanges] = await Promise.all([
        db.collection('admin_audit_logs').countDocuments({}),
        db.collection('admin_audit_logs').countDocuments({ action: { $regex: '^maintenance\\.' } }),
        db.collection('admin_audit_logs').countDocuments({ action: 'feature_flag.upsert' }),
      ]);
      counts = { auditLogs, maintenanceEvents, featureFlagChanges };
    }

    const payload = {
      dataset: String(dataset),
      status: 'completed',
      format: 'json-summary',
      counts,
      createdBy: actor,
      createdAt: now,
    };

    const result = await db.collection('admin_exports').insertOne(payload);

    await db.collection('admin_audit_logs').insertOne({
      actor,
      action: 'export.create',
      entityType: 'admin_export',
      entityId: result.insertedId,
      metadata: {
        dataset: String(dataset),
        format: 'json-summary',
      },
      createdAt: now,
    });

    return res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...payload,
      },
      message: 'Export snapshot created',
    });
  } catch (error) {
    logger.error('export create error', error);
    return res.status(500).json({ success: false, message: 'Failed to create export snapshot' });
  }
});

/**
 * GET /api/admin/system-health/observability
 * Step 9 observability foundation snapshot
 */
router.get('/system-health/observability', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const now = new Date();
    const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const [
      messages24h,
      failedMessages24h,
      queuedNow,
      supportOpen,
      supportOverdue,
      pendingPayments,
      processingPayments,
      recentAudit,
    ] = await Promise.all([
      db.collection('messages').countDocuments({ createdAt: { $gte: dayAgo } }),
      db.collection('messages').countDocuments({ createdAt: { $gte: dayAgo }, status: 'failed' }),
      db.collection('messages').countDocuments({ status: 'queued' }),
      db.collection('supporttickets').countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      db.collection('supporttickets').countDocuments({ status: { $in: ['open', 'in-progress'] }, slaDueAt: { $lt: now } }),
      db.collection('payments').countDocuments({ status: 'pending' }),
      db.collection('payments').countDocuments({ status: 'processing' }),
      db.collection('admin_audit_logs').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

    const activeAlerts = failedMessages24h + supportOverdue + processingPayments;
    const healthScore = Math.max(60, 100 - Math.min(activeAlerts * 3, 35));

    return res.json({
      success: true,
      data: {
        generatedAt: now,
        summary: {
          systemStatus: activeAlerts > 0 ? 'degraded' : 'operational',
          healthScore,
          activeAlerts,
          messages24h,
          failedMessages24h,
        },
        services: [
          {
            name: 'API Server',
            status: 'healthy',
            metricLabel: 'Messages (24h)',
            metricValue: messages24h,
          },
          {
            name: 'Message Queue',
            status: queuedNow > 500 ? 'warning' : 'healthy',
            metricLabel: 'Queued now',
            metricValue: queuedNow,
          },
          {
            name: 'Support Queue',
            status: supportOverdue > 0 ? 'warning' : 'healthy',
            metricLabel: 'Open tickets',
            metricValue: supportOpen,
          },
          {
            name: 'Payments Pipeline',
            status: processingPayments > 30 ? 'warning' : 'healthy',
            metricLabel: 'Pending + Processing',
            metricValue: pendingPayments + processingPayments,
          },
        ],
        incidents: [
          ...(failedMessages24h > 0
            ? [{ severity: 'warning', service: 'Messaging', detail: `${failedMessages24h} failed messages in last 24h` }]
            : []),
          ...(supportOverdue > 0
            ? [{ severity: 'warning', service: 'Support', detail: `${supportOverdue} overdue support tickets` }]
            : []),
          ...(processingPayments > 0
            ? [{ severity: 'warning', service: 'Billing', detail: `${processingPayments} payments stuck in processing` }]
            : []),
        ],
        auditTrail: recentAudit,
      },
    });
  } catch (error) {
    logger.error('observability snapshot error', error);
    return res.status(500).json({ success: false, message: 'Failed to build observability snapshot' });
  }
});

/**
 * GET /api/admin/analytics/revenue-projections
 * Revenue forecast snapshot for superadmin analytics
 */
router.get('/analytics/revenue-projections', async (req, res) => {
  try {
    const scenario = String(req.query?.scenario || 'base').toLowerCase();
    const scenarioRates = {
      base: { monthlyGrowthRate: 0.03, monthlyChurnRate: 0.015 },
      optimistic: { monthlyGrowthRate: 0.06, monthlyChurnRate: 0.01 },
      conservative: { monthlyGrowthRate: 0.015, monthlyChurnRate: 0.03 },
    };

    const rates = scenarioRates[scenario] || scenarioRates.base;
    const db = mongoose.connection.db;
    const now = new Date();
    const next30 = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const next60 = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000));
    const next90 = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    const activeSubscriptions = await db.collection('subscriptions').aggregate([
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: 'accountId',
          as: 'account',
        },
      },
      {
        $addFields: {
          accountDoc: { $arrayElemAt: ['$account', 0] },
          isInternalAccount: { $ifNull: ['$accountDoc.isInternal', false] },
        },
      },
      {
        $match: {
          status: 'active',
          isInternalAccount: { $ne: true },
        },
      },
      {
        $project: {
          amount: { $ifNull: ['$amount', 0] },
          billingCycle: { $toLower: { $ifNull: ['$billingCycle', 'monthly'] } },
          renewalDate: 1,
          accountId: 1,
        },
      },
    ]).toArray();

    const normalizeToMonthly = (sub) => {
      const amount = Number(sub?.amount || 0);
      const cycle = String(sub?.billingCycle || 'monthly');
      if (cycle === 'yearly' || cycle === 'annual') return amount / 12;
      if (cycle === 'quarterly') return amount / 3;
      return amount;
    };

    const mrrCurrent = activeSubscriptions.reduce((sum, sub) => sum + normalizeToMonthly(sub), 0);
    const arrCurrent = mrrCurrent * 12;

    const renewalPipeline = {
      next30Days: 0,
      next60Days: 0,
      next90Days: 0,
    };

    activeSubscriptions.forEach((sub) => {
      const date = sub?.renewalDate ? new Date(sub.renewalDate) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      if (date <= next30) renewalPipeline.next30Days += 1;
      if (date > next30 && date <= next60) renewalPipeline.next60Days += 1;
      if (date > next60 && date <= next90) renewalPipeline.next90Days += 1;
    });

    const churnRisk = await db.collection('payments').countDocuments({
      status: { $in: ['failed', 'cancelled'] },
      createdAt: { $gte: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)) },
    });

    const projection = [];
    let projectedMrr = mrrCurrent;
    for (let month = 1; month <= 6; month += 1) {
      const growthImpact = projectedMrr * rates.monthlyGrowthRate;
      const churnImpact = projectedMrr * rates.monthlyChurnRate;
      projectedMrr = Math.max(projectedMrr + growthImpact - churnImpact, 0);

      projection.push({
        month,
        projectedMrr: Number(projectedMrr.toFixed(2)),
        projectedArr: Number((projectedMrr * 12).toFixed(2)),
        growthImpact: Number(growthImpact.toFixed(2)),
        churnImpact: Number(churnImpact.toFixed(2)),
      });
    }

    return res.json({
      success: true,
      data: {
        scenario: scenarioRates[scenario] ? scenario : 'base',
        generatedAt: now,
        summary: {
          mrrCurrent: Number(mrrCurrent.toFixed(2)),
          arrCurrent: Number(arrCurrent.toFixed(2)),
          activeSubscriptions: activeSubscriptions.length,
          churnRiskAccounts: churnRisk,
        },
        renewalPipeline,
        projection,
      },
    });
  } catch (error) {
    logger.error('revenue projections error', error);
    return res.status(500).json({ success: false, message: 'Failed to generate revenue projections' });
  }
});

export default router;
