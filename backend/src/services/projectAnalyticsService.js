import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Contact from '../models/Contact.js';
import Campaign from '../models/Campaign.js';
import KeywordRule from '../models/KeywordRule.js';
import ChatbotLead from '../models/ChatbotLead.js';
import Lead from '../models/Lead.js';
import Template from '../models/Template.js';
import Account from '../models/Account.js';
import AccountCreditLedger from '../models/AccountCreditLedger.js';
import CreditPackSettings from '../models/CreditPackSettings.js';
import logger from '../utils/logger.js';
import { resolveProjectScope } from './projectScopeResolver.js';
import { estimateMetaCostInr } from '../config/metaMessagePricing.js';
import { classifyOutboundMessage } from '../utils/messageCategory.js';

const MS_DAY = 24 * 60 * 60 * 1000;

function parseDateRange(query = {}) {
  const days = Math.min(365, Math.max(1, parseInt(query.days, 10) || 30));
  const end = query.endDate ? new Date(query.endDate) : new Date();
  const start = query.startDate
    ? new Date(query.startDate)
    : new Date(end.getTime() - (days - 1) * MS_DAY);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end, days: Math.ceil((end - start) / MS_DAY) + 1 };
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Full analytics payload for a single project.
 */
export async function getProjectAnalytics(accountId, projectId, query = {}) {
  const { start, end, days } = parseDateRange(query);
  const scope = await resolveProjectScope(accountId, projectId);
  if (!scope) {
    throw new Error('Project not found');
  }

  const messageRange = {
    ...scope.messageMatch,
    createdAt: { $gte: start, $lte: end },
  };
  const convoBase = scope.messageMatch;
  const entityBase = scope.entityMatch;

  try {
    const [
      messageOverview,
      dailyTrend,
      bySource,
      conversationStats,
      contactCount,
      campaignRollup,
      topCampaigns,
      chatbotRollup,
      chatbotLeadsInRange,
      leadPipeline,
      messageCosts,
      accountBilling,
      tierUsage,
    ] = await Promise.all([
      aggregateMessageOverview(messageRange),
      aggregateDailyTrend(messageRange, start, end),
      aggregateBySource(messageRange),
      aggregateConversations(convoBase, messageRange),
      Contact.countDocuments(entityBase),
      aggregateCampaigns(entityBase),
      topCampaignsBySent(entityBase, 5),
      aggregateChatbots(entityBase),
      ChatbotLead.countDocuments({
        ...entityBase,
        createdAt: { $gte: start, $lte: end },
      }),
      aggregateLeads(entityBase),
      aggregateMessageCosts(messageRange, accountId),
      aggregateAccountBilling(accountId, start, end, projectId),
      aggregateTierUsage(accountId, scope.phoneNumberIds),
    ]);

    const outbound = messageOverview.outbound || 0;
    const delivered = messageOverview.delivered || 0;
    const read = messageOverview.read || 0;
    const failed = messageOverview.failed || 0;

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        days,
      },
      scope: {
        phoneLines: scope.phoneNumberIds.length,
        includesDefaultAccountData: Boolean(scope.project.isDefault),
      },
      overview: {
        totalMessages: messageOverview.total,
        inbound: messageOverview.inbound,
        outbound,
        delivered,
        read,
        failed,
        queued: messageOverview.queued,
        deliveryRate: pct(delivered, outbound),
        readRate: pct(read, delivered || outbound),
        failRate: pct(failed, outbound),
      },
      conversations: conversationStats,
      contacts: { total: contactCount },
      campaigns: campaignRollup,
      topCampaigns,
      automation: chatbotRollup,
      leads: {
        chatbotLeadsInPeriod: chatbotLeadsInRange,
        pipeline: leadPipeline,
      },
      charts: {
        dailyMessages: dailyTrend,
        messagesBySource: bySource,
      },
      billing: {
        meta: messageCosts,
        account: accountBilling,
        tier: tierUsage,
      },
    };
  } catch (error) {
    logger.error('getProjectAnalytics failed:', error.message);
    throw error;
  }
}

