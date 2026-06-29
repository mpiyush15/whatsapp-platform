import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Message from '../models/Message.js';
import Campaign from '../models/Campaign.js';
import Lead from '../models/Lead.js';
import Project from '../models/Project.js';
import PhoneNumber from '../models/PhoneNumber.js';
import AccountCreditLedger from '../models/AccountCreditLedger.js';
import { AccountType } from '../constants/enums.js';
import { estimateMetaCostInr } from '../config/metaMessagePricing.js';
import { classifyOutboundMessage } from '../utils/messageCategory.js';
import { sanitizeTags } from '../utils/validateTags.js';
import Contact from '../models/Contact.js';
import { normalizePhone } from '../utils/normalizePhone.js';
import logger from '../utils/logger.js';

const MS_DAY = 24 * 60 * 60 * 1000;
const OBJECT_ID_CAMPAIGN = /^[a-f0-9]{24}$/i;
const PROJECT_VERTICALS = ['whatsapp', 'healthcare', 'ecommerce', 'education', 'salon', 'pathology', 'general'];
const DEFAULT_PROJECT_VERTICAL = 'whatsapp';

function normalizeProjectVertical(value) {
  const key = String(value || DEFAULT_PROJECT_VERTICAL).toLowerCase();
  return PROJECT_VERTICALS.includes(key) ? key : DEFAULT_PROJECT_VERTICAL;
}

function verticalCountsFromRows(rows = []) {
  const counts = {};
  for (const row of rows) {
    const vertical = normalizeProjectVertical(row._id?.vertical ?? row.vertical);
    const count = row.count ?? 1;
    counts[vertical] = (counts[vertical] || 0) + count;
  }
  return counts;
}

function verticalsListFromCounts(counts = {}) {
  return Object.keys(counts).filter((k) => counts[k] > 0).sort();
}

function assertInternalSuperadmin(req) {
  if (req.account?.type !== 'internal') {
    const err = new Error('FORBIDDEN');
    err.statusCode = 403;
    throw err;
  }
}

function parseDays(query, fallback = 30) {
  return Math.min(365, Math.max(1, parseInt(query?.days, 10) || fallback));
}

function periodRange(days) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * MS_DAY);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end, days };
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** Zero-fill every calendar day in range so charts always have complete series. */
function fillDailyVolumeSeries(aggRows, start, end) {
  const map = new Map();
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    const key = new Date(t).toISOString().slice(0, 10);
    map.set(key, { date: key, inbound: 0, outbound: 0, total: 0 });
  }

  for (const row of aggRows) {
    const day = row._id?.day;
    if (!day || !map.has(day)) continue;
    const entry = map.get(day);
    entry.inbound = Number(row.inbound || 0);
    entry.outbound = Number(row.outbound || 0);
    entry.total = entry.inbound + entry.outbound;
  }

  return Array.from(map.values());
}

function buildVolumeSummary(dailySeries, overview) {
  const peak =
    dailySeries.length > 0
      ? dailySeries.reduce((best, d) => (d.total > best.total ? d : best), dailySeries[0])
      : { date: null, total: 0, inbound: 0, outbound: 0 };

  const daysWithData = dailySeries.filter((d) => d.total > 0).length;
  const dayCount = dailySeries.length || 1;

  return {
    peakDay: peak.date,
    peakTotal: peak.total,
    peakOutbound: peak.outbound,
    avgMessagesPerDay: Math.round((overview.total || 0) / dayCount),
    avgOutboundPerDay: Math.round((overview.outbound || 0) / dayCount),
    daysWithActivity: daysWithData,
    dayCount,
  };
}

