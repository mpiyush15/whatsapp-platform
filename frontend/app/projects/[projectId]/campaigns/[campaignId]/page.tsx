'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const POLL_MS = 30000;

type CampaignData = {
  _id: string;
  name?: string;
  status?: string;
  createdAt?: string;
  recipients?: { sent?: number; total?: number };
  stats?: {
    totalDelivered?: number;
    totalOpened?: number;
    totalReplied?: number;
    totalReplyMessages?: number;
    totalConverted?: number;
  };
};

type RecipientRow = {
  phone: string;
  name: string;
  outboundStatus: string;
  replied: boolean;
  replyCount: number;
  lastReplyAt: string | null;
  conversationId: string | null;
};

type RecipientFilter = 'all' | 'opened' | 'replied' | 'not_replied';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  queued: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  delivered: 'bg-indigo-100 text-indigo-700',
  read: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

const normPhone = (p: string) => String(p || '').replace(/\D/g, '');
const formatPhone = (phone: string) => (phone.startsWith('+') ? phone : `+${phone}`);
const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const percent = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
const formatPct = (value: number) => `${value.toFixed(1)}%`;

const isOpened = (row: RecipientRow) => row.outboundStatus === 'read';

function recipientsChanged(prev: RecipientRow[], next: RecipientRow[]) {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (
      a.phone !== b.phone ||
      a.outboundStatus !== b.outboundStatus ||
      a.replied !== b.replied ||
      a.replyCount !== b.replyCount
    ) {
      return true;
    }
  }
  return false;
}

