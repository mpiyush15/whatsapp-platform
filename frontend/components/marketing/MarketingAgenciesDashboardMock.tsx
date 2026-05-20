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
  MOCK_AGENCY_CLIENT_ROWS,
  MOCK_AGENCY_KPIS,
  MOCK_ANALYTICS_BARS,
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

const SPARK_BARS = MOCK_ANALYTICS_BARS.slice(4, 11);
const MAX_SPARK = Math.max(...SPARK_BARS);

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
          const isActive = entry.label === 'Dashboard';
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

function AgenciesWorkspace() {
  const chartMaxPx = 56;

  return (
    <div className="flex min-h-[248px] w-full min-w-0 flex-col gap-2 p-2 sm:min-h-[300px] sm:gap-2.5 sm:p-2.5">
      <div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
          {MOCK_AGENCY_KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 shadow-sm sm:px-2.5 sm:py-2"
            >
              <p className="text-[8px] font-medium uppercase tracking-wide text-slate-500 sm:text-[9px]">{kpi.label}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums tracking-tight text-slate-900 sm:text-lg">{kpi.value}</p>
              <p className="mt-0.5 text-[8px] text-slate-500 sm:text-[9px]">{kpi.sub}</p>
            </div>
          ))}
        </div>
        <MockExampleWorkspaceLabel className="mt-1.5 text-right" />
      </div>

      <div className="rounded-lg border border-violet-200/80 bg-gradient-to-r from-violet-50/90 to-white px-2 py-1.5 shadow-sm sm:px-2.5 sm:py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] sm:text-[10px]">
          <span className="font-semibold text-slate-800">Portfolio revenue signals · illustrative</span>
          <span className="tabular-nums font-bold text-violet-800">Client-attributed pipeline · ₹2.1Cr</span>
        </div>
        <p className="mt-0.5 text-[8px] text-slate-500">INR · Meta category spend visible per project · MTD roll-up ₹6.84L</p>
        <MockExampleWorkspaceLabel className="mt-1 text-right" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm sm:px-2.5 sm:py-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[9px] font-semibold text-slate-800 sm:text-[10px]">7-day portfolio pulse</p>
          <span className="text-[8px] font-medium text-emerald-700">WhatsApp volume index</span>
        </div>
        <div className="flex h-[52px] items-end justify-between gap-px px-0.5 sm:h-[60px] sm:gap-0.5">
          {SPARK_BARS.map((h, i) => {
            const barH = Math.max(6, Math.round((h / MAX_SPARK) * chartMaxPx));
            return (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: barH }}
                  transition={{ duration: 0.4, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-[26px] rounded-t-sm bg-gradient-to-t from-violet-600 to-violet-400 sm:max-w-[34px]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm sm:px-2.5 sm:py-2">
        <p className="mb-1.5 text-[9px] font-semibold text-slate-800 sm:text-[10px]">Client workspaces</p>
        <ul className="space-y-1.5">
          {MOCK_AGENCY_CLIENT_ROWS.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-slate-100 pb-1.5 text-[9px] last:border-0 last:pb-0 sm:text-[10px]"
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{row.name}</span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-600">
                {row.segment}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-violet-800">{row.spend}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Compact multi-client “agency rollup” mock — dense KPIs + spend banner + spark + client list. */
export function MarketingAgenciesDashboardMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.42 }}
      className="marketing-agencies-mock pointer-events-none w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_14px_36px_rgba(17,17,17,0.1)] sm:rounded-2xl"
      aria-hidden
    >
      <div className="flex w-full min-w-0 items-stretch">
        <CompactSidebar />
        <div className="min-w-0 flex-1 bg-[#f9fafb]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 px-2.5 py-2 sm:px-3">
            <div className="min-w-0 text-left">
              <p className="text-[9px] font-medium text-gray-500">Organization</p>
              <h2 className="truncate text-xs font-bold leading-tight text-gray-900 sm:text-sm">Agency portfolio</h2>
            </div>
            <span className="hidden max-w-[140px] truncate rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[8px] font-medium text-slate-600 shadow-sm sm:inline-block">
              28 projects · one login
            </span>
          </div>
          <div className="p-1.5 sm:p-2">
            <div className="overflow-hidden rounded-lg border border-gray-300 bg-[#fafafa] shadow-inner">
              <AgenciesWorkspace />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