export async function getPlatformOverview() {
  const db = mongoose.connection.db;
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const clientFilter = { type: { $in: [AccountType.CLIENT, 'client', 'agency'] }, isInternal: { $ne: true } };

  const [
    activeCustomers,
    newCustomers,
    pendingCustomers,
    activeSubscriptions,
    subscriptions,
    messages24h,
    pendingPayments,
  ] = await Promise.all([
    Account.countDocuments({ ...clientFilter, status: 'active' }),
    Account.countDocuments({ ...clientFilter, createdAt: { $gte: firstDayOfMonth } }),
    Account.countDocuments({ ...clientFilter, status: 'pending' }),
    db.collection('subscriptions').countDocuments({ status: 'active' }),
    db.collection('subscriptions').find({ status: 'active' }).toArray(),
    Message.countDocuments({
      createdAt: { $gte: new Date(Date.now() - MS_DAY) },
    }),
    db.collection('payments').countDocuments({
      status: { $in: ['pending', 'processing', 'PENDING', 'ACTIVE'] },
      lifecycleState: { $in: ['pending', 'processing', null] },
    }),
  ]);

  const normalizeMonthly = (sub) => {
    const amount = Number(sub?.amount || sub?.monthlyPrice || 0);
    const cycle = String(sub?.billingCycle || 'monthly').toLowerCase();
    if (cycle === 'yearly' || cycle === 'annual') return amount / 12;
    if (cycle === 'quarterly') return amount / 3;
    return amount;
  };

  const mrr = subscriptions.reduce((sum, sub) => sum + normalizeMonthly(sub), 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * MS_DAY);
  const [cancelledRecently, activeAtPeriodStart] = await Promise.all([
    db.collection('subscriptions').countDocuments({
      status: { $in: ['cancelled', 'expired', 'inactive'] },
      updatedAt: { $gte: thirtyDaysAgo },
    }),
    db.collection('subscriptions').countDocuments({
      createdAt: { $lte: thirtyDaysAgo },
    }),
  ]);

  const churnRate =
    activeAtPeriodStart > 0
      ? Math.round((cancelledRecently / activeAtPeriodStart) * 1000) / 10
      : 0;

  const creditsAgg = await AccountCreditLedger.aggregate([
    {
      $match: {
        entryType: 'usage_debit',
        status: 'posted',
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    { $group: { _id: null, credits: { $sum: { $abs: '$amount' } } } },
  ]);

  return {
    activeCustomers,
    newCustomers,
    pendingCustomers,
    activeSubscriptions,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    churnRate,
    totalMessages24h: messages24h,
    pendingPayments,
    creditsUsed30d: Number(creditsAgg[0]?.credits || 0),
  };
}

export async function getOrgStatsMap(accountIds = []) {
  const ids = [...new Set(accountIds.filter(Boolean))];
  const empty = new Map();
  if (!ids.length) return empty;

  const sevenDaysAgo = new Date(Date.now() - 7 * MS_DAY);

  const [projectAgg, verticalAgg, phoneAgg, msgAgg] = await Promise.all([
    Project.aggregate([
      { $match: { accountId: { $in: ids } } },
      {
        $group: {
          _id: '$accountId',
          projectCount: { $sum: 1 },
          connectedProjects: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $ifNull: ['$whatsappPhoneNumberId', ''] }, ''] },
                    { $ne: ['$whatsappPhoneNumberId', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Project.aggregate([
      { $match: { accountId: { $in: ids } } },
      {
        $group: {
          _id: { accountId: '$accountId', vertical: { $ifNull: ['$vertical', DEFAULT_PROJECT_VERTICAL] } },
          count: { $sum: 1 },
        },
      },
    ]),
    PhoneNumber.aggregate([
      { $match: { accountId: { $in: ids }, isActive: { $ne: false } } },
      { $group: { _id: '$accountId', phoneCount: { $sum: 1 } } },
    ]),
    Message.aggregate([
      { $match: { accountId: { $in: ids }, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$accountId', messages7d: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map();
  for (const id of ids) {
    map.set(id, {
      projectCount: 0,
      connectedProjects: 0,
      phoneCount: 0,
      messages7d: 0,
      hasMultipleProjects: false,
      projectsByVertical: {},
      verticals: [],
      hasMultipleVerticals: false,
    });
  }
  for (const row of verticalAgg) {
    const accountId = row._id?.accountId;
    if (!accountId) continue;
    const cur = map.get(accountId) || {};
    const vertical = normalizeProjectVertical(row._id?.vertical);
    const projectsByVertical = { ...(cur.projectsByVertical || {}) };
    projectsByVertical[vertical] = (projectsByVertical[vertical] || 0) + row.count;
    const verticals = verticalsListFromCounts(projectsByVertical);
    map.set(accountId, {
      ...cur,
      projectsByVertical,
      verticals,
      hasMultipleVerticals: verticals.length > 1,
    });
  }
  for (const row of projectAgg) {
    const cur = map.get(row._id) || {};
    map.set(row._id, {
      ...cur,
      projectCount: row.projectCount,
      connectedProjects: row.connectedProjects,
      hasMultipleProjects: row.projectCount > 1,
    });
  }
  for (const row of phoneAgg) {
    const cur = map.get(row._id) || {};
    map.set(row._id, { ...cur, phoneCount: row.phoneCount });
  }
  for (const row of msgAgg) {
    const cur = map.get(row._id) || {};
    map.set(row._id, { ...cur, messages7d: row.messages7d });
  }
  return map;
}

export async function getPlatformProjectStats() {
  const [totalProjects, multiAgg, connectedPhones, byVertical, mixedVerticalOrgs] =
    await Promise.all([
      Project.countDocuments({}),
      Project.aggregate([
        { $group: { _id: '$accountId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'orgsWithMultipleProjects' },
      ]),
      PhoneNumber.countDocuments({ isActive: { $ne: false } }),
      Project.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$vertical', DEFAULT_PROJECT_VERTICAL] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Project.aggregate([
        {
          $group: {
            _id: '$accountId',
            verticals: { $addToSet: { $ifNull: ['$vertical', DEFAULT_PROJECT_VERTICAL] } },
          },
        },
        { $match: { $expr: { $gt: [{ $size: '$verticals' }, 1] } } },
        { $count: 'orgsWithMixedVerticals' },
      ]),
    ]);

  const projectsByVertical = byVertical.map((row) => ({
    vertical: normalizeProjectVertical(row._id),
    count: row.count,
  }));

  return {
    totalProjects,
    orgsWithMultipleProjects: multiAgg[0]?.orgsWithMultipleProjects ?? 0,
    totalConnectedPhones: connectedPhones,
    projectsByVertical,
    orgsWithMixedVerticals: mixedVerticalOrgs[0]?.orgsWithMixedVerticals ?? 0,
    verticalsInUse: projectsByVertical.map((r) => r.vertical),
  };
}

function attachOrgStats(org, statsMap) {
  const stats = statsMap.get(org.accountId) || {
    projectCount: 0,
    connectedProjects: 0,
    phoneCount: 0,
    messages7d: 0,
    hasMultipleProjects: false,
    projectsByVertical: {},
    verticals: [],
    hasMultipleVerticals: false,
  };
  return { ...org, ...stats };
}

export async function getRecentOrganizations(limit = 10) {
  const orgs = await Account.find({
    type: { $in: [AccountType.CLIENT, 'client', 'agency'] },
  })
    .select('accountId name email plan status createdAt company isInternal type')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const mapped = orgs.map((o) => ({
    id: o.accountId,
    accountId: o.accountId,
    name: o.name,
    email: o.email,
    plan: o.plan || '—',
    status: o.status || 'pending',
    createdAt: o.createdAt,
    company: o.company,
    isInternal: Boolean(o.isInternal),
    type: o.type,
  }));

  const statsMap = await getOrgStatsMap(mapped.map((o) => o.accountId));
  return mapped.map((o) => attachOrgStats(o, statsMap));
}

export async function getSuperadminDashboard() {
  const [overview, projectStats, analytics7d, organizations, signupDaily] = await Promise.all([
    getPlatformOverview(),
    getPlatformProjectStats(),
    getPlatformAnalytics({ days: 7 }),
    getRecentOrganizations(5),
    Account.aggregate([
      {
        $match: {
          type: { $in: [AccountType.CLIENT, 'client', 'agency'] },
          createdAt: { $gte: new Date(Date.now() - 7 * MS_DAY) },
        },
      },
      {
        $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]),
  ]);

  const signupMap = new Map();
  const end = new Date();
  const start = new Date(end.getTime() - 6 * MS_DAY);
  start.setHours(0, 0, 0, 0);
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    signupMap.set(new Date(t).toISOString().slice(0, 10), 0);
  }
  for (const row of signupDaily) {
    signupMap.set(row._id.day, row.count);
  }
  const signupsByDay = Array.from(signupMap.entries()).map(([date, count]) => ({ date, count }));

  const topOrgs = analytics7d.topOrganizations || [];
  const topIds = topOrgs.map((o) => o.accountId);
  const statsMap = await getOrgStatsMap(topIds);
  const topOrganizationsEnriched = topOrgs.map((o) => attachOrgStats(o, statsMap));

  return {
    overview: { ...overview, ...projectStats },
    dailyVolume: analytics7d.dailyVolume,
    signupsByDay,
    organizations,
    topOrganizations: topOrganizationsEnriched,
    projectStats,
  };
}

export async function getOrganizationOperationalDetail(accountId) {
  if (!accountId) {
    const err = new Error('accountId required');
    err.statusCode = 400;
    throw err;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * MS_DAY);

  const [projects, phones, messages7d, outbound7d] = await Promise.all([
    Project.find({ accountId })
      .select(
        'projectId name description isDefault status vertical whatsappPhoneNumber whatsappPhoneNumberId businessCategory createdAt'
      )
      .sort({ isDefault: -1, createdAt: -1 })
      .lean(),
    PhoneNumber.find({ accountId })
      .select('projectId displayPhone phone phoneNumberId isActive qualityRating connectedAt')
      .lean(),
    Message.countDocuments({ accountId, createdAt: { $gte: sevenDaysAgo } }),
    Message.countDocuments({
      accountId,
      direction: 'outbound',
      createdAt: { $gte: sevenDaysAgo },
    }),
  ]);

  const projectRows = projects.map((p) => ({
    projectId: p.projectId,
    name: p.name,
    isDefault: Boolean(p.isDefault),
    status: p.status,
    vertical: normalizeProjectVertical(p.vertical),
    businessCategory: p.businessCategory,
    whatsappConnected: Boolean(p.whatsappPhoneNumberId),
    displayNumber: p.whatsappPhoneNumber || null,
    createdAt: p.createdAt,
  }));

  const projectsByVertical = {};
  for (const p of projectRows) {
    projectsByVertical[p.vertical] = (projectsByVertical[p.vertical] || 0) + 1;
  }
  const verticals = verticalsListFromCounts(projectsByVertical);

  return {
    projectCount: projects.length,
    connectedProjectCount: projectRows.filter((p) => p.whatsappConnected).length,
    phoneLineCount: phones.length,
    activePhoneCount: phones.filter((p) => p.isActive !== false).length,
    messagesLast7d: messages7d,
    outboundLast7d: outbound7d,
    hasMultipleProjects: projects.length > 1,
    projectsByVertical,
    verticals,
    hasMultipleVerticals: verticals.length > 1,
    projects: projectRows,
    phones: phones.map((ph) => ({
      projectId: ph.projectId,
      displayPhone: ph.displayPhone || ph.phone,
      phoneNumberId: ph.phoneNumberId,
      isActive: ph.isActive !== false,
      qualityRating: ph.qualityRating,
      connectedAt: ph.connectedAt,
    })),
  };
}

async function aggregatePlatformMessageCosts(start, end) {
  const messages = await Message.find({
    direction: 'outbound',
    createdAt: { $gte: start, $lte: end },
  })
    .select('campaign messageType content.templateName accountId')
    .lean();

  const categoryCounts = { marketing: 0, utility: 0, authentication: 0, service: 0 };
  for (const msg of messages) {
    const cat = classifyOutboundMessage(msg);
    if (categoryCounts[cat] !== undefined) categoryCounts[cat] += 1;
    else categoryCounts.utility += 1;
  }

  return {
    ...estimateMetaCostInr(categoryCounts),
    outboundCount: messages.length,
  };
}

export async function getPlatformAnalytics(query = {}) {
  const days = parseDays(query);
  const { start, end } = periodRange(days);

  const [
    messageOverview,
    metaCosts,
    creditsAgg,
    topOrgsByMessages,
    dailyVolume,
    campaignStats,
  ] = await Promise.all([
    Message.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
          outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
          delivered: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$direction', 'outbound'] },
                    { $in: ['$status', ['delivered', 'read']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          read: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$direction', 'outbound'] }, { $eq: ['$status', 'read'] }],
                },
                1,
                0,
              ],
            },
          },
          failed: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$direction', 'outbound'] }, { $eq: ['$status', 'failed'] }],
                },
                1,
                0,
              ],
            },
          },
          activeAccounts: { $addToSet: '$accountId' },
        },
      },
    ]),
    aggregatePlatformMessageCosts(start, end),
    AccountCreditLedger.aggregate([
      {
        $match: {
          entryType: 'usage_debit',
          status: 'posted',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$metadata.category',
          credits: { $sum: { $abs: '$amount' } },
          messages: { $sum: 1 },
        },
      },
    ]),
    Message.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, direction: 'outbound' } },
      { $group: { _id: '$accountId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          },
          inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
          outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]),
    Campaign.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          sent: { $sum: { $ifNull: ['$stats.sent', 0] } },
        },
      },
    ]),
  ]);

  const overview = messageOverview[0] || {
    total: 0,
    inbound: 0,
    outbound: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    activeAccounts: [],
  };

  const outbound = overview.outbound || 0;
  const messagesSent = outbound;
  const deliveryRate = pct(overview.delivered, outbound);
  const failRate = pct(overview.failed, outbound);
  const dailySeries = fillDailyVolumeSeries(dailyVolume, start, end);
  const volumeSummary = buildVolumeSummary(dailySeries, overview);
  const activeOrganizations = Array.isArray(overview.activeAccounts)
    ? overview.activeAccounts.filter(Boolean).length
    : 0;

  const accountIds = topOrgsByMessages.map((r) => r._id).filter(Boolean);
  const accounts = await Account.find({ accountId: { $in: accountIds } })
    .select('accountId name email')
    .lean();
  const accountMap = new Map(accounts.map((a) => [a.accountId, a]));
  const orgStatsMap = await getOrgStatsMap(accountIds);
  const projectStats = await getPlatformProjectStats();

  return {
    period: { start: start.toISOString(), end: end.toISOString(), days },
    messaging: {
      total: overview.total,
      inbound: overview.inbound,
      outbound,
      messagesSent,
      delivered: overview.delivered,
      read: overview.read || 0,
      failed: overview.failed,
      deliveryRate,
      failRate,
      activeOrganizations,
      meta: metaCosts,
    },
    volumeSummary,
    credits: {
      byCategory: creditsAgg.map((r) => ({
        category: r._id || 'unknown',
        credits: Number(r.credits || 0),
        messages: Number(r.messages || 0),
      })),
      totalCredits: creditsAgg.reduce((s, r) => s + Number(r.credits || 0), 0),
    },
    platform: projectStats,
    topOrganizations: topOrgsByMessages.map((row) => {
      const stats = orgStatsMap.get(row._id) || {};
      return {
        accountId: row._id,
        name: accountMap.get(row._id)?.name || row._id,
        email: accountMap.get(row._id)?.email || '',
        outboundMessages: row.count,
        projectCount: stats.projectCount ?? 0,
        phoneCount: stats.phoneCount ?? 0,
        connectedProjects: stats.connectedProjects ?? 0,
        hasMultipleProjects: Boolean(stats.hasMultipleProjects),
        messages7d: stats.messages7d ?? 0,
      };
    }),
    dailyVolume: dailySeries,
    campaigns: {
      byStatus: campaignStats.map((c) => ({
        status: c._id,
        count: c.count,
        sent: c.sent,
      })),
      total: campaignStats.reduce((s, c) => s + c.count, 0),
    },
  };
}