async function aggregateMessageOverview(range) {
  const rows = await Message.aggregate([
    { $match: range },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        inbound: {
          $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] },
        },
        outbound: {
          $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] },
        },
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
              { $and: [{ $eq: ['$direction', 'outbound'] }, { $eq: ['$status', 'failed'] }] },
              1,
              0,
            ],
          },
        },
        queued: {
          $sum: { $cond: [{ $eq: ['$status', 'queued'] }, 1, 0] },
        },
      },
    },
  ]);

  const row = rows[0] || {};
  return {
    total: row.total || 0,
    inbound: row.inbound || 0,
    outbound: row.outbound || 0,
    delivered: row.delivered || 0,
    read: row.read || 0,
    failed: row.failed || 0,
    queued: row.queued || 0,
  };
}

async function aggregateDailyTrend(range, start, end) {
  const rows = await Message.aggregate([
    { $match: range },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          direction: '$direction',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  const map = new Map();
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    const key = new Date(t).toISOString().slice(0, 10);
    map.set(key, { date: key, inbound: 0, outbound: 0, total: 0 });
  }

  for (const row of rows) {
    const date = row._id.date;
    if (!map.has(date)) {
      map.set(date, { date, inbound: 0, outbound: 0, total: 0 });
    }
    const entry = map.get(date);
    if (row._id.direction === 'inbound') entry.inbound += row.count;
    else if (row._id.direction === 'outbound') entry.outbound += row.count;
    entry.total += row.count;
  }

  return Array.from(map.values());
}

async function aggregateBySource(range) {
  const rows = await Message.aggregate([
    { $match: { ...range, direction: 'outbound' } },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              {
                case: {
                  $regexMatch: {
                    input: { $ifNull: ['$campaign', 'manual'] },
                    regex: /^[a-f0-9]{24}$/i,
                  },
                },
                then: 'campaign',
              },
              { case: { $eq: ['$campaign', 'workflow_conversation'] }, then: 'chatbot' },
              { case: { $eq: ['$campaign', 'keyword_auto_reply'] }, then: 'automation' },
            ],
            default: 'agent',
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const labels = {
    campaign: 'Campaigns',
    chatbot: 'Flow / workflow',
    automation: 'Keyword replies',
    agent: 'Live chat / manual',
  };

  return rows.map((r) => ({
    key: r._id,
    label: labels[r._id] || r._id,
    value: r.count,
  }));
}

async function aggregateConversations(convoBase, messageRange) {
  const [total, open, closed, activeInPeriod, newInPeriod] = await Promise.all([
    Conversation.countDocuments(convoBase),
    Conversation.countDocuments({ ...convoBase, status: 'open' }),
    Conversation.countDocuments({ ...convoBase, status: 'closed' }),
    Conversation.countDocuments({
      ...convoBase,
      lastMessageAt: {
        $gte: messageRange.createdAt.$gte,
        $lte: messageRange.createdAt.$lte,
      },
    }),
    Conversation.countDocuments({
      ...convoBase,
      createdAt: {
        $gte: messageRange.createdAt.$gte,
        $lte: messageRange.createdAt.$lte,
      },
    }),
  ]);

  return {
    total,
    open,
    closed,
    activeInPeriod,
    newInPeriod,
  };
}

async function aggregateCampaigns(base) {
  const campaigns = await Campaign.find(base)
    .select('name status stats recipients createdAt')
    .lean();

  let totalSent = 0;
  let totalDelivered = 0;
  let totalRead = 0;
  let totalReplied = 0;
  let completed = 0;
  let running = 0;

  for (const c of campaigns) {
    const sent = Number(c.stats?.totalSent ?? c.recipients?.sent ?? 0);
    totalSent += sent;
    totalDelivered += Number(c.stats?.totalDelivered ?? 0);
    totalRead += Number(c.stats?.totalOpened ?? 0);
    totalReplied += Number(c.stats?.totalReplied ?? 0);
    if (c.status === 'completed') completed += 1;
    if (c.status === 'running') running += 1;
  }

  return {
    count: campaigns.length,
    completed,
    running,
    totalSent,
    totalDelivered,
    totalRead,
    totalReplied,
    deliveryRate: pct(totalDelivered, totalSent),
    readRate: pct(totalRead, totalDelivered || totalSent),
    replyRate: pct(totalReplied, totalRead || totalDelivered || totalSent),
  };
}

async function topCampaignsBySent(base, limit = 5) {
  const campaigns = await Campaign.find(base)
    .select('name status stats recipients')
    .lean();

  return campaigns
    .map((c) => {
      const sent = Number(c.stats?.totalSent ?? c.recipients?.sent ?? 0);
      const delivered = Number(c.stats?.totalDelivered ?? 0);
      const read = Number(c.stats?.totalOpened ?? 0);
      const replied = Number(c.stats?.totalReplied ?? 0);
      return {
        id: String(c._id),
        name: c.name,
        status: c.status,
        sent,
        delivered,
        read,
        replied,
        deliveryRate: pct(delivered, sent),
        replyRate: pct(replied, read || delivered || sent),
      };
    })
    .sort((a, b) => b.sent - a.sent)
    .slice(0, limit);
}

async function aggregateChatbots(base) {
  const rules = await KeywordRule.find(base)
    .select('name isActive replyType triggerCount successRate lastTriggeredAt')
    .lean();

  const active = rules.filter((r) => r.isActive).length;
  const workflows = rules.filter((r) => r.replyType === 'workflow').length;
  const totalTriggers = rules.reduce((s, r) => s + Number(r.triggerCount || 0), 0);
  const avgSuccess =
    rules.length > 0
      ? Math.round(
          rules.reduce((s, r) => s + Number(r.successRate || 0), 0) / rules.length
        )
      : 0;

  const topBots = rules
    .map((r) => ({
      id: String(r._id),
      name: r.name,
      isActive: r.isActive,
      replyType: r.replyType,
      triggerCount: r.triggerCount || 0,
      successRate: r.successRate || 0,
      lastTriggeredAt: r.lastTriggeredAt,
    }))
    .sort((a, b) => b.triggerCount - a.triggerCount)
    .slice(0, 5);

  return {
    totalRules: rules.length,
    active,
    workflowFlows: workflows,
    totalTriggers,
    avgSuccessRate: avgSuccess,
    topBots,
  };
}

async function aggregateLeads(base) {
  const [total, newCount, contacted, qualified, converted] = await Promise.all([
    Lead.countDocuments(base),
    Lead.countDocuments({ ...base, status: 'new' }),
    Lead.countDocuments({ ...base, status: 'contacted' }),
    Lead.countDocuments({ ...base, status: 'qualified' }),
    Lead.countDocuments({ ...base, status: 'converted' }),
  ]);

  return {
    total,
    new: newCount,
    contacted,
    qualified,
    converted,
    conversionRate: pct(converted, total),
  };
}

async function aggregateMessageCosts(messageRange, accountId) {
  const outboundMatch = { ...messageRange, direction: 'outbound' };
  const messages = await Message.find(outboundMatch)
    .select('campaign messageType content.templateName')
    .lean();

  const templateNames = [
    ...new Set(
      messages
        .filter((m) => m.messageType === 'template' && m.content?.templateName)
        .map((m) => m.content.templateName)
    ),
  ];

  const templates = templateNames.length
    ? await Template.find({ accountId, name: { $in: templateNames } })
        .select('name category')
        .lean()
    : [];

  const templateCategoryByName = new Map(
    templates.map((t) => [t.name, t.category || 'utility'])
  );

  const categoryCounts = {
    marketing: 0,
    utility: 0,
    authentication: 0,
    service: 0,
  };

  for (const msg of messages) {
    const cat = classifyOutboundMessage(msg, templateCategoryByName);
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat] += 1;
    } else {
      categoryCounts.utility += 1;
    }
  }

  return estimateMetaCostInr(categoryCounts);
}

