import express from 'express';
import { requireJWT } from '../middlewares/jwtAuth.js';
import PhoneNumber from '../models/PhoneNumber.js';
import Conversation from '../models/Conversation.js';
import axios from 'axios';
import logger from '../utils/logger.js';

const router = express.Router();
const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/messaging-metrics
 * Get messaging tier and usage for a phone number
 */
router.get('/:phoneNumberId', requireJWT, async (req, res) => {
  try {
    const { phoneNumberId } = req.params;
    const accountId = req.account.accountId;

    // Get phone config
    const phoneConfig = await PhoneNumber.findOne({
      accountId,
      phoneNumberId,
      isActive: true
    }).select('+accessToken');

    if (!phoneConfig) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found'
      });
    }

    const accessToken = phoneConfig.accessToken || process.env.META_SYSTEM_TOKEN;
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        message: 'Access token not available'
      });
    }

    // Count unique contacts messaged in last 24h (correct quota logic)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uniqueContactCount = await Conversation.distinct('userPhone', {
      accountId,
      phoneNumberId,
      updatedAt: { $gte: twentyFourHoursAgo }
    }).then(phones => phones.length);

    try {
      // Fetch real tier + quality from Meta API
      const metaResponse = await axios.get(
        `${GRAPH_API_URL}/${phoneNumberId}`,
        {
          params: {
            fields: 'messaging_limit_tier,quality_rating,display_phone_number',
            access_token: accessToken
          }
        }
      );

      const metaData = metaResponse.data;
      logger.info(`📊 Meta API response for ${phoneNumberId}:`, metaData);

      // Map Meta tier → human readable + limit
      const metaTier = metaData.messaging_limit_tier || 'TIER_NOT_SET';
      const tierLimit = getTierLimit(metaTier);
      const tierLabel = getTierLabel(metaTier);
      const quality = metaData.quality_rating || 'UNKNOWN';

      const usagePercentage = tierLimit === Infinity
        ? 0
        : Math.min(100, Math.round((uniqueContactCount / tierLimit) * 100));

      return res.status(200).json({
        success: true,
        data: {
          tier: tierLabel,
          metaTier,
          tierLimit: tierLimit === Infinity ? '∞' : tierLimit,
          messageCount: uniqueContactCount,
          usagePercentage,
          remainingMessages: tierLimit === Infinity ? '∞' : Math.max(0, tierLimit - uniqueContactCount),
          quality,
          window: '24-hour sliding window',
          windowStartsAt: twentyFourHoursAgo.toISOString(),
          phoneNumber: metaData.display_phone_number || phoneNumberId,
          status: 'live'
        }
      });
    } catch (metaError) {
      logger.error('❌ Meta API error:', metaError.response?.data || metaError.message);

      // Fallback: return DB unique contact count, no Meta data
      const fallbackTier = process.env.WHATSAPP_MESSAGE_TIER || 'TIER_1';
      const tierLimit = getTierLimit(fallbackTier);
      const tierLabel = getTierLabel(fallbackTier);
      const usagePercentage = Math.min(100, Math.round((uniqueContactCount / tierLimit) * 100));

      return res.status(200).json({
        success: true,
        data: {
          tier: tierLabel,
          metaTier: fallbackTier,
          tierLimit,
          messageCount: uniqueContactCount,
          usagePercentage,
          remainingMessages: Math.max(0, tierLimit - uniqueContactCount),
          quality: phoneConfig.qualityRating || 'UNKNOWN',
          window: '24-hour sliding window',
          windowStartsAt: twentyFourHoursAgo.toISOString(),
          status: 'fallback_db_only',
          note: 'Could not fetch from Meta API'
        }
      });
    }
  } catch (error) {
    logger.error('❌ Error fetching messaging metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messaging metrics',
      error: error.message
    });
  }
});

/**
 * Map Meta messaging_limit_tier → numeric limit
 */
function getTierLimit(tier) {
  const tierMap = {
    'TIER_NOT_SET': 250,
    'TIER_0': 250,
    'TIER_1': 1000,
    'TIER_2': 10000,
    'TIER_3': 100000,
    'TIER_4': Infinity,
    // Legacy env-based fallbacks
    'Standard': 1000,
    'Business': 10000,
    'Enterprise': 100000
  };
  return tierMap[tier] ?? 1000;
}

/**
 * Map Meta messaging_limit_tier → human readable label
 */
function getTierLabel(tier) {
  const labelMap = {
    'TIER_NOT_SET': 'Unverified (250/day)',
    'TIER_0': 'Tier 0 (250/day)',
    'TIER_1': 'Tier 1 (1K/day)',
    'TIER_2': 'Tier 2 (10K/day)',
    'TIER_3': 'Tier 3 (100K/day)',
    'TIER_4': 'Tier 4 (Unlimited)',
    'Standard': 'Standard (1K/day)',
    'Business': 'Business (10K/day)',
    'Enterprise': 'Enterprise (100K/day)'
  };
  return labelMap[tier] || tier;
}

export default router;