export async function getPlatformCampaigns(query = {}) {
  const limit = Math.min(100, parseInt(query?.limit, 10) || 50);
  const campaigns = await Campaign.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const accountIds = [...new Set(campaigns.map((c) => c.accountId).filter(Boolean))];
  const accounts = await Account.find({ accountId: { $in: accountIds } })
    .select('accountId name email')
    .lean();
  const accountMap = new Map(accounts.map((a) => [a.accountId, a]));

  return campaigns.map((c) => ({
    id: String(c._id),
    name: c.name,
    accountId: c.accountId,
    accountName: accountMap.get(c.accountId)?.name || c.accountId,
    projectId: c.projectId,
    status: c.status,
    type: c.type,
    messageType: c.messageType,
    stats: c.stats || {},
    scheduledAt: c.scheduledAt,
    createdAt: c.createdAt,
    completedAt: c.completedAt,
  }));
}

export async function getPlatformLeads(query = {}) {
  const limit = query?.limit ? parseInt(query.limit, 10) : 1000;
  const filter = {};

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }
  if (query.search) {
    const s = String(query.search);
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { company: { $regex: s, $options: 'i' } },
    ];
  }

  const [leads, statsAgg] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const stats = {
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    stale: 0,
    averageScore: 0,
  };

  for (const row of statsAgg) {
    const key = row._id;
    if (key && stats[key] !== undefined) stats[key] = row.count;
    stats.total += row.count;
  }

  const avg = await Lead.aggregate([{ $group: { _id: null, avg: { $avg: '$score' } } }]);
  stats.averageScore = avg[0]?.avg ? Math.round(avg[0].avg) : 0;

  return { leads, stats };
}

