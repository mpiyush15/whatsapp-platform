import axios from 'axios';
import logger from '../utils/logger.js';

class AdAccountBillingService {
  constructor() {
    this.adAccountId = process.env.META_AD_ACCOUNT_ID;
    this.accessToken = process.env.META_AD_ACCESS_TOKEN;
    this.graphApiVersion = process.env.META_GRAPH_API_VERSION || 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  /**
   * Fetches the current spend and limit from the configured Meta Ad Account.
   * If credentials are not set, it returns a mock payload for UI testing.
   */
  async getAdAccountSpendSummary() {
    // Return mock data if credentials aren't configured so the UI doesn't break
    if (!this.adAccountId || !this.accessToken) {
      logger.warn('META_AD_ACCOUNT_ID or META_AD_ACCESS_TOKEN not set. Returning mock ad account data.');
      return {
        accountId: 'act_mock_account',
        amountSpent: 45000,
        spendCap: 100000,
        currency: 'INR',
        usagePercentage: 45,
        status: 'ACTIVE',
        isMock: true
      };
    }

    try {
      // Act IDs in Meta Graph API are prefixed with 'act_'
      const accountId = this.adAccountId.startsWith('act_') ? this.adAccountId : `act_${this.adAccountId}`;
      
      const response = await axios.get(`${this.baseUrl}/${accountId}`, {
        params: {
          fields: 'amount_spent,spend_cap,currency,account_status',
          access_token: this.accessToken
        }
      });

      const data = response.data;

      // Meta returns amounts in cents/paise (e.g., 4500000 = 45,000 INR)
      const amountSpent = data.amount_spent ? parseFloat(data.amount_spent) / 100 : 0;
      const spendCap = data.spend_cap ? parseFloat(data.spend_cap) / 100 : 0;
      
      let usagePercentage = 0;
      if (spendCap > 0) {
        usagePercentage = Math.round((amountSpent / spendCap) * 100);
      }

      // Map Meta account status (1 = ACTIVE, 2 = DISABLED, etc.)
      const statusMap = {
        1: 'ACTIVE',
        2: 'DISABLED',
        3: 'UNSETTLED',
        7: 'PENDING_RISK_REVIEW',
        8: 'PENDING_SETTLEMENT',
        9: 'IN_GRACE_PERIOD',
        100: 'PENDING_CLOSURE',
        101: 'CLOSED',
        201: 'ANY_ACTIVE',
        202: 'ANY_CLOSED'
      };

      return {
        accountId: data.id,
        amountSpent,
        spendCap,
        currency: data.currency,
        usagePercentage,
        status: statusMap[data.account_status] || 'UNKNOWN',
        isMock: false
      };
    } catch (error) {
      logger.error('Failed to fetch Ad Account data from Meta', error?.response?.data || error.message);
      throw new Error('Failed to fetch Ad Account spending limits');
    }
  }
}

export default new AdAccountBillingService();
