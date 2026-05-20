import PhoneNumber from '../models/PhoneNumber.js';
import Conversation from '../models/Conversation.js';

const projectCache = new Map();
const CACHE_TTL_MS = 60_000;

/**
 * Resolve projectId for an inbound WhatsApp message (phone line → project).
 */
export async function resolveProjectIdForPhone(accountId, phoneNumberId) {
  if (!accountId || !phoneNumberId) return null;

  const cacheKey = `${accountId}:${phoneNumberId}`;
  const cached = projectCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.projectId;
  }

  const phone = await PhoneNumber.findOne({ accountId, phoneNumberId, isActive: true })
    .select('projectId')
    .lean();

  let projectId = phone?.projectId || null;

  if (!projectId) {
    const convo = await Conversation.findOne({ accountId, phoneNumberId })
      .sort({ lastMessageAt: -1 })
      .select('projectId')
      .lean();
    projectId = convo?.projectId || null;
  }

  projectCache.set(cacheKey, { projectId, expiresAt: Date.now() + CACHE_TTL_MS });
  return projectId;
}

/**
 * Mongo filter: rules that apply to this phone line + project.
 * Includes project-specific rules and account-wide rules (projectId null).
 */
export function buildKeywordRuleQuery(accountId, phoneNumberId, projectId = null) {
  const query = {
    accountId,
    isActive: true,
    $or: [{ phoneNumberId }, { phoneNumberId: null }],
  };

  if (projectId) {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { projectId },
          { projectId: null },
          { projectId: { $exists: false } },
        ],
      },
    ];
  }

  return query;
}

export function buildActiveSessionQuery(accountId, contactPhone, phoneNumberId = null, projectId = null) {
  const cleanPhone = String(contactPhone || '').replace(/[\s+()-]/g, '');
  const query = {
    accountId,
    contactPhone: cleanPhone,
    status: 'active',
  };

  if (phoneNumberId) {
    query.phoneNumberId = phoneNumberId;
  }

  if (projectId) {
    query.$and = [
      {
        $or: [{ projectId }, { projectId: null }, { projectId: { $exists: false } }],
      },
    ];
  }

  return query;
}

export default {
  resolveProjectIdForPhone,
  buildKeywordRuleQuery,
  buildActiveSessionQuery,
};