function statusBadgeClass(status?: string) {
  const s = (status || 'draft').toLowerCase();
  if (s === 'running' || s === 'completed') return 'bg-green-100 text-green-800';
  if (s === 'scheduled') return 'bg-blue-100 text-blue-800';
  if (s === 'failed') return 'bg-red-100 text-red-800';
  if (s === 'paused') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [recipientsInitialLoad, setRecipientsInitialLoad] = useState(true);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const recipientsRef = useRef<RecipientRow[]>([]);

  const loadCampaign = useCallback(
    async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
          setError(null);
        }
        const token = authService.getToken();
        const detailRes = await fetch(`${API_URL}/campaigns/${campaignId}?projectId=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (detailRes.ok) {
          const detailPayload = await detailRes.json();
          const raw =
            detailPayload?.campaign ||
            detailPayload?.data?.campaign ||
            (detailPayload?.data?._id ? detailPayload.data : null) ||
            (detailPayload?._id ? detailPayload : null);

          if (raw) {
            setCampaign({
              _id: raw._id || campaignId,
              name: raw.name || `Campaign ${campaignId.slice(0, 6)}`,
              status: raw.status || 'draft',
              createdAt: raw.createdAt,
              recipients: raw.recipients,
              stats: raw.stats,
            });
            return;
          }
        }

        const listRes = await fetch(`${API_URL}/campaigns?projectId=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!listRes.ok) throw new Error('Failed to load campaign');
        const listPayload = await listRes.json();
        const campaigns: CampaignData[] =
          listPayload?.campaigns || listPayload?.data?.campaigns || [];
        const found = campaigns.find((c) => c._id === campaignId);
        setCampaign(
          found || {
            _id: campaignId,
            name: `Campaign ${campaignId.slice(0, 6)}`,
            status: 'draft',
            stats: {},
          }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load campaign';
        setError(message);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [campaignId, projectId]
  );

  const loadRecipients = useCallback(
    async (opts: { initial?: boolean; refreshStats?: boolean } = {}) => {
      const { initial = false, refreshStats = false } = opts;
      try {
        const token = authService.getToken();
        const refreshParam = refreshStats ? 'refresh=1' : 'refresh=0';
        const res = await fetch(
          `${API_URL}/campaigns/${campaignId}/recipients?projectId=${projectId}&${refreshParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const payload = await res.json();
        const rows: RecipientRow[] = payload?.recipients || payload?.data?.recipients || [];
        const next = Array.isArray(rows) ? rows : [];
        if (recipientsChanged(recipientsRef.current, next)) {
          recipientsRef.current = next;
          setRecipients(next);
        }
      } catch {
        if (initial) {
          recipientsRef.current = [];
          setRecipients([]);
        }
      } finally {
        if (initial) setRecipientsInitialLoad(false);
      }
    },
    [campaignId, projectId]
  );

  useEffect(() => {
    loadCampaign(true);
    loadRecipients({ initial: true, refreshStats: true });

    const poll = setInterval(() => {
      loadCampaign(false);
      loadRecipients({ refreshStats: false });
    }, POLL_MS);

    return () => clearInterval(poll);
  }, [loadCampaign, loadRecipients]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCampaign(false), loadRecipients({ refreshStats: true })]);
    setRefreshing(false);
  };

  const audienceCounts = useMemo(() => {
    const opened = recipients.filter(isOpened).length;
    const repliers = recipients.filter((r) => r.replied).length;
    return { total: recipients.length, opened, repliers };
  }, [recipients]);

  const filteredRecipients = useMemo(() => {
    switch (recipientFilter) {
      case 'opened':
        return recipients.filter(isOpened);
      case 'replied':
        return recipients.filter((r) => r.replied);
      case 'not_replied':
        return recipients.filter((r) => !r.replied);
      default:
        return recipients;
    }
  }, [recipients, recipientFilter]);

  const metrics = useMemo(() => {
    const sent = toNumber(campaign?.recipients?.sent ?? campaign?.recipients?.total ?? 0);
    const delivered = toNumber(campaign?.stats?.totalDelivered ?? 0);
    const read = toNumber(campaign?.stats?.totalOpened ?? 0);
    const replies = toNumber(campaign?.stats?.totalReplied ?? 0);
    const replyMessages = toNumber(campaign?.stats?.totalReplyMessages ?? 0);

    return {
      sent,
      delivered,
      read,
      replies,
      replyMessages,
      deliveryRate: percent(delivered, sent),
      readRate: percent(read, delivered > 0 ? delivered : sent),
      replyRate: percent(replies, read > 0 ? read : delivered),
    };
  }, [campaign]);

  const followUpHref = (audience: 'repliers' | 'opened') => {
    const q = new URLSearchParams({
      fromCampaign: campaignId,
      audience,
      parentName: campaign?.name || 'Campaign',
    });
    return `/projects/${projectId}/campaigns/create?${q.toString()}`;
  };

  const isActiveCampaign = ['running', 'scheduled', 'completed'].includes(
    (campaign?.status || '').toLowerCase()
  );

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse space-y-6">
        <div className="h-10 w-72 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">{error}</div>
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/campaigns`)}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium"
        >
          Back to campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/campaigns`)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            All campaigns
          </button>
          <h1 className="text-2xl font-bold text-gray-900 truncate">{campaign?.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadgeClass(campaign?.status)}`}
            >
              {campaign?.status || 'draft'}
            </span>
            {campaign?.createdAt && (
              <span className="text-sm text-gray-500">
                Created {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href={`/projects/${projectId}/live-chat-v2`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <MessageSquare className="h-4 w-4" />
            Live Chat
          </Link>
        </div>
      </div>

      {/* Stats + follow-up — one compact bar */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          <div className="flex flex-1 min-w-0 divide-x divide-gray-100">
            {[
              { label: 'Sent', value: metrics.sent, pct: null as number | null },
              { label: 'Delivered', value: metrics.delivered, pct: metrics.deliveryRate },
              { label: 'Opened', value: metrics.read, pct: metrics.readRate },
              { label: 'Replied', value: metrics.replies, pct: metrics.replyRate },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 px-2 py-2 sm:px-3 text-center min-w-0">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">
                  {stat.label}
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{stat.value}</p>
                {stat.pct != null && (
                  <p className="text-[10px] text-gray-400">{formatPct(stat.pct)}</p>
                )}
              </div>
            ))}
          </div>

          {isActiveCampaign && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50/90 border-t sm:border-t-0 sm:border-l border-green-100 shrink-0">
              <p className="hidden md:block text-[10px] font-semibold text-green-800 uppercase tracking-wide shrink-0">
                Follow-up
              </p>
              <Link
                href={followUpHref('repliers')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                  audienceCounts.repliers > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 pointer-events-none'
                }`}
                aria-disabled={audienceCounts.repliers === 0}
              >
                <Send className="h-3.5 w-3.5" />
                Repliers ({audienceCounts.repliers})
              </Link>
              <Link
                href={followUpHref('opened')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap border transition ${
                  audienceCounts.opened > 0
                    ? 'border-green-600 text-green-700 bg-white hover:bg-green-50'
                    : 'border-gray-200 text-gray-400 bg-gray-50 pointer-events-none'
                }`}
                aria-disabled={audienceCounts.opened === 0}
              >
                <Eye className="h-3.5 w-3.5" />
                Opened ({audienceCounts.opened})
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recipients table */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              Recipients
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {audienceCounts.total} contacts · {audienceCounts.opened} opened ·{' '}
              {audienceCounts.repliers} replied
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'All'],
                ['opened', 'Opened'],
                ['replied', 'Replied'],
                ['not_replied', 'No reply'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRecipientFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  recipientFilter === key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[120px]">
          {recipientsInitialLoad ? (
            <p className="text-sm text-gray-500 py-12 text-center">Loading recipients…</p>
          ) : filteredRecipients.length === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">No contacts match this filter.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="py-3 px-5 font-medium">Contact</th>
                  <th className="py-3 px-5 font-medium">Phone</th>
                  <th className="py-3 px-5 font-medium">Status</th>
                  <th className="py-3 px-5 font-medium">Replied</th>
                  <th className="py-3 px-5 font-medium text-right">Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecipients.map((row) => (
                  <tr key={row.phone} className="hover:bg-gray-50/80">
                    <td className="py-3 px-5 font-medium text-gray-900">{row.name || '—'}</td>
                    <td className="py-3 px-5 text-gray-600 tabular-nums">{formatPhone(row.phone)}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_COLORS[row.outboundStatus] || STATUS_COLORS.pending
                        }`}
                      >
                        {row.outboundStatus}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      {row.replied ? (
                        <span className="text-green-700 font-medium">
                          Yes{row.replyCount > 1 ? ` · ${row.replyCount}` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Link
                        href={`/projects/${projectId}/live-chat-v2?phone=${encodeURIComponent(row.phone)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
