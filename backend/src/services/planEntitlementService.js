import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';
import PricingPlan from '../models/PricingPlan.js';
import {
  ROUTE_ENTITLEMENT_MAP,
  catalogForProductLine,
} from '../config/planFeatureCatalog.js';

function mapToObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value === 'object') return value;
  return {};
}

export async function resolvePricingPlanForAccount(accountId, productLine = 'whatsapp') {
  const subscription = await Subscription.findOne({
    accountId,
    status: 'active',
    $or: [{ productLine }, { productLine: { $exists: false } }],
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!subscription) return null;

  if (subscription.pricingPlanId) {
    const byId = await PricingPlan.findOne({ planId: subscription.pricingPlanId, isActive: true }).lean();
    if (byId) return byId;
  }

  const plan = await PricingPlan.findOne({
    name: subscription.planName,
    productLine,
    isActive: true,
  }).lean();

  return plan;
}

export async function getAccountEntitlements(accountId) {
  const account = await Account.findOne({ accountId }).lean();
  if (!account) return { whatsapp: null, healthcare: null };

  const lines = ['whatsapp', 'healthcare'];
  const result = {};

  for (const productLine of lines) {
    const plan = await resolvePricingPlanForAccount(accountId, productLine);
    if (!plan) {
      result[productLine] = null;
      continue;
    }
    result[productLine] = {
      planId: plan.planId,
      planName: plan.name,
      productLine: plan.productLine || productLine,
      entitlements: mapToObject(plan.entitlements),
      limits: plan.limits || {},
      features: plan.features?.included || [],
    };
  }

  return result;
}

export function hasEntitlement(plan, key) {
  if (!plan) return false;
  const ent = mapToObject(plan.entitlements);
  if (ent[key] === true) return true;
  const included = plan.features?.included || [];
  return included.includes(key);
}

function subscriptionHasEntitlement(subscription, key) {
  if (!subscription) return false;
  const ent = mapToObject(subscription.entitlements);
  if (ent[key] === true) return true;
  const included = subscription.features?.included;
  if (Array.isArray(included) && included.includes(key)) return true;
  return false;
}

export async function checkEntitlement(accountId, key, productLine = 'whatsapp') {
  const account = await Account.findOne({ accountId }).lean();
  if (!account) return { allowed: false, reason: 'ACCOUNT_NOT_FOUND' };
  if (account.isInternal || account.type === 'internal') {
    return { allowed: true, reason: 'INTERNAL' };
  }

  const subscription = await Subscription.findOne({
    accountId,
    status: 'active',
    $or: [{ productLine }, { productLine: { $exists: false } }],
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (subscriptionHasEntitlement(subscription, key)) {
    return { allowed: true, planName: subscription.planName, productLine };
  }

  const plan = await resolvePricingPlanForAccount(accountId, productLine);
  if (!plan) {
    return { allowed: false, reason: 'NO_ACTIVE_PLAN', productLine, key };
  }

  if (!hasEntitlement(plan, key)) {
    return { allowed: false, reason: 'FEATURE_NOT_IN_PLAN', planName: plan.name, key, productLine };
  }

  return { allowed: true, planName: plan.name, productLine };
}

export function resolveRouteEntitlement(path) {
  const sorted = [...ROUTE_ENTITLEMENT_MAP].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (path.startsWith(entry.prefix)) {
      return entry;
    }
  }
  return null;
}

export function getPublicCatalog(productLine) {
  return catalogForProductLine(productLine);
}

export default {
  resolvePricingPlanForAccount,
  getAccountEntitlements,
  hasEntitlement,
  checkEntitlement,
  resolveRouteEntitlement,
  getPublicCatalog,
};
