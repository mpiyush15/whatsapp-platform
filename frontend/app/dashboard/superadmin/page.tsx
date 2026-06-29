'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  MessageSquare,
  CreditCard,
  RefreshCw,
  Building2,
  Clock,
  FolderKanban,
  Smartphone,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  fetchSuperadminDashboard,
  type SuperadminDashboard,
} from '@/lib/superadminApi';
import { formatCount } from '@/components/platform/PlatformAnalyticsCharts';
import {
  GlassPanel,
  MorphicAreaChart,
  MorphicDonutChart,
  MorphicGradientBars,
  MorphicHorizontalBars,
} from '@/components/platform/SuperadminDashboardCharts';
import { VerticalBadgesFromCounts } from '@/components/platform/VerticalBadges';
import { verticalLabel } from '@/lib/projectVerticals';
import { Skeleton, StatCardSkeleton } from '@/components/ui/skeleton';

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);
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
  accent?: 'green' | 'blue' | 'amber' | 'slate' | 'violet' | 'indigo' | 'sky';
}) {
  const accents = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return (
    <div className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-indigo-100/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub ? <p className="mt-1 text-xs text-slate-500 line-clamp-2">{sub}</p> : <span className="mt-1 block flex-1" />}
        </div>
        <div className={`shrink-0 rounded-lg border p-2 ${accents[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>

      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SuperadminDashboard | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setDashboard(await fetchSuperadminDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = dashboard?.overview;
  const projectStats = dashboard?.projectStats;
  const projectsByVertical = projectStats?.projectsByVertical ?? metrics?.projectsByVertical ?? [];
  const recentOrganizations = (dashboard?.organizations ?? []).slice(0, 5);
  const dailyVolume = dashboard?.dailyVolume ?? [];
  const signupsByDay = dashboard?.signupsByDay ?? [];
  const topOrgs = dashboard?.topOrganizations ?? [];

  const verticalDonut = projectsByVertical.map((row) => ({
    label: verticalLabel(row.vertical),
    value: row.count,
  }));
  const signupBars = signupsByDay.map((d) => ({ label: d.date, value: d.count }));
  const topOrgBars = topOrgs.map((o) => ({ label: o.name || o.email, value: o.outboundMessages ?? 0 }));
  const signupTotal = signupsByDay.reduce((s, d) => s + d.count, 0);

  if (loading && !dashboard) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-indigo-50/20 to-violet-50/30 p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px] space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>

          <section className="space-y-4">
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-indigo-50/20 to-violet-50/30 p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Superadmin</p>
            <h1 className="text-3xl font-bold text-slate-900">Platform Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Revenue, messaging, projects, and connected WhatsApp lines</p>
          </div>
          <button type="button" onClick={() => load(true)} disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        {metrics ? (
          <Section title="Business overview" description="Customers, subscriptions, and revenue">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Active customers" value={String(metrics.activeCustomers)} sub={`+${metrics.newCustomers} this month`} icon={Users} accent="indigo" />
              <MetricCard label="Active subscriptions" value={String(metrics.activeSubscriptions)} sub={`${metrics.pendingCustomers} pending signup`} icon={TrendingUp} accent="blue" />
              <MetricCard label="MRR" value={formatInr(metrics.mrr)} sub={`ARR ${formatInr(metrics.arr)}`} icon={DollarSign} accent="green" />
              <MetricCard label="Pending payments" value={String(metrics.pendingPayments ?? 0)} sub="Need review" icon={Clock} accent="amber" />
            </div>
          </Section>
        ) : null}

        {metrics ? (
          <Section title="Messaging & platform" description="Last 24h and 7-day activity">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Messages (24h)" value={formatCount(metrics.totalMessages24h)} sub={`${formatCount(metrics.creditsUsed30d)} credits (30d)`} icon={MessageSquare} accent="violet" />
              <MetricCard label="Total projects" value={String(metrics.totalProjects ?? 0)} sub={`${metrics.orgsWithMultipleProjects ?? 0} multi-project orgs`} icon={FolderKanban} accent="blue" />
              <MetricCard label="Connected phones" value={String(metrics.totalConnectedPhones ?? 0)} sub="Active WhatsApp lines" icon={Smartphone} accent="green" />
              <MetricCard label="Mixed verticals" value={String(projectStats?.orgsWithMixedVerticals ?? 0)} sub="Orgs with 2+ product lines" icon={Layers} accent="sky" />
            </div>
          </Section>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/dashboard/superadmin/admin/pending-payments"
            className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/80 p-4 shadow-sm transition hover:shadow-md">
            <Clock className="h-5 w-5 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-900">Pending payments</p>
              <p className="text-sm text-amber-800">{metrics?.pendingPayments ?? 0} need attention</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
          </Link>
          <Link href="/dashboard/superadmin/billing/reconciliation/overview"
            className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Reconciliation</p>
              <p className="text-sm text-slate-500">Stuck payments & credit fixes</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
          <Link href="/dashboard/superadmin/analytics/platform"
            className="flex items-center gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-4 shadow-sm transition hover:shadow-md">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Platform analytics</p>
              <p className="text-sm text-slate-500">Meta cost & message volume</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-violet-500" />
          </Link>
        </div>

        <Section title="Charts" description="7-day trends and project mix">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <GlassPanel className="xl:col-span-7">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">Message volume</h3>
                <p className="text-sm text-slate-500">Platform-wide sent & received (7d)</p>
              </div>
              {dailyVolume.length > 0 ? (
                <MorphicAreaChart data={dailyVolume} height={220} />
              ) : (
                <p className="text-sm text-slate-500">No volume data yet</p>
              )}
            </GlassPanel>
            <GlassPanel className="xl:col-span-5">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">New signups</h3>
                <p className="text-sm text-slate-500">
                  <span className="text-2xl font-bold text-indigo-700">{signupTotal}</span> orgs this week
                </p>
              </div>
              <MorphicGradientBars data={signupBars} height={200} />
            </GlassPanel>
            <GlassPanel className="xl:col-span-5">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">Projects by vertical</h3>
                <p className="text-sm text-slate-500">WhatsApp, healthcare, e-commerce</p>
              </div>
              <MorphicDonutChart items={verticalDonut} size={168} />
            </GlassPanel>
            <GlassPanel className="xl:col-span-7">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">Top organizations</h3>
                <p className="text-sm text-slate-500">Outbound messages (7d)</p>
              </div>
              {topOrgBars.length > 0 ? (
                <MorphicHorizontalBars data={topOrgBars} maxBars={6} />
              ) : (
                <p className="text-sm text-slate-500">No activity yet</p>
              )}
            </GlassPanel>
          </div>
        </Section>


        <GlassPanel className="overflow-hidden !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 bg-white/50 px-6 py-4 backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent organizations</h2>
              <p className="text-xs text-slate-500">Last 5 signups — open Organizations for full details</p>
            </div>
            <Link href="/dashboard/superadmin/organizations"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              <Building2 className="h-4 w-4" /> View all
            </Link>
          </div>
          {recentOrganizations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-indigo-50/40 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Projects</th>
                    <th className="px-6 py-3">Verticals</th>
                    <th className="px-6 py-3">Phones</th>
                    <th className="px-6 py-3">Msgs (7d)</th>
                    <th className="px-6 py-3">Plan</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrganizations.map((c) => (
                    <tr key={c.id} className="border-t border-indigo-50/80 hover:bg-indigo-50/20">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {c.name}
                        {c.hasMultipleVerticals ? (
                          <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">mixed</span>
                        ) : c.hasMultipleProjects ? (
                          <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">multi</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{c.email}</td>
                      <td className="px-6 py-3 text-slate-700">
                        {c.projectCount ?? 0}
                        {(c.connectedProjects ?? 0) > 0 ? (
                          <span className="text-xs text-indigo-600"> · {c.connectedProjects} WA</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-3">
                        <VerticalBadgesFromCounts projectsByVertical={c.projectsByVertical} compact />
                      </td>
                      <td className="px-6 py-3 text-slate-700">{c.phoneCount ?? 0}</td>
                      <td className="px-6 py-3 text-slate-700">{formatCount(c.messages7d ?? 0)}</td>
                      <td className="px-6 py-3 capitalize">{c.plan}</td>
                      <td className="px-6 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === 'active' ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'pending' ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                        }`}>{c.status}</span>
                      </td>
                      <td className="px-6 py-3 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No organizations yet</p>
            </div>
          )}
        </GlassPanel>

        {metrics ? (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <AlertCircle className="h-3.5 w-3.5" />
            Churn rate (30d): {metrics.churnRate.toFixed(1)}% — estimated from subscription status changes
          </p>
        ) : null}

      </div>
    </div>
  );
}
