'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type CampaignData = {
  _id: string;
  name?: string;
  status?: string;
  createdAt?: string;
  recipients?: { sent?: number; total?: number };
  stats?: {
    totalDelivered?: number;
    totalOpened?: number;
    totalClicked?: number;
    totalConverted?: number;
  };
};

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const percent = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

const formatPct = (value: number) => `${value.toFixed(1)}%`;

const clampNonNegative = (value: number) => Math.max(0, value);

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = authService.getToken();

        // 1) Try direct campaign fetch
        const detailRes = await fetch(`${API_URL}/campaigns/${campaignId}?projectId=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let detailPayload: any = null;
        if (detailRes.ok) {
          detailPayload = await detailRes.json();
        }

        const directCampaign: CampaignData | null =
          detailPayload?.campaign ||
          detailPayload?.data?.campaign ||
          (detailPayload?.data?._id ? detailPayload.data : null) ||
          (detailPayload?._id ? detailPayload : null);

        // 2) If direct response has usable stats, use it
        if (directCampaign?.stats) {
          setCampaign({
            _id: directCampaign._id || campaignId,
            name: directCampaign.name || `Campaign ${campaignId.slice(0, 6)}`,
            status: directCampaign.status || 'draft',
            createdAt: directCampaign.createdAt,
            recipients: directCampaign.recipients,
            stats: directCampaign.stats,
          });
          return;
        }

        // 3) Fallback: fetch project campaign list and locate campaign by id
        const listRes = await fetch(`${API_URL}/campaigns?projectId=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!listRes.ok) throw new Error('Failed to load campaign details');

        const listPayload = await listRes.json();
        const campaigns: CampaignData[] =
          listPayload?.campaigns || listPayload?.data?.campaigns || [];

        const found = campaigns.find((c) => c._id === campaignId);

        setCampaign(
          found || {
            _id: campaignId,
            name: `Campaign ${campaignId.slice(0, 6)}`,
            status: 'draft',
            createdAt: new Date().toISOString(),
            recipients: { sent: 0 },
            stats: {
              totalDelivered: 0,
              totalOpened: 0,
              totalClicked: 0,
              totalConverted: 0,
            },
          }
        );
      } catch (err: any) {
        setError(err?.message || 'Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, projectId]);

  const metrics = useMemo(() => {
    const sent = toNumber(campaign?.recipients?.sent ?? campaign?.recipients?.total ?? 0);
    const delivered = toNumber(campaign?.stats?.totalDelivered ?? 0);
    const read = toNumber(campaign?.stats?.totalOpened ?? 0);
    const replies = toNumber(campaign?.stats?.totalClicked ?? 0);
    const conversions = toNumber(campaign?.stats?.totalConverted ?? 0);

    const deliveryRate = percent(delivered, sent);
    const readRate = percent(read, delivered);
    const replyRate = percent(replies, read);
    const conversionRate = percent(conversions, sent);

    const score = Math.max(0, Math.min(100, conversionRate * 10));

    const notRead = clampNonNegative(sent - read);
    const noReply = clampNonNegative(read - replies);
    const notConverted = clampNonNegative(replies - conversions);

    let scoreLabel = 'Low';
    let scoreEmoji = '❄️';
    if (score >= 80) {
      scoreLabel = 'High';
      scoreEmoji = '🔥';
    } else if (score >= 40) {
      scoreLabel = 'Medium';
      scoreEmoji = '⚡';
    }

    let summary = 'Low performance. Improve message or audience.';
    if (conversionRate > 8) {
      summary = 'Campaign performed very well. Strong conversions.';
    } else if (conversionRate > 3) {
      summary = 'Campaign performed average. Consider retargeting.';
    }

    const suggestions = [
      'Retarget users who read but didn’t reply',
      'Follow up with interested users',
      'Improve message content and CTA clarity',
    ];

    return {
      sent,
      delivered,
      read,
      replies,
      conversions,
      deliveryRate,
      readRate,
      replyRate,
      conversionRate,
      score,
      scoreLabel,
      scoreEmoji,
      summary,
      notRead,
      noReply,
      notConverted,
      suggestions,
    };
  }, [campaign]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">{error}</div>
        <button
          onClick={() => router.push(`/projects/${projectId}/campaigns`)}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign?.name || 'Campaign Detail'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Status: <span className="capitalize font-semibold text-gray-700">{campaign?.status || 'draft'}</span>
            {' • '}
            Created: {campaign?.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '—'}
          </p>
        </div>

        <button
          onClick={() => router.push(`/projects/${projectId}/campaigns`)}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium"
        >
          Back
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance Summary</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-sm text-gray-600">Delivery Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatPct(metrics.deliveryRate)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-sm text-gray-600">Read Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatPct(metrics.readRate)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-sm text-gray-600">Reply Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatPct(metrics.replyRate)}</p>
          </div>
          <div className="rounded-xl border border-green-200 p-4 bg-green-50">
            <p className="text-sm text-green-700">Conversion Rate</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatPct(metrics.conversionRate)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 p-4 bg-white">
          <p className="text-sm text-gray-600">Performance Score</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {metrics.scoreEmoji} {metrics.score.toFixed(0)}/100 ({metrics.scoreLabel})
          </p>
          <p className="text-sm text-gray-600 mt-2">{metrics.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Drop-off Insights</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• {metrics.notRead} users didn’t open message</li>
            <li>• {metrics.noReply} users didn’t reply</li>
            <li>• {metrics.notConverted} users didn’t convert</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Suggested Actions</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {metrics.suggestions.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Raw Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Sent</p>
            <p className="font-semibold text-gray-900">{metrics.sent}</p>
          </div>
          <div>
            <p className="text-gray-500">Delivered</p>
            <p className="font-semibold text-gray-900">{metrics.delivered}</p>
          </div>
          <div>
            <p className="text-gray-500">Read</p>
            <p className="font-semibold text-gray-900">{metrics.read}</p>
          </div>
          <div>
            <p className="text-gray-500">Replies</p>
            <p className="font-semibold text-gray-900">{metrics.replies}</p>
          </div>
          <div>
            <p className="text-gray-500">Conversions</p>
            <p className="font-semibold text-gray-900">{metrics.conversions}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
