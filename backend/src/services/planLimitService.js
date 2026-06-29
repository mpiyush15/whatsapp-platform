import Account from '../models/Account.js';
import Subscription from '../models/Subscription.js';
import Message from '../models/Message.js';
import Contact from '../models/Contact.js';
import PhoneNumber from '../models/PhoneNumber.js';
import Campaign from '../models/Campaign.js';
import Template from '../models/Template.js';
import Agent from '../models/Agent.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';

/** Resource keys aligned with planFeatureCatalog LIMIT_KEYS */
export const LIMIT_RESOURCE_KEYS = [
  'messages',
  'contacts',
  'campaigns',
  'templates',
  'phoneNumbers',
  'users',
  'apiCalls',
  'storageGB',
  'chatbots',
  'patients',
  'appointments',
  'prescriptions',
  'doctors',
  'healthcareUsers',
];

const MONTHLY_RESOURCES = new Set([
  'messages',
  'campaigns',
  'apiCalls',
  'appointments',
  'prescriptions',
]);

function startOfCalendarMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfLast24Hours() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

function mapToObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value === 'object') return value;
  return {};
}

/**
 * Resolve numeric limits for an account from active subscription + account fallbacks.
 */
export async function getResolvedLimits(accountId) {
  const [account, subscription] = await Promise.all([
    Account.findOne({ accountId }).select('limits isInternal type').lean(),
    Subscription.findOne({ accountId, status: 'active' }).sort({ updatedAt: -1 }).lean(),
  ]);

  if (account?.isInternal || account?.type === 'internal') {
    return { isInternal: true, limits: {}, subscription: null, account };
  }

  const planLimits = mapToObject(subscription?.planLimits);
  const features = subscription?.features || {};
  const accountLimits = account?.limits || {};

  const messagesFromPlan = Number(planLimits.messages);
  const messagesLegacy = Number(features.messagesPerDay ?? accountLimits.messagesPerDay);

  const limits = {
    messages: Number.isFinite(messagesFromPlan)
      ? messagesFromPlan
      : (Number.isFinite(messagesLegacy) ? messagesLegacy : 0),
    contacts: pickLimit(planLimits.contacts, features.contacts, accountLimits.contacts),
    campaigns: pickLimit(planLimits.campaigns),
    templates: pickLimit(planLimits.templates),
    phoneNumbers: pickLimit(planLimits.phoneNumbers, features.phoneNumbers, accountLimits.phoneNumbers),
    users: pickLimit(planLimits.users),
    apiCalls: pickLimit(planLimits.apiCalls),
    storageGB: pickLimit(planLimits.storageGB),
    chatbots: pickLimit(planLimits.chatbots),
    patients: pickLimit(planLimits.patients),
    appointments: pickLimit(planLimits.appointments),
    prescriptions: pickLimit(planLimits.prescriptions),
    doctors: pickLimit(planLimits.doctors),
    healthcareUsers: pickLimit(planLimits.healthcareUsers),
  };

  return { isInternal: false, limits, subscription, account };
}

function pickLimit(...candidates) {
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function usageQuery(accountId, projectId, resourceType) {
  const base = { accountId };
  if (projectId) base.projectId = projectId;

  if (MONTHLY_RESOURCES.has(resourceType)) {
    return { ...base, createdAt: { $gte: startOfCalendarMonth() } };
  }
  return base;
}

export async function countUsage(accountId, resourceType, projectId = null) {
  const q = (extra = {}) => {
    const base = usageQuery(accountId, projectId, resourceType);
    return { ...base, ...extra };
  };

  switch (resourceType) {
    case 'messages':
      return Message.countDocuments({
        accountId,
        ...(projectId ? { projectId } : {}),
        createdAt: { $gte: MONTHLY_RESOURCES.has('messages') ? startOfCalendarMonth() : startOfLast24Hours() },
      });
    case 'contacts':
      return Contact.countDocuments(q());
    case 'campaigns':
      return Campaign.countDocuments(q());
    case 'templates':
      return Template.countDocuments({ accountId, ...(projectId ? { projectId } : {}) });
    case 'phoneNumbers':
      return PhoneNumber.countDocuments({ accountId });
    case 'users':
      return Agent.countDocuments({ accountId, status: { $in: ['active', 'on-leave'] } });
    case 'patients':
      return Patient.countDocuments(q());
    case 'doctors':
      return Doctor.countDocuments(q());
    case 'appointments':
      return Appointment.countDocuments(q());
    case 'prescriptions':
      return Prescription.countDocuments(q());
    case 'apiCalls':
    case 'storageGB':
    case 'chatbots':
      return 0;
    default:
      return 0;
  }
}

export async function checkLimit(accountId, resourceType, projectId = null) {
  const resolved = await getResolvedLimits(accountId);
  if (resolved.isInternal) {
    return { allowed: true, isInternal: true, limit: null, used: 0, resource: resourceType };
  }

  const limit = Number(resolved.limits[resourceType] ?? 0);
  if (!Number.isFinite(limit) || limit <= 0) {
    return { allowed: true, isInternal: false, limit: 0, used: 0, resource: resourceType, unlimited: true };
  }

  const used = await countUsage(accountId, resourceType, projectId);
  return {
    allowed: used < limit,
    isInternal: false,
    limit,
    used,
    resource: resourceType,
    unlimited: false,
  };
}

/** Map checkProjectQuota resource aliases to catalog keys */
export const QUOTA_ALIAS = {
  message: 'messages',
  contact: 'contacts',
  phoneNumber: 'phoneNumbers',
  campaign: 'campaigns',
  template: 'templates',
  user: 'users',
  patient: 'patients',
  doctor: 'doctors',
  appointment: 'appointments',
  prescription: 'prescriptions',
};

export function resolveQuotaResource(resourceType) {
  return QUOTA_ALIAS[resourceType] || resourceType;
}

/** Lowest non-zero per-message credit cost (env-driven). */
export function minimumBillableCreditCost() {
  const costs = [
    Number(process.env.CREDIT_COST_MARKETING || 1),
    Number(process.env.CREDIT_COST_UTILITY || 1),
    Number(process.env.CREDIT_COST_AUTHENTICATION || 1),
    Number(process.env.CREDIT_COST_SERVICE || 0),
  ].filter((n) => n > 0);
  return costs.length ? Math.min(...costs) : 1;
}

/**
 * Included plan messages are free; beyond quota each send needs credits.
 */
export async function getMessageBillingMode(accountId, projectId = null) {
  const check = await checkLimit(accountId, 'messages', projectId);
  if (check.isInternal || check.unlimited || check.allowed) {
    return { mode: 'included', ...check };
  }
  return { mode: 'credits', ...check };
}

export async function canSendMessageWithCredits(accountId, projectId = null) {
  const billing = await getMessageBillingMode(accountId, projectId);
  if (billing.mode === 'included') {
    return { allowed: true, billingMode: 'included', ...billing };
  }

  const account = await Account.findOne({ accountId }).select('creditBalance isInternal').lean();
  const balance = Number(account?.creditBalance || 0);
  const minCost = minimumBillableCreditCost();

  return {
    allowed: balance >= minCost,
    billingMode: 'credits',
    creditBalance: balance,
    creditsRequired: minCost,
    ...billing,
  };
}

export default {
  getResolvedLimits,
  countUsage,
  checkLimit,
  resolveQuotaResource,
  minimumBillableCreditCost,
  getMessageBillingMode,
  canSendMessageWithCredits,
  LIMIT_RESOURCE_KEYS,
};
