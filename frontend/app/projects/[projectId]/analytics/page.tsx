'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bot,
  MessageSquare,
  Megaphone,
  Users,
  RefreshCw,
  TrendingUp,
  Inbox,
  CheckCircle2,
  XCircle,
  Eye,
  IndianRupee,
  Receipt,
} from 'lucide-react';
import {
  fetchProjectAnalytics,
  type ProjectAnalytics,
  type DailyMessagePoint,
  type SourcePoint,
} from '@/lib/projectAnalyticsApi';

const PERIODS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
] as const;

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatPct(n: number) {
  return `${Number(n || 0).toFixed(1)}%`;
}

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utility',
  authentication: 'Authentication',
  service: 'Service (session)',
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'slate',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'green' | 'blue' | 'amber' | 'rose' | 'slate';
}) {
  const accents = {
    green: 'bg-green-50 text-green-700 border-green-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
        </div>
        <div className={`rounded-xl border p-2.5 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DailyVolumeChart({ data }: { data: DailyMessagePoint[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const showEvery = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  return (
    <div className="flex h-44 items-end gap-0.5 sm:gap-1">
      {data.map((point, i) => {
        const h = Math.max(4, (point.total / max) * 100);
        const showLabel = i % showEvery === 0 || i === data.length - 1;
        return (
          <div
            key={point.date}
            className="group relative flex flex-1 flex-col items-center justify-end gap-1"
            title={`${point.date}: ${point.total} messages`}
          >
            <div className="flex w-full max-w-[28px] flex-col justify-end gap-0.5" style={{ height: '100%' }}>
              <div
                className="w-full rounded-t bg-green-500/90 transition-all group-hover:bg-green-600"
                style={{ height: `${(point.outbound / max) * 100}%`, minHeight: point.outbound ? 2 : 0 }}
              />
              <div
                className="w-full rounded-t bg-slate-300 transition-all group-hover:bg-slate-400"
                style={{ height: `${(point.inbound / max) * 100}%`, minHeight: point.inbound ? 2 : 0 }}
              />
            </div>
            {showLabel ? (
              <span className="max-w-full truncate text-[9px] text-slate-400 sm:text-[10px]">
                {point.date.slice(5)}
              </span>
            ) : (
              <span className="h-3" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsPageSkeleton() {
  return (
    <div className="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="h-8 w-40 rounded-lg bg-slate-200" />
            <div className="mt-2 h-4 w-72 max-w-full rounded bg-slate-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-48 rounded-xl bg-slate-200" />
            <div className="h-10 w-24 rounded-xl bg-slate-200" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="h-56 rounded-2xl border border-amber-200/80 bg-amber-50/50" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-64 rounded-2xl border border-slate-200 bg-white lg:col-span-2" />
          <div className="h-64 rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}

function SourceBreakdown({ items }: { items: SourcePoint[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const colors = ['bg-green-500', 'bg-emerald-400', 'bg-teal-400', 'bg-slate-400'];

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No outbound messages in this period.</p>
      ) : (
        items.map((item, i) => (
          <div key={item.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="text-slate-500">
                {formatNumber(item.value)} · {formatPct((item.value / total) * 100)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${colors[i % colors.length]}`}
                style={{ width: `${(item.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ProjectAnalytics | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isFirstLoad = !hasDataRef.current;

    try {
      if (isFirstLoad) setInitialLoading(true);
      else setRefreshing(true);
      setError(null);

      const analytics = await fetchProjectAnalytics(projectId, days);
      if (requestId !== requestIdRef.current) return;

      hasDataRef.current = true;
      setData(analytics);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      if (isFirstLoad) setData(null);
    } finally {
      if (requestId !== requestIdRef.current) return;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [projectId, days]);

  useEffect(() => {
    if (projectId) load();
  }, [projectId, days, load]);

  if (initialLoading && !data) {
    return <AnalyticsPageSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <p className="font-semibold">Could not load analytics</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const o = data.overview;

  return (
    <div className="relative min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      {refreshing ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-slate-50/60 pt-24"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-md">
            <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
            Updating…
          </div>
        </div>
      ) : null}
      <div
        className={`mx-auto max-w-7xl space-y-6 transition-opacity duration-200 ${
          refreshing ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              Project performance · {new Date(data.period.start).toLocaleDateString()} –{' '}
              {new Date(data.period.end).toLocaleDateString()}
              {data.scope?.includesDefaultAccountData
                ? ' · includes WhatsApp line activity for this account'
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setDays(p.value)}
                  disabled={refreshing}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                    days === p.value
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              disabled={refreshing || initialLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total messages"
            value={formatNumber(o.totalMessages)}
            sub={`${formatNumber(o.inbound)} in · ${formatNumber(o.outbound)} out`}
            icon={MessageSquare}
            accent="green"
          />
          <KpiCard
            label="Delivery rate"
            value={formatPct(o.deliveryRate)}
            sub={`${formatNumber(o.delivered)} delivered`}
            icon={CheckCircle2}
            accent="blue"
          />
          <KpiCard
            label="Read rate"
            value={formatPct(o.readRate)}
            sub={`${formatNumber(o.read)} read`}
            icon={Eye}
            accent="slate"
          />
          <KpiCard
            label="Failed"
            value={formatNumber(o.failed)}
            sub={formatPct(o.failRate) + ' of outbound'}
            icon={XCircle}
            accent="rose"
          />
        </div>

        {data.billing ? (
          <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <IndianRupee className="h-5 w-5 text-amber-700" />
                  Messaging cost & billing
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
                  {data.billing.meta.disclaimer} Rates shown for {data.billing.meta.region} (
                  {data.billing.meta.currency}).
                </p>
              </div>
              <Link
                href={`/projects/${projectId}/billing`}
                className="text-sm font-medium text-amber-800 hover:text-amber-900"
              >
                Billing center →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Estimated Meta spend
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {formatInr(data.billing.meta.totalEstimatedInr)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(data.billing.meta.billableMessages)} billable outbound messages
                </p>
              </div>
              <div className="rounded-xl border border-white bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Replysys credits used
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {formatNumber(data.billing.account.creditsUsed)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ≈ {formatInr(data.billing.account.estimatedInrFromCredits)} · balance{' '}
                  {formatNumber(data.billing.account.currentCreditBalance)}
                  {data.billing.account.accountCreditsUsed != null &&
                  data.billing.account.accountCreditsUsed !==
                    data.billing.account.creditsUsed
                    ? ` · account total ${formatNumber(data.billing.account.accountCreditsUsed)}`
                    : ''}
                </p>
              </div>
              <div className="rounded-xl border border-white bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Meta tier (24h)
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {formatNumber(data.billing.tier.totalUniqueContacts24h)}
                </p>
                <p className="mt-1 text-xs text-slate-500">unique contacts messaged</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Meta category</th>
                    <th className="px-4 py-3">Messages</th>
                    <th className="px-4 py-3">Rate / msg</th>
                    <th className="px-4 py-3">Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.billing.meta.breakdown.map((row) => (
                    <tr key={row.category} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {CATEGORY_LABELS[row.category] || row.category}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatNumber(row.count)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatInr(row.rateInr)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatInr(row.subtotalInr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900" colSpan={3}>
                      Total estimated
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {formatInr(data.billing.meta.totalEstimatedInr)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {data.billing.account.creditsByCategory &&
            data.billing.account.creditsByCategory.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Credits used by category</th>
                      <th className="px-4 py-3">Messages</th>
                      <th className="px-4 py-3">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.billing.account.creditsByCategory.map((row) => (
                      <tr key={row.category} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {CATEGORY_LABELS[row.category] || row.category}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatNumber(row.messages)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatNumber(row.credits)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {data.billing.account.note}
            </p>
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Message volume</h2>
                <p className="text-xs text-slate-500">Green = outbound · Gray = inbound</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <DailyVolumeChart data={data.charts.dailyMessages} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Outbound by source</h2>
            <p className="mb-4 text-xs text-slate-500">Where replies were sent from</p>
            <SourceBreakdown items={data.charts.messagesBySource} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Conversations"
            value={formatNumber(data.conversations.total)}
            sub={`${data.conversations.open} open · ${data.conversations.activeInPeriod} active in period`}
            icon={Inbox}
          />
          <KpiCard
            label="Contacts"
            value={formatNumber(data.contacts.total)}
            icon={Users}
            accent="blue"
          />
          <KpiCard
            label="Campaigns"
            value={data.campaigns.count}
            sub={`${formatPct(data.campaigns.deliveryRate)} delivery · ${data.campaigns.running} running`}
            icon={Megaphone}
            accent="amber"
          />
          <KpiCard
            label="Chatbot triggers"
            value={formatNumber(data.automation.totalTriggers)}
            sub={`${data.automation.active} active · ${data.automation.workflowFlows} flows`}
            icon={Bot}
            accent="green"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Top campaigns</h2>
              <Link
                href={`/projects/${projectId}/campaigns`}
                className="text-sm font-medium text-green-700 hover:text-green-800"
              >
                View all →
              </Link>
            </div>
            {data.topCampaigns.length === 0 ? (
              <p className="text-sm text-slate-500">No campaigns yet for this project.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4">Campaign</th>
                      <th className="pb-2 pr-4">Sent</th>
                      <th className="pb-2 pr-4">Delivered</th>
                      <th className="pb-2">Reply rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCampaigns.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/projects/${projectId}/campaigns/${c.id}`}
                            className="font-medium text-slate-900 hover:text-green-700"
                          >
                            {c.name}
                          </Link>
                          <span className="ml-2 text-xs capitalize text-slate-400">{c.status}</span>
                        </td>
                        <td className="py-3 pr-4 text-slate-700">{formatNumber(c.sent)}</td>
                        <td className="py-3 pr-4 text-slate-700">
                          {formatNumber(c.delivered)} ({formatPct(c.deliveryRate)})
                        </td>
                        <td className="py-3 text-slate-700">{formatPct(c.replyRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 text-center text-xs">
              <div>
                <p className="font-bold text-slate-900">{formatNumber(data.campaigns.totalSent)}</p>
                <p className="text-slate-500">Total sent</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">{formatPct(data.campaigns.readRate)}</p>
                <p className="text-slate-500">Read rate</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">{formatPct(data.campaigns.replyRate)}</p>
                <p className="text-slate-500">Reply rate</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Automation & leads</h2>
              <Link
                href={`/projects/${projectId}/flow`}
                className="text-sm font-medium text-green-700 hover:text-green-800"
              >
                Flow builder →
              </Link>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Flow completions (leads)</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(data.leads.chatbotLeadsInPeriod)}
                </p>
                <p className="text-xs text-slate-500">in selected period</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Avg flow success</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatPct(data.automation.avgSuccessRate)}
                </p>
                <p className="text-xs text-slate-500">across chatbots</p>
              </div>
            </div>

            {data.automation.topBots.length === 0 ? (
              <p className="text-sm text-slate-500">No chatbots configured.</p>
            ) : (
              <ul className="space-y-2">
                {data.automation.topBots.map((bot) => (
                  <li
                    key={bot.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{bot.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {bot.replyType} · {bot.isActive ? 'live' : 'off'}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-900">{bot.triggerCount} triggers</p>
                      <p className="text-xs text-slate-500">{formatPct(bot.successRate)} success</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lead pipeline
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'New', value: data.leads.pipeline.new },
                  { label: 'Contacted', value: data.leads.pipeline.contacted },
                  { label: 'Qualified', value: data.leads.pipeline.qualified },
                  { label: 'Converted', value: data.leads.pipeline.converted },
                ].map((s) => (
                  <span
                    key={s.label}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {s.label}: {s.value}
                  </span>
                ))}
              </div>
              <Link
                href={`/projects/${projectId}/leads`}
                className="mt-3 inline-block text-sm font-medium text-green-700 hover:text-green-800"
              >
                Open leads →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
