import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';

const normalizePhone = (phone) => String(phone || '').replace(/[^0-9]/g, '');

const STATUS_RANK = { failed: 0, queued: 1, sent: 2, delivered: 3, read: 4, pending: -1 };

function pickBetterStatus(current, next) {
  const a = STATUS_RANK[current] ?? -1;
  const b = STATUS_RANK[next] ?? -1;
  return b > a ? next : current;
}

/** How long after a campaign message we still count a WhatsApp reply */
export const CAMPAIGN_REPLY_ATTRIBUTION_MS = 7 * 24 * 60 * 60 * 1000;

const OUTBOUND_CAMPAIGN_QUERY = (campaignId, accountId) => ({
  campaign: String(campaignId),
  accountId,
  direction: 'outbound',
});

const INBOUND_CAMPAIGN_QUERY = (campaignId, accountId) => ({
  campaign: String(campaignId),
  accountId,
  direction: 'inbound',
});

export function isTrackableCampaignId(value) {
  if (!value || value === 'manual') return false;
  const id = String(value);
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Link an inbound customer reply to the most recent outbound campaign message to that phone.
 */
export async function attributeInboundReplyToCampaign(accountId, phoneNumberId, customerPhone) {
  const cleanPhone = String(customerPhone || '').replace(/[\s+()-]/g, '');
  if (!cleanPhone) return null;

  const since = new Date(Date.now() - CAMPAIGN_REPLY_ATTRIBUTION_MS);

  const latestOutbound = await Message.findOne({
    accountId,
    phoneNumberId,
    recipientPhone: cleanPhone,
    direction: 'outbound',
    sentAt: { $gte: since },
    campaign: { $regex: /^[a-f0-9]{24}$/i },
  })
    .sort({ sentAt: -1 })
    .select('campaign sentAt')
    .lean();

  if (!latestOutbound?.campaign || !isTrackableCampaignId(latestOutbound.campaign)) {
    return null;
  }

  return String(latestOutbound.campaign);
}

/**
 * Recompute delivery, read, reply, and conversion stats from Message collection.
 */
export async function refreshCampaignStatsFromMessages(campaignId, accountId) {
  const campaignIdStr = String(campaignId);
  const baseOutbound = OUTBOUND_CAMPAIGN_QUERY(campaignIdStr, accountId);
  const baseInbound = INBOUND_CAMPAIGN_QUERY(campaignIdStr, accountId);

  const [sentCount, failedCount, deliveredOrReadCount, readCount] = await Promise.all([
    Message.countDocuments({
      ...baseOutbound,
      status: { $in: ['sent', 'delivered', 'read'] },
    }),
    Message.countDocuments({ ...baseOutbound, status: 'failed' }),
    Message.countDocuments({
      ...baseOutbound,
      status: { $in: ['delivered', 'read'] },
    }),
    Message.countDocuments({ ...baseOutbound, status: 'read' }),
  ]);

  const campaign = await Campaign.findOne({ _id: campaignId, accountId });
  if (!campaign) return null;

  if (campaign.startedAt) {
    const outboundPhones = await Message.distinct('recipientPhone', {
      ...baseOutbound,
      sentAt: { $gte: campaign.startedAt },
    });
    if (outboundPhones.length > 0) {
      await Message.updateMany(
        {
          accountId,
          direction: 'inbound',
          recipientPhone: { $in: outboundPhones },
          sentAt: { $gte: campaign.startedAt },
          $or: [{ campaign: { $exists: false } }, { campaign: 'manual' }, { campaign: null }],
        },
        { $set: { campaign: campaignIdStr } }
      );
    }
  }

  const [totalReplyMessagesAfter, uniqueRepliersAfter] = await Promise.all([
    Message.countDocuments(baseInbound),
    Message.distinct('recipientPhone', baseInbound),
  ]);

  const totalReplied = uniqueRepliersAfter.length;
  const totalReplyMessages = totalReplyMessagesAfter;
  const totalConverted = totalReplied;

  const attempted = Number(campaign.recipients?.total || 0);
  const terminalCount = deliveredOrReadCount + failedCount;
  const updatedStatus =
    attempted > 0 && terminalCount >= attempted ? 'completed' : campaign.status;

  const deliveryRate = sentCount > 0 ? Number(((deliveredOrReadCount / sentCount) * 100).toFixed(2)) : 0;
  const openRate =
    deliveredOrReadCount > 0 ? Number(((readCount / deliveredOrReadCount) * 100).toFixed(2)) : 0;
  const clickRate =
    readCount > 0 ? Number(((totalReplied / readCount) * 100).toFixed(2)) : 0;
  const conversionRate =
    sentCount > 0 ? Number(((totalConverted / sentCount) * 100).toFixed(2)) : 0;

  campaign.stats = {
    ...(campaign.stats?.toObject?.() || campaign.stats || {}),
    totalSent: sentCount,
    totalFailed: failedCount,
    totalDelivered: deliveredOrReadCount,
    totalOpened: readCount,
    totalReplied,
    totalReplyMessages,
    totalConverted,
    deliveryRate,
    openRate,
    clickRate,
    conversionRate,
  };

  campaign.recipients = {
    ...(campaign.recipients?.toObject?.() || campaign.recipients || {}),
    sent: sentCount,
    failed: failedCount,
    pending: Math.max(attempted - terminalCount, 0),
    inProgress: Math.max(attempted - terminalCount, 0),
  };

  if (updatedStatus !== campaign.status) {
    campaign.status = updatedStatus;
  }
  if (campaign.status === 'completed' && !campaign.completedAt) {
    campaign.completedAt = new Date();
  }

  await campaign.save();
  logger.info(
    `[Campaign:${campaignIdStr}] stats refreshed: sent=${sentCount} read=${readCount} replied=${totalReplied} converted=${totalConverted}`
  );
  return campaign;
}

async function getAudiencePhonesFromCampaign(campaign, accountId) {
  const attrs = campaign?.audience?.customFilters?.attributes || {};
  const selectedContactIds = Array.isArray(attrs.selectedContactIds) ? attrs.selectedContactIds : [];
  const selectedPhones = Array.isArray(attrs.selectedPhones) ? attrs.selectedPhones : [];
  const phones = new Set();

  for (const phone of selectedPhones) {
    const normalized = normalizePhone(phone);
    if (normalized) phones.add(normalized);
  }

  if (selectedContactIds.length > 0) {
    const contacts = await Contact.find({
      _id: { $in: selectedContactIds },
      accountId,
      ...(campaign.projectId ? { projectId: campaign.projectId } : {}),
    })
      .select('phone whatsappNumber name userName')
      .lean();

    for (const c of contacts) {
      const normalized = normalizePhone(c.whatsappNumber || c.phone);
      if (normalized) phones.add(normalized);
    }
  }

  return phones;
}

/**
 * Per-recipient breakdown for campaign detail UI (delivery status, replies, live-chat link id).
 */
export async function buildCampaignRecipientInsights(campaignId, accountId, options = {}) {
  const { refreshStats = true } = options;
  const campaign = await Campaign.findOne({ _id: campaignId, accountId });
  if (!campaign) return null;

  if (refreshStats) {
    await refreshCampaignStatsFromMessages(campaignId, accountId);
  }

  const campaignIdStr = String(campaignId);
  const baseOutbound = OUTBOUND_CAMPAIGN_QUERY(campaignIdStr, accountId);
  const baseInbound = INBOUND_CAMPAIGN_QUERY(campaignIdStr, accountId);
  const phoneNumberId = campaign.phoneNumberId;

  const [outboundMessages, inboundMessages, audiencePhones] = await Promise.all([
    Message.find(baseOutbound)
      .select('recipientPhone recipientName status sentAt readAt deliveredAt')
      .sort({ sentAt: -1 })
      .lean(),
    Message.find(baseInbound).select('recipientPhone sentAt').sort({ sentAt: -1 }).lean(),
    getAudiencePhonesFromCampaign(campaign, accountId),
  ]);

  const byPhone = new Map();

  const ensureRow = (phone, nameHint = '') => {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    if (!byPhone.has(normalized)) {
      byPhone.set(normalized, {
        phone: normalized,
        name: nameHint || '',
        outboundStatus: 'pending',
        replied: false,
        replyCount: 0,
        lastReplyAt: null,
        conversationId: phoneNumberId
          ? `${accountId}-${phoneNumberId}-${normalized}`
          : null,
      });
    } else if (nameHint && !byPhone.get(normalized).name) {
      byPhone.get(normalized).name = nameHint;
    }
    return byPhone.get(normalized);
  };

  for (const phone of audiencePhones) {
    ensureRow(phone);
  }

  for (const msg of outboundMessages) {
    const row = ensureRow(msg.recipientPhone, msg.recipientName);
    if (!row) continue;
    row.outboundStatus = pickBetterStatus(row.outboundStatus, msg.status || 'sent');
  }

  for (const msg of inboundMessages) {
    const row = ensureRow(msg.recipientPhone);
    if (!row) continue;
    row.replied = true;
    row.replyCount += 1;
    if (!row.lastReplyAt || new Date(msg.sentAt) > new Date(row.lastReplyAt)) {
      row.lastReplyAt = msg.sentAt;
    }
  }

  const recipients = Array.from(byPhone.values()).sort((a, b) => {
    if (a.replied !== b.replied) return a.replied ? -1 : 1;
    return String(b.lastReplyAt || 0).localeCompare(String(a.lastReplyAt || 0));
  });

  return {
    campaignId: campaignIdStr,
    phoneNumberId,
    recipients,
    summary: {
      total: recipients.length,
      repliers: recipients.filter((r) => r.replied).length,
      notReplied: recipients.filter((r) => !r.replied).length,
    },
  };
}
