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
import { fetchProjectAnalytics, type ProjectAnalytics, type DailyMessagePoint, type SourcePoint } from '@/lib/projectAnalyticsApi';
import { motion, AnimatePresence } from 'framer-motion';
import CampaignAnalytics from './CampaignAnalytics';

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
    green: { gradient: 'from-emerald-500/20 to-emerald-500/0', text: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50' },
    blue: { gradient: 'from-blue-500/20 to-blue-500/0', text: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50' },
    amber: { gradient: 'from-amber-500/20 to-amber-500/0', text: 'text-amber-600', border: 'border-amber-100', bg: 'bg-amber-50' },
    rose: { gradient: 'from-rose-500/20 to-rose-500/0', text: 'text-rose-600', border: 'border-rose-100', bg: 'bg-rose-50' },
    slate: { gradient: 'from-slate-500/20 to-slate-500/0', text: 'text-slate-600', border: 'border-slate-200', bg: 'bg-slate-50' },
  };
  const theme = accents[accent];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50">
      <div className={`absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br ${theme.gradient} blur-2xl transition-transform duration-700 group-hover:scale-150`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          {sub ? <p className="mt-1.5 text-xs font-medium text-slate-400">{sub}</p> : null}
        </div>
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${theme.border} ${theme.bg} ${theme.text} shadow-sm ring-4 ring-white`}>
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
    <div className="flex h-44 items-end gap-1 sm:gap-1.5">
      {data.map((point, i) => {
        const showLabel = i % showEvery === 0 || i === data.length - 1;
        return (
          <div
            key={point.date}
            className="group relative flex flex-1 flex-col items-center justify-end gap-1.5"
            title={`${point.date}: ${point.total} messages`}
          >
            <div className="flex w-full max-w-[28px] flex-col justify-end gap-0.5" style={{ height: '100%' }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(point.outbound / max) * 100}%` }}
                transition={{ duration: 0.8, type: "spring", bounce: 0 }}
                className="w-full rounded-sm bg-emerald-500 transition-colors group-hover:bg-emerald-600"
                style={{ minHeight: point.outbound ? 4 : 0 }}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(point.inbound / max) * 100}%` }}
                transition={{ duration: 0.8, type: "spring", bounce: 0, delay: 0.1 }}
                className="w-full rounded-sm bg-slate-200 transition-colors group-hover:bg-slate-300"
                style={{ minHeight: point.inbound ? 4 : 0 }}
              />
            </div>
            {showLabel ? (
              <span className="max-w-full truncate text-[10px] font-medium text-slate-400 sm:text-[11px]">
                {point.date.slice(5)}
              </span>
            ) : (
              <span className="h-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsPageSkeleton() {
  return (
    <motion.div 
      key="skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8 animate-pulse"
    >
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
    </motion.div>
  );
}

function SourceBreakdown({ items }: { items: SourcePoint[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const colors = ['bg-emerald-500', 'bg-teal-400', 'bg-cyan-400', 'bg-slate-300'];

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No outbound messages in this period.</p>
      ) : (
        items.map((item, i) => (
          <div key={item.key}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="font-medium text-slate-500">
                {formatNumber(item.value)} <span className="text-slate-300 mx-1">|</span> {formatPct((item.value / total) * 100)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / total) * 100}%` }}
                transition={{ duration: 1, type: "spring", bounce: 0 }}
                className={`h-full rounded-full ${colors[i % colors.length]}`}
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
  const [activeTab, setActiveTab] = useState<'performance' | 'funnel' | 'revenue'>('performance');
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

  const o = data?.overview;

  return (
    <AnimatePresence mode="wait">
      {initialLoading && !data ? (
        <AnalyticsPageSkeleton />
      ) : error && !data ? (
        <motion.div 
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-8"
        >
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
        </motion.div>
      ) : data && o ? (
        <motion.div 
          key="content"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8"
        >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              Project Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Project performance &middot; {new Date(data.period.start).toLocaleDateString()} &ndash;{' '}
              {new Date(data.period.end).toLocaleDateString()}
              {data.scope?.includesDefaultAccountData
                ? ' &middot; includes WhatsApp line activity for this account'
                : ''}
            </p>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('performance')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'performance' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Campaign Performance & Billing
            </button>
            <button
              onClick={() => setActiveTab('funnel')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'funnel' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Sales Funnel
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'revenue' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Revenue Growth
            </button>
          </nav>
        </div>

        {activeTab === 'funnel' || activeTab === 'revenue' ? (
          <CampaignAnalytics view={activeTab} />
        ) : (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div />
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
          <section className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-8 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
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
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow duration-300">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Message volume</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">Green = outbound · Gray = inbound</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <DailyVolumeChart data={data.charts.dailyMessages} />
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow duration-300">
            <h2 className="text-lg font-bold text-slate-900">Outbound by source</h2>
            <p className="mb-6 mt-0.5 text-xs font-medium text-slate-500">Where replies were sent from</p>
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
          <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow duration-300">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Top campaigns</h2>
              <Link
                href={`/projects/${projectId}/campaigns`}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View all →
              </Link>
            </div>
            {data.topCampaigns.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">No campaigns yet for this project.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3 pr-4">Campaign</th>
                      <th className="pb-3 pr-4">Sent</th>
                      <th className="pb-3 pr-4">Delivered</th>
                      <th className="pb-3">Reply rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCampaigns.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 pr-4">
                          <Link
                            href={`/projects/${projectId}/campaigns/${c.id}`}
                            className="font-semibold text-slate-900 hover:text-emerald-600"
                          >
                            {c.name}
                          </Link>
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{c.status}</span>
                        </td>
                        <td className="py-3.5 pr-4 font-medium text-slate-700">{formatNumber(c.sent)}</td>
                        <td className="py-3.5 pr-4 font-medium text-slate-700">
                          {formatNumber(c.delivered)} <span className="text-slate-400">({formatPct(c.deliveryRate)})</span>
                        </td>
                        <td className="py-3.5 font-bold text-slate-900">{formatPct(c.replyRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-slate-50/80 p-5 text-center text-xs">
              <div>
                <p className="text-lg font-extrabold text-slate-900">{formatNumber(data.campaigns.totalSent)}</p>
                <p className="mt-1 font-medium text-slate-500">Total sent</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900">{formatPct(data.campaigns.readRate)}</p>
                <p className="mt-1 font-medium text-slate-500">Read rate</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900">{formatPct(data.campaigns.replyRate)}</p>
                <p className="mt-1 font-medium text-slate-500">Reply rate</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow duration-300">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Automation & leads</h2>
              <Link
                href={`/projects/${projectId}/flow`}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
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
        )}
      </div>
      </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
