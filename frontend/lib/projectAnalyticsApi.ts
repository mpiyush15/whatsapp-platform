import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export type DailyMessagePoint = {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
};

export type SourcePoint = {
  key: string;
  label: string;
  value: number;
};

export type ProjectAnalytics = {
  period: { start: string; end: string; days: number };
  scope?: {
    phoneLines: number;
    includesDefaultAccountData: boolean;
  };
  overview: {
    totalMessages: number;
    inbound: number;
    outbound: number;
    delivered: number;
    read: number;
    failed: number;
    queued: number;
    deliveryRate: number;
    readRate: number;
    failRate: number;
  };
  conversations: {
    total: number;
    open: number;
    closed: number;
    activeInPeriod: number;
    newInPeriod: number;
  };
  contacts: { total: number };
  campaigns: {
    count: number;
    completed: number;
    running: number;
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalReplied: number;
    deliveryRate: number;
    readRate: number;
    replyRate: number;
  };
  topCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    deliveryRate: number;
    replyRate: number;
  }>;
  automation: {
    totalRules: number;
    active: number;
    workflowFlows: number;
    totalTriggers: number;
    avgSuccessRate: number;
    topBots: Array<{
      id: string;
      name: string;
      isActive: boolean;
      replyType: string;
      triggerCount: number;
      successRate: number;
      lastTriggeredAt?: string;
    }>;
  };
  leads: {
    chatbotLeadsInPeriod: number;
    pipeline: {
      total: number;
      new: number;
      contacted: number;
      qualified: number;
      converted: number;
      conversionRate: number;
    };
  };
  charts: {
    dailyMessages: DailyMessagePoint[];
    messagesBySource: SourcePoint[];
  };
  billing?: {
    meta: {
      currency: string;
      region: string;
      disclaimer: string;
      breakdown: Array<{
        category: string;
        count: number;
        rateInr: number;
        subtotalInr: number;
      }>;
      billableMessages: number;
      totalEstimatedInr: number;
    };
    account: {
      creditsUsed: number;
      accountCreditsUsed?: number;
      creditEntries: number;
      creditsByCategory?: Array<{
        category: string;
        credits: number;
        messages: number;
      }>;
      currentCreditBalance: number;
      inrPerCredit: number;
      estimatedInrFromCredits: number;
      plan: string | null;
      note: string;
    };
    tier: {
      lines: Array<{ phoneNumberId: string; uniqueContacts24h: number }>;
      totalUniqueContacts24h: number;
      window: string;
    };
  };
};

export async function fetchProjectAnalytics(
  projectId: string,
  days: number = 30
): Promise<ProjectAnalytics> {
  const token = authService.getToken();
  const response = await fetch(
    `${API_URL}/projects/${projectId}/analytics?days=${days}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || payload?.message || 'Failed to load analytics');
  }

  return payload.data as ProjectAnalytics;
}
