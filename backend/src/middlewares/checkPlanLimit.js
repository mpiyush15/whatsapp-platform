import planLimitService, { resolveQuotaResource } from '../services/planLimitService.js';
import Subscription from '../models/Subscription.js';
import Account from '../models/Account.js';

function quotaExceededPayload(check, message) {
  return {
    success: false,
    code: 'QUOTA_EXCEEDED',
    resource: check.resource,
    error: message || `${check.resource} limit reached`,
    limit: check.limit,
    used: check.used,
    upgradeCta: '/dashboard/features/billing',
    topupCta: '/dashboard/features/billing',
  };
}

async function ensureActiveSubscription(req) {
  const accountId = req.user?.accountId || req.account?.accountId;
  if (!accountId) {
    return { ok: false, status: 401, body: { success: false, error: 'Unauthorized' } };
  }

  if (req.account?.isInternal === true) {
    return { ok: true, accountId, internal: true };
  }

  const account = req.account?._id
    ? await Account.findById(req.account._id).select('isInternal limits').lean()
    : await Account.findOne({ accountId }).select('isInternal limits').lean();

  if (account?.isInternal) {
    req.account = { ...req.account, isInternal: true };
    return { ok: true, accountId, internal: true };
  }

  const subscription = await Subscription.findOne({ accountId, status: 'active' }).lean();
  if (!subscription) {
    return {
      ok: false,
      status: 403,
      body: { success: false, error: 'Active subscription required' },
    };
  }

  return { ok: true, accountId, internal: false };
}

/**
 * Enforce plan numeric limits (from superadmin PricingPlan.limits).
 * @param {string} resourceType - catalog key or alias (message → messages)
 */
export function checkPlanLimit(resourceType) {
  const catalogKey = resolveQuotaResource(resourceType);

  return async (req, res, next) => {
    try {
      const gate = await ensureActiveSubscription(req);
      if (!gate.ok) return res.status(gate.status).json(gate.body);
      if (gate.internal) return next();

      const projectId = req.projectId || req.params?.projectId || null;
      const check = await planLimitService.checkLimit(gate.accountId, catalogKey, projectId);

      if (!check.allowed) {
        return res.status(429).json(quotaExceededPayload(check));
      }

      req.planLimitCheck = check;
      return next();
    } catch (error) {
      console.error('checkPlanLimit error:', error);
      return res.status(500).json({ success: false, error: 'Quota check failed' });
    }
  };
}

export default checkPlanLimit;
