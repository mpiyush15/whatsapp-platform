'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  IndianRupee,
  MessageSquare,
  ArrowLeft,
  Send,
  Inbox,
  Building2,
  TrendingUp,
  AlertTriangle,
  Smartphone,
  Layers,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { fetchPlatformAnalytics, type PlatformAnalytics } from '@/lib/superadminApi';
import {
  formatCount,
  HorizontalBarChart,
  PlatformDailyVolumeChart,
  PlatformTrendLine,
} from '@/components/platform/PlatformAnalyticsCharts';
import { VerticalBadgesFromCounts } from '@/components/platform/VerticalBadges';
import { verticalLabel } from '@/lib/projectVerticals';

const PERIODS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utility',
  authentication: 'Authentication',
  service: 'Service',
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'slate',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'green' | 'blue' | 'amber' | 'slate' | 'rose' | 'violet' | 'sky';
}) {
  const accents = {
    green: 'bg-green-50 text-green-700 border-green-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return (
    <div className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub ? (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{sub}</p>
          ) : (
            <span className="mt-1 block flex-1" />
          )}
        </div>
        <div className={`shrink-0 rounded-lg border p-2 ${accents[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function PlatformAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        setData(await fetchPlatformAnalytics(days));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days]
  );

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.volumeSummary;
  const sent = data?.messaging.messagesSent ?? data?.messaging.outbound ?? 0;
  const platform = data?.platform;

  return (
    <div className="min-h-full bg-slate-50/80 p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <Link
              href="/dashboard/superadmin"
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Platform analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              All tenants · last {days} days
              {data
                ? ` (${new Date(data.period.start).toLocaleDateString('en-IN')} – ${new Date(data.period.end).toLocaleDateString('en-IN')})`
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
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === p.value ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={loading || refreshing}
              className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        {loading && !data ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[7.5rem] animate-pulse rounded-xl border bg-white" />
            ))}
          </div>
        ) : null}

        
        {data ? (
          <div className="space-y-8">
            {refreshing ? <p className="text-center text-xs text-slate-500">Updating…</p> : null}

            <Section title="Messaging overview" description="Volume, delivery, and estimated Meta spend">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard label="Messages sent" value={formatCount(sent)} sub={`${data.messaging.deliveryRate}% delivery`} icon={Send} accent="green" />
                <MetricCard label="Total messages" value={formatCount(data.messaging.total)} sub={`${formatCount(data.messaging.inbound)} in · ${formatCount(data.messaging.outbound)} out`} icon={MessageSquare} accent="blue" />
                <MetricCard label="Delivered" value={formatCount(data.messaging.delivered)} sub={`${formatCount(data.messaging.read ?? 0)} read`} icon={CheckCircle2} accent="green" />
                <MetricCard label="Failed" value={formatCount(data.messaging.failed)} sub={data.messaging.failRate != null ? `${data.messaging.failRate}% fail` : undefined} icon={AlertTriangle} accent="rose" />
                <MetricCard label="Est. Meta spend" value={formatInr(data.messaging.meta.totalEstimatedInr)} sub={`${formatCount(data.messaging.meta.billableMessages)} billable`} icon={IndianRupee} accent="amber" />
                <MetricCard label="Active organizations" value={formatCount(data.messaging.activeOrganizations ?? 0)} sub={summary ? `${summary.daysWithActivity} active days` : undefined} icon={Building2} accent="slate" />
                <MetricCard label="Credits used" value={formatCount(data.credits.totalCredits)} sub="Platform-wide" icon={IndianRupee} accent="amber" />
                <MetricCard label="Daily average" value={formatCount(summary?.avgMessagesPerDay ?? 0)} sub={summary?.peakDay ? `Peak ${summary.peakDay.slice(5)}` : undefined} icon={Calendar} accent="slate" />
              </div>
            </Section>

            
            {platform ? (
              <Section title="Platform footprint" description="Projects, phones, and verticals">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <MetricCard label="Total projects" value={formatCount(platform.totalProjects)} sub="All orgs" icon={Building2} accent="blue" />
                  <MetricCard label="Connected phones" value={formatCount(platform.totalConnectedPhones)} sub="WA lines" icon={Smartphone} accent="green" />
                  <MetricCard label="Multi-project orgs" value={formatCount(platform.orgsWithMultipleProjects)} sub="2+ projects" icon={Layers} accent="violet" />
                  <MetricCard label="Mixed vertical orgs" value={formatCount(platform.orgsWithMixedVerticals ?? 0)} sub="Multiple lines" icon={TrendingUp} accent="sky" />
                </div>
              </Section>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <h3 className="text-base font-semibold text-slate-900">Daily message volume</h3>
                <p className="mt-0.5 text-sm text-slate-500">Last {days} days · inbound + outbound</p>
                {summary?.peakDay ? (
                  <p className="mt-2 inline-block rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                    Peak {summary.peakDay.slice(5)}: {formatCount(summary.peakTotal)} msgs
                  </p>
                ) : null}
                <div className="mt-3"><PlatformTrendLine data={data.dailyVolume} /></div>
                <div className="mt-4"><PlatformDailyVolumeChart data={data.dailyVolume} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-h-[18rem]">
                <h3 className="text-base font-semibold text-slate-900">Projects by vertical</h3>
                <p className="mt-0.5 text-sm text-slate-500">Product line distribution</p>
                <div className="mt-4 flex-1">
                  {platform?.projectsByVertical?.length ? (
                    <HorizontalBarChart
                      items={platform.projectsByVertical.map((row, i) => ({
                        label: verticalLabel(row.vertical),
                        value: row.count,
                        color: ['bg-green-500', 'bg-sky-500', 'bg-purple-500'][i % 3],
                      }))}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">No data</p>
                  )}
                </div>
                {(platform?.orgsWithMixedVerticals ?? 0) > 0 ? (
                  <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-indigo-700">
                    {platform.orgsWithMixedVerticals} orgs on multiple verticals
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Meta cost by category</h3>
                <p className="mt-0.5 text-sm text-slate-500">Estimated spend</p>
                <div className="mt-4">
                  <HorizontalBarChart
                    items={data.messaging.meta.breakdown.map((row, i) => ({
                      label: CATEGORY_LABELS[row.category] || row.category,
                      value: row.count,
                      color: ['bg-green-500', 'bg-emerald-400', 'bg-teal-500', 'bg-slate-400'][i % 4],
                    }))}
                  />
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Messages</th>
                      <th className="pb-2 text-right">INR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.messaging.meta.breakdown.map((row) => (
                      <tr key={row.category} className="border-b border-slate-50">
                        <td className="py-2">{CATEGORY_LABELS[row.category] || row.category}</td>
                        <td className="py-2">{formatCount(row.count)}</td>
                        <td className="py-2 text-right font-medium">{formatInr(row.subtotalInr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Credits by category</h3>
                <p className="mt-0.5 text-sm text-slate-500">Credits consumed</p>
                <div className="mt-4">
                  <HorizontalBarChart
                    items={data.credits.byCategory.map((row, i) => ({
                      label: CATEGORY_LABELS[row.category] || row.category || 'Other',
                      value: row.credits,
                      color: ['bg-amber-500', 'bg-orange-400', 'bg-yellow-500', 'bg-slate-400'][i % 4],
                    }))}
                  />
                </div>
              </div>
            </div>

            <Section title="Top organizations" description="By outbound messages sent">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-max min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3 min-w-[12rem]">Organization</th>
                      <th className="px-4 py-3">Projects</th>
                      <th className="px-4 py-3 min-w-[9rem]">Verticals</th>
                      <th className="px-4 py-3">Phones</th>
                      <th className="px-4 py-3 text-right">Sent</th>
                      <th className="px-4 py-3 min-w-[7rem]">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topOrganizations.map((org, idx) => {
                      const share = sent ? ((org.outboundMessages / sent) * 100).toFixed(1) : '0';
                      return (
                        <tr key={org.accountId} className="border-t border-slate-100 hover:bg-slate-50/80">
                          <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{org.name}</p>
                            <p className="text-xs text-slate-500">{org.email}</p>
                          </td>
                          <td className="px-4 py-3">{org.projectCount ?? 0}</td>
                          <td className="px-4 py-3">
                            <VerticalBadgesFromCounts projectsByVertical={org.projectsByVertical} compact />
                          </td>
                          <td className="px-4 py-3">{org.phoneCount ?? 0}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCount(org.outboundMessages)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full min-w-[2px] rounded-full bg-green-500"
                                  style={{ width: `${Math.min(100, Number(share))}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-600 tabular-nums w-10">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.topOrganizations.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-500">No outbound in period.</p>
                ) : null}
              </div>
            </Section>

            <p className="flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <Inbox className="h-3.5 w-3.5 shrink-0" />
              Meta costs are estimates (India rates).
            </p>

          </div>
        ) : null}

      </div>
    </div>
  );
}
