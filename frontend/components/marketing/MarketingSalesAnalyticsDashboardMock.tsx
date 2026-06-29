'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  Target,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  MOCK_ANALYTICS_BARS,
  MOCK_SALES_ACTIVITY_ROWS,
  MOCK_SALES_ANALYTICS_KPIS,
} from '@/components/marketing/marketing-capability-mock-data';
import { MockExampleWorkspaceLabel } from '@/components/marketing/MarketingIndustryMockPrimitives';
import { SIDEBAR_NAV } from '@/components/marketing/marketing-campaigns-mock-data';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Target,
  Users,
  MessageSquare,
  Bot,
  GitBranch,
  Megaphone,
  FileText,
  BarChart3,
  User,
  CreditCard,
  Settings,
};

const COMPACT_NAV_LABELS = ['Dashboard', 'Live Chat', 'Campaigns', 'Templates', 'Analytics', 'Settings'] as const;

const WEEK_BAR_HEIGHTS = MOCK_ANALYTICS_BARS.slice(0, 7);
const MAX_BAR = Math.max(...WEEK_BAR_HEIGHTS);

function CompactSidebar() {
  const navItems = SIDEBAR_NAV.filter(
    (e) => e.type === 'item' && COMPACT_NAV_LABELS.includes(e.label as (typeof COMPACT_NAV_LABELS)[number]),
  );

  return (
    <aside className="flex w-[52px] shrink-0 flex-col bg-gray-900">
      <div className="flex h-10 items-center justify-center border-b border-gray-800 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
          <MessageSquare className="h-3.5 w-3.5 text-white" aria-hidden />
        </div>
      </div>
      <nav className="flex flex-col items-center gap-0.5 p-1.5">
        {navItems.map((entry) => {
          if (entry.type !== 'item') return null;
          const Icon = ICONS[entry.icon] ?? LayoutDashboard;
          const isActive = entry.label === 'Analytics';
          return (
            <div
              key={entry.label}
              title={entry.label}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isActive ? 'bg-green-600 text-white' : 'text-gray-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
            </div>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-gray-800 p-1.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-100" title="Logout">
          <LogOut className="h-3.5 w-3.5" />
        </div>
      </div>
    </aside>
  );
}

function AnalyticsWorkspace() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const chartMaxPx = 76;

  return (
    <div className="flex min-h-[300px] w-full min-w-0 flex-col gap-3 p-2.5 sm:min-h-[340px] sm:gap-3.5 sm:p-3">
      <div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MOCK_SALES_ANALYTICS_KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 shadow-sm sm:px-3 sm:py-2.5"
            >
              <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500 sm:text-[10px]">{kpi.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-slate-900 sm:text-xl">{kpi.value}</p>
              <p className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">{kpi.sub}</p>
            </div>
          ))}
        </div>
        <MockExampleWorkspaceLabel className="mt-1.5 text-right" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold text-slate-800 sm:text-[11px]">Inbound conversations</p>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
            Last 7 days
          </span>
        </div>
        <div className="flex h-[92px] items-end justify-between gap-1 px-0.5 sm:h-[104px] sm:gap-1.5">
          {WEEK_BAR_HEIGHTS.map((h, i) => {
            const barH = Math.max(10, Math.round((h / MAX_BAR) * chartMaxPx));
            return (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: barH }}
                  transition={{ duration: 0.45, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-green-600 to-green-400 sm:max-w-[40px]"
                />
                <span className="text-[8px] font-medium tabular-nums text-slate-400 sm:text-[9px]">{days[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
        <p className="mb-2 text-[10px] font-semibold text-slate-800 sm:text-[11px]">Pipeline-facing threads</p>
        <ul className="space-y-2">
          {MOCK_SALES_ACTIVITY_ROWS.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 pb-2 text-[10px] last:border-0 last:pb-0 sm:text-[11px]"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{row.summary}</span>
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 tabular-nums text-[9px] font-medium text-slate-600">
                {row.owner}
              </span>
              <span className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-800">
                {row.state}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Full-app Analytics view for Sales solution page — avoids overcrowded campaign tables in narrow proof panels. */
export function MarketingSalesAnalyticsDashboardMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="marketing-sales-analytics-mock pointer-events-none w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.1)] sm:rounded-2xl"
      aria-hidden
    >
      <div className="flex w-full min-w-0 items-stretch">
        <CompactSidebar />
        <div className="min-w-0 flex-1 bg-[#f9fafb]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 px-3 py-2.5">
            <div className="min-w-0 text-left">
              <p className="text-[9px] font-medium text-gray-500">Analytics</p>
              <h2 className="truncate text-sm font-bold leading-tight text-gray-900">Sales overview</h2>
            </div>
            <span className="hidden shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-medium text-slate-600 shadow-sm sm:inline-flex">
              WhatsApp · Cloud API
            </span>
          </div>
          <div className="p-2">
            <div className="overflow-hidden rounded-lg border border-gray-300 bg-[#fafafa] shadow-inner">
              <AnalyticsWorkspace />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