async function aggregateAccountBilling(accountId, start, end, projectId = null) {
  const accountLedgerMatch = {
    accountId,
    entryType: 'usage_debit',
    status: 'posted',
    createdAt: { $gte: start, $lte: end },
  };
  const projectLedgerMatch = projectId
    ? { ...accountLedgerMatch, 'metadata.projectId': projectId }
    : accountLedgerMatch;

  const [debitAgg, accountDebitAgg, creditsByCategory, creditSettings, account] =
    await Promise.all([
    AccountCreditLedger.aggregate([
      {
        $match: projectLedgerMatch,
      },
      {
        $group: {
          _id: null,
          creditsUsed: { $sum: { $abs: '$amount' } },
          entries: { $sum: 1 },
        },
      },
    ]),
    projectId
      ? AccountCreditLedger.aggregate([
          { $match: accountLedgerMatch },
          {
            $group: {
              _id: null,
              creditsUsed: { $sum: { $abs: '$amount' } },
            },
          },
        ])
      : Promise.resolve([]),
    AccountCreditLedger.aggregate([
      { $match: projectLedgerMatch },
      {
        $group: {
          _id: '$metadata.category',
          credits: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { credits: -1 } },
    ]),
    CreditPackSettings.findOne({ isActive: true }).lean(),
    Account.findOne({ accountId }).select('creditBalance plan').lean(),
  ]);

  const row = debitAgg[0] || {};
  const creditsUsed = Number(row.creditsUsed || 0);
  const accountCreditsUsed = projectId
    ? Number(accountDebitAgg[0]?.creditsUsed || 0)
    : creditsUsed;
  const inrPerCredit = Number(creditSettings?.creditConversionRate || 1);
  const creditsForInrEstimate = accountCreditsUsed || creditsUsed;
  const estimatedInrFromCredits = Math.round(creditsForInrEstimate * inrPerCredit * 100) / 100;

  return {
    creditsUsed,
    accountCreditsUsed,
    creditEntries: Number(row.entries || 0),
    creditsByCategory: creditsByCategory.map((r) => ({
      category: r._id || 'unknown',
      credits: Number(r.credits || 0),
      messages: Number(r.count || 0),
    })),
    currentCreditBalance: Number(account?.creditBalance || 0),
    inrPerCredit,
    estimatedInrFromCredits,
    plan: account?.plan || null,
    note:
      creditsUsed > 0
        ? 'Replysys credits debited for this project in this period.'
        : accountCreditsUsed > 0 && projectId
          ? `This project: 0 credits tagged. Account total in period: ${accountCreditsUsed} credits (see Subscriptions).`
          : accountCreditsUsed > 0
            ? 'Credits debited on your Replysys account in this period.'
            : 'New outbound sends debit credits automatically. Meta cost below is estimated from message volume × India rates.',
  };
}

async function aggregateTierUsage(accountId, phoneNumberIds) {
  if (!phoneNumberIds?.length) {
    return {
      lines: [],
      totalUniqueContacts24h: 0,
    };
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lines = await Promise.all(
    phoneNumberIds.map(async (phoneNumberId) => {
      const uniqueContacts = await Conversation.distinct('userPhone', {
        accountId,
        phoneNumberId,
        lastMessageAt: { $gte: twentyFourHoursAgo },
      });
      return {
        phoneNumberId,
        uniqueContacts24h: uniqueContacts.length,
      };
    })
  );

  return {
    lines,
    totalUniqueContacts24h: lines.reduce((s, l) => s + l.uniqueContacts24h, 0),
    window: '24-hour sliding window (Meta tier quota)',
  };
}

export default { getProjectAnalytics };