export async function getPlatformContacts(query = {}) {
  const limit = query?.limit ? parseInt(query.limit, 10) : 1000;
  const filter = {};

  if (query.type && query.type !== 'all') {
    filter.type = query.type;
  }
  if (query.search) {
    const s = String(query.search);
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
    ];
  }

  const [contacts, statsAgg, totalAgg] = await Promise.all([
    mongoose.model('Contact').find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    mongoose.model('Contact').aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]),
    mongoose.model('Contact').countDocuments(filter)
  ]);

  const stats = {
    total: 0,
    customer: 0,
    lead: 0,
    other: 0,
  };

  for (const row of statsAgg) {
    const key = row._id;
    if (key && stats[key] !== undefined) stats[key] = row.count;
    stats.total += row.count;
  }

  return { contacts, stats, total: totalAgg };
}

export async function updatePlatformLead(leadId, body) {
  const updates = { updatedAt: new Date() };
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.conversionValue !== undefined) updates.conversionValue = body.conversionValue;
  if (body.source !== undefined) updates.source = body.source;
  const isValidDate = (val) => val && !isNaN(Date.parse(val));
  if (body.nextFollowUp !== undefined) updates.nextFollowUp = isValidDate(body.nextFollowUp) ? new Date(body.nextFollowUp) : null;
  if (Array.isArray(body.tags)) {
    // Sanitize tags to prevent injection and enforce limits
    updates.tags = sanitizeTags(body.tags);
  }
  if (body.demoScheduled !== undefined) updates.demoScheduled = isValidDate(body.demoScheduled) ? new Date(body.demoScheduled) : null;
  if (body.demoCompleted !== undefined) updates.demoCompleted = isValidDate(body.demoCompleted) ? new Date(body.demoCompleted) : null;
  if (body.demoMissed !== undefined) updates.demoMissed = body.demoMissed;
  if (body.vertical !== undefined) updates.vertical = body.vertical;
  if (body.location !== undefined) updates.location = body.location;

  // Validation: demoCompleted cannot be before demoScheduled
  if (updates.demoScheduled && updates.demoCompleted && new Date(updates.demoCompleted) < new Date(updates.demoScheduled)) {
    const err = new Error('Demo Completed date cannot be earlier than Demo Scheduled date');
    err.statusCode = 400;
    throw err;
  }

  const lead = await Lead.findByIdAndUpdate(
    leadId,
    { $set: updates },
    { new: true }
  );
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  // 2-Way Sync: Lead -> Contact
  if (lead && lead.phone) {
    try {
      const ACCOUNT_ID = '26042058';
      const PROJECT_ID = 'proj_1776957139168';
      const normalizedPhone = normalizePhone(lead.phone);
      
      if (normalizedPhone) {
        const contactUpdates = {};
        if (updates.tags) {
          const tags = Array.isArray(updates.tags) ? [...updates.tags] : [];
          if (!tags.includes('platform_lead')) tags.push('platform_lead');
          contactUpdates.tags = tags;
        }
        if (updates.location !== undefined) contactUpdates['customAttributes.area'] = updates.location;
        if (updates.vertical !== undefined) contactUpdates['customAttributes.vertical'] = updates.vertical;
        if (updates.status !== undefined) {
          const statusMap = {
            'converted': 'won',
            'negotiating': 'proposal',
            'stale': 'lost'
          };
          contactUpdates.leadStatus = statusMap[updates.status] || updates.status;
        }
        if (updates.conversionValue !== undefined) contactUpdates.leadValue = updates.conversionValue;
        if (updates.notes !== undefined) contactUpdates.notes = updates.notes;
        
        if (Object.keys(contactUpdates).length > 0) {
          await Contact.findOneAndUpdate(
            { 
              accountId: ACCOUNT_ID, 
              $or: [
                { whatsappNumber: normalizedPhone },
                { whatsappNumber: lead.phone },
                { phone: normalizedPhone },
                { phone: lead.phone }
              ]
            },
            { $set: contactUpdates },
            { new: true }
          );
        }
      }
    } catch (err) {
      if (typeof logger !== 'undefined') {
        logger.error('❌ Error syncing Lead -> Contact CRM in updatePlatformLead:', err.message);
      } else {
        console.error('❌ Error syncing Lead -> Contact CRM in updatePlatformLead:', err.message);
      }
    }
  }

  return lead;
}

