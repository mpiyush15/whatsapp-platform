import planEntitlementService from '../services/planEntitlementService.js';
import logger from '../utils/logger.js';

/**
 * Gate routes by plan entitlement key (after requireJWT + requireSubscription).
 * Usage: requirePlanFeature('hc_patients', 'healthcare')
 */
export function requirePlanFeature(entitlementKey, productLine = 'whatsapp') {
  return async (req, res, next) => {
    try {
      const accountId = req.accountId || req.user?.accountId;
      if (!accountId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const check = await planEntitlementService.checkEntitlement(
        accountId,
        entitlementKey,
        productLine
      );

      if (!check.allowed) {
        logger.info('Plan feature blocked', { accountId, entitlementKey, productLine, reason: check.reason });
        return res.status(403).json({
          success: false,
          message: `Your plan does not include this feature. Upgrade to unlock ${entitlementKey}.`,
          code: 'PLAN_FEATURE_LOCKED',
          productLine,
          feature: entitlementKey,
          planName: check.planName || null,
          upgradeUrl: '/pricing',
        });
      }

      req.planFeature = check;
      return next();
    } catch (err) {
      logger.error('requirePlanFeature error', err);
      return res.status(500).json({ success: false, message: 'Could not verify plan access' });
    }
  };
}

/**
 * Auto-detect entitlement from request path using ROUTE_ENTITLEMENT_MAP.
 */
export async function requirePlanFeatureFromPath(req, res, next) {
  const entry = planEntitlementService.resolveRouteEntitlement(req.path || req.originalUrl || '');
  if (!entry) return next();
  return requirePlanFeature(entry.key, entry.productLine)(req, res, next);
}

export default requirePlanFeature;