export async function importPlatformLeads(leadsData) {
  if (!Array.isArray(leadsData) || leadsData.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const isValidDate = (val) => val && !isNaN(Date.parse(val));

  const ops = leadsData.map(data => {
    const allowedSources = ['manual', 'contact', 'api', 'webhook', 'import'];
    const parsedSource = allowedSources.includes(data.source) ? data.source : 'import';

    return {
      insertOne: {
        document: {
          accountId: data.accountId || 'crm-import',
          conversationId: `import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          contactId: new mongoose.Types.ObjectId(), // Dummy ID for imported leads
          phoneNumberId: 'import',
          name: data.name || 'Unknown',
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          intent: data.intent || 'inquiry',
          score: Number(data.score) || 50,
          status: data.status || 'new',
          notes: data.notes || '',
          conversionValue: Number(data.conversionValue) || 0,
          location: data.location || '',
          vertical: data.vertical || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          source: parsedSource,
          demoScheduled: isValidDate(data.demoScheduled) ? new Date(data.demoScheduled) : null,
          demoCompleted: isValidDate(data.demoCompleted) ? new Date(data.demoCompleted) : null,
          demoMissed: data.demoMissed === true || data.demoMissed === 'true',
          nextFollowUp: isValidDate(data.nextFollowUp) ? new Date(data.nextFollowUp) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    };
  });

  try {
    const result = await Lead.bulkWrite(ops, { ordered: false });

    // 2-Way Sync: Lead -> Contact for imported leads
    try {
      const ACCOUNT_ID = '26042058';
      const PROJECT_ID = 'proj_1776957139168';
      const contactOps = [];

      for (const data of leadsData) {
        if (!data.phone) continue;
        const normalizedPhone = normalizePhone(data.phone);
        if (!normalizedPhone) continue;

        const tags = Array.isArray(data.tags) ? [...data.tags] : [];
        if (!tags.includes('platform_lead')) tags.push('platform_lead');

        const updateSet = {
          projectId: PROJECT_ID,
          name: data.name || 'Unknown',
          phone: normalizedPhone,
          source: 'Import',
          type: 'lead',
        };
        if (data.email) updateSet.email = data.email;
        if (data.location) updateSet['customAttributes.area'] = data.location;
        if (data.vertical) updateSet['customAttributes.vertical'] = data.vertical;
        if (data.status) {
          const statusMap = {
            'converted': 'won',
            'negotiating': 'proposal',
            'stale': 'lost'
          };
          updateSet.leadStatus = statusMap[data.status] || data.status;
        }
        if (data.conversionValue) updateSet.leadValue = data.conversionValue;
        if (data.notes) updateSet.notes = data.notes;

        contactOps.push({
          updateOne: {
            filter: { accountId: ACCOUNT_ID, whatsappNumber: normalizedPhone },
            update: {
              $set: updateSet,
              $addToSet: { tags: { $each: tags } },
              $setOnInsert: {
                isOptedIn: true,
                createdAt: new Date()
              }
            },
            upsert: true
          }
        });
      }

      if (contactOps.length > 0) {
        await Contact.bulkWrite(contactOps, { ordered: false });
      }
    } catch (err) {
      if (typeof logger !== 'undefined') {
        logger.error('❌ Error syncing imported Leads -> Contact CRM:', err.message);
      } else {
        console.error('❌ Error syncing imported Leads -> Contact CRM:', err.message);
      }
    }

    return { imported: result.insertedCount, skipped: 0 };
  } catch (error) {
    // Return partial success if some failed (e.g. unique constraints)
    return { imported: error.insertedDocs?.length || 0, skipped: error.writeErrors?.length || ops.length, error: error.message };
  }
}

function rowsToCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col] ?? '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export async function buildExportCsv(dataset) {
  const db = mongoose.connection.db;
  const allowed = ['billing', 'usage', 'offers', 'health', 'audit', 'organizations', 'leads'];
  if (!allowed.includes(dataset)) {
    const err = new Error('Invalid dataset');
    err.statusCode = 400;
    throw err;
  }

  if (dataset === 'billing') {
    const payments = await db
      .collection('payments')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5000)
      .toArray();
    return rowsToCsv(
      payments.map((p) => ({
        orderId: p.orderId,
        accountId: p.accountId,
        amount: p.amount,
        status: p.status,
        planName: p.planName,
        createdAt: p.createdAt,
      })),
      ['orderId', 'accountId', 'amount', 'status', 'planName', 'createdAt']
    );
  }

  if (dataset === 'usage') {
    const messages = await Message.find({})
      .select('accountId direction status messageType createdAt campaign')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();
    return rowsToCsv(
      messages.map((m) => ({
        accountId: m.accountId,
        direction: m.direction,
        status: m.status,
        messageType: m.messageType,
        campaign: m.campaign,
        createdAt: m.createdAt,
      })),
      ['accountId', 'direction', 'status', 'messageType', 'campaign', 'createdAt']
    );
  }

  if (dataset === 'leads') {
    const leads = await Lead.find({})
      .select('name email phone intent score status accountId createdAt')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();
    return rowsToCsv(
      leads.map((l) => ({
        name: l.name,
        email: l.email,
        phone: l.phone,
        intent: l.intent,
        score: l.score,
        status: l.status,
        accountId: l.accountId,
        createdAt: l.createdAt,
      })),
      ['name', 'email', 'phone', 'intent', 'score', 'status', 'accountId', 'createdAt']
    );
  }

  if (dataset === 'organizations') {
    const orgs = await Account.find({ type: { $in: ['client', 'agency'] } })
      .select('accountId name email plan status creditBalance createdAt')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();
    return rowsToCsv(
      orgs.map((o) => ({
        accountId: o.accountId,
        name: o.name,
        email: o.email,
        plan: o.plan,
        status: o.status,
        creditBalance: o.creditBalance,
        createdAt: o.createdAt,
      })),
      ['accountId', 'name', 'email', 'plan', 'status', 'creditBalance', 'createdAt']
    );
  }

  if (dataset === 'offers') {
    const offers = await db.collection('promotionaloffers').find({}).limit(2000).toArray();
    return rowsToCsv(
      offers.map((o) => ({
        name: o.name,
        type: o.type,
        value: o.value,
        isActive: o.isActive,
        validUntil: o.validUntil,
      })),
      ['name', 'type', 'value', 'isActive', 'validUntil']
    );
  }

  if (dataset === 'audit') {
    const logs = await db
      .collection('admin_audit_logs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5000)
      .toArray();
    return rowsToCsv(
      logs.map((l) => ({
        actor: l.actor,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        createdAt: l.createdAt,
      })),
      ['actor', 'action', 'entityType', 'entityId', 'createdAt']
    );
  }

  const queued = await Message.countDocuments({ status: 'queued' });
  const failed = await Message.countDocuments({ status: 'failed' });
  return rowsToCsv(
    [
      { metric: 'queued_messages', value: queued },
      { metric: 'failed_messages', value: failed },
    ],
    ['metric', 'value']
  );
}

export function requirePlatformAdmin(req) {
  assertInternalSuperadmin(req);
}

export default {
  getPlatformOverview,
  getRecentOrganizations,
  getPlatformAnalytics,
  getPlatformCampaigns,
  getPlatformLeads,
  getPlatformContacts,
  updatePlatformLead,
  importPlatformLeads,
  buildExportCsv,
  requirePlatformAdmin,
  getOrgStatsMap,
  getPlatformProjectStats,
  getSuperadminDashboard,
  getOrganizationOperationalDetail,
};
