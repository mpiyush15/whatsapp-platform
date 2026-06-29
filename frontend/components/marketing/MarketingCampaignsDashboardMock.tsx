'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronsUpDown,
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
import { MockExampleWorkspaceLabel } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  MARKETING_MOCK_CAMPAIGNS,
  SIDEBAR_NAV,
  STATUS_STYLES,
  type MockCampaign,
} from '@/components/marketing/marketing-campaigns-mock-data';

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

const ease = [0.22, 1, 0.36, 1] as const;

const COLS = {
  campaign: 'w-[22%]',
  status: 'w-[11%]',
  metric: 'w-[7%]',
  created: 'w-[13%]',
  actions: 'w-[9%]',
} as const;

const MOBILE_COLS = {
  campaign: 'w-[46%]',
  status: 'w-[28%]',
  sent: 'w-[26%]',
} as const;

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function SortHeader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold text-slate-700">
      {label}
      <ChevronsUpDown className="h-3 w-3 shrink-0 text-gray-400" aria-hidden />
    </span>
  );
}

function CampaignRow({ row, index }: { row: MockCampaign; index: number }) {
  const cell = 'px-2 py-1.5 text-[11px] text-gray-900';
  return (
    <motion.tr
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.02, duration: 0.28, ease }}
      className={index % 2 === 1 ? 'bg-gray-50/80' : 'bg-white'}
    >
      <td className={`${cell} ${COLS.campaign} max-w-0 truncate font-medium`} title={row.name}>
        {row.name}
      </td>
      <td className={`${cell} ${COLS.status}`}>
        <span
          className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize leading-tight ${STATUS_STYLES[row.status]}`}
        >
          {row.status}
        </span>
      </td>
      <td className={`${cell} ${COLS.metric} tabular-nums`}>{fmt(row.sent)}</td>
      <td className={`${cell} ${COLS.metric} tabular-nums`}>{fmt(row.delivered)}</td>
      <td className={`${cell} ${COLS.metric} tabular-nums`}>{fmt(row.read)}</td>
      <td className={`${cell} ${COLS.metric} tabular-nums`}>{fmt(row.replies)}</td>
      <td className={`${cell} ${COLS.metric} tabular-nums`}>{fmt(row.conversions)}</td>
      <td className={`${cell} ${COLS.created} whitespace-nowrap tabular-nums`}>{row.created}</td>
      <td className={`${cell} ${COLS.actions}`}>
        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">
          View
        </span>
      </td>
    </motion.tr>
  );
}

function MobileCampaignRow({ row, index }: { row: MockCampaign; index: number }) {
  const cell = 'px-2.5 py-2 text-[11px] text-gray-900';
  return (
    <tr className={index % 2 === 1 ? 'bg-gray-50/80' : 'bg-white'}>
      <td className={`${cell} ${MOBILE_COLS.campaign} max-w-0 truncate font-medium`} title={row.name}>
        {row.name}
      </td>
      <td className={`${cell} ${MOBILE_COLS.status}`}>
        <span
          className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLES[row.status]}`}
        >
          {row.status}
        </span>
      </td>
      <td className={`${cell} ${MOBILE_COLS.sent} tabular-nums text-right`}>{fmt(row.sent)}</td>
    </tr>
  );
}

const COMPACT_NAV_LABELS = ['Dashboard', 'Live Chat', 'Campaigns', 'Templates', 'Analytics', 'Settings'] as const;

function MockSidebar({ compact }: { compact?: boolean }) {
  const navItems = SIDEBAR_NAV.filter(
    (e) =>
      e.type === 'item' &&
      (!compact || COMPACT_NAV_LABELS.includes(e.label as (typeof COMPACT_NAV_LABELS)[number])),
  );

  return (
    <aside
      className={`flex shrink-0 flex-col bg-gray-900 ${compact ? 'w-[52px]' : 'w-[168px]'}`}
    >
      <div
        className={`flex items-center border-b border-gray-800 ${compact ? 'h-10 justify-center px-1' : 'h-11 justify-between gap-1 px-2.5'}`}
      >
        <div className={`flex min-w-0 items-center ${compact ? 'justify-center' : 'gap-1.5'}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-600">
            <MessageSquare className="h-3.5 w-3.5 text-white" />
          </div>
          {!compact ? <span className="truncate text-xs font-bold text-white">Replysys</span> : null}
        </div>
        {!compact ? <ChevronLeft className="h-4 w-4 shrink-0 text-gray-500" aria-hidden /> : null}
      </div>

      <nav className={`flex flex-col ${compact ? 'items-center gap-0.5 p-1.5' : 'space-y-0 p-2'}`}>
        {(compact ? navItems : SIDEBAR_NAV).map((entry, i) => {
          if (!compact && entry.type === 'group') {
            return (
              <p
                key={entry.label}
                className="px-2 pb-0 pt-2 text-[9px] font-semibold uppercase tracking-wide text-gray-500 first:pt-1"
              >
                {entry.label}
              </p>
            );
          }
          if (entry.type !== 'item') return null;
          const Icon = ICONS[entry.icon] ?? LayoutDashboard;
          return (
            <motion.div
              key={entry.label}
              initial={{ opacity: 0, x: compact ? 0 : -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 + i * 0.01, duration: 0.22, ease }}
              title={compact ? entry.label : undefined}
              className={`flex items-center rounded-lg font-medium leading-tight ${
                compact
                  ? `h-8 w-8 justify-center ${entry.active ? 'bg-green-600 text-white' : 'text-gray-100'}`
                  : `gap-2 px-2 py-1.5 text-[11px] ${entry.active ? 'bg-green-600 text-white' : 'text-gray-100'}`
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {!compact ? <span className="truncate">{entry.label}</span> : null}
            </motion.div>
          );
        })}
      </nav>

      <div className={`mt-auto border-t border-gray-800 ${compact ? 'p-1.5' : 'p-2'}`}>
        <div
          className={`flex items-center text-gray-100 ${compact ? 'h-8 w-8 justify-center rounded-lg' : 'gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium'}`}
          title={compact ? 'Logout' : undefined}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!compact ? 'Logout' : null}
        </div>
      </div>
    </aside>
  );
}

function MobileDashboardMock() {
  const rows = MARKETING_MOCK_CAMPAIGNS.slice(0, 6);
  const th = 'px-2.5 py-2 text-left text-[10px] font-semibold text-slate-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="marketing-dashboard-mock marketing-dashboard-mock--mobile pointer-events-none w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.1)] sm:rounded-2xl"
      aria-hidden
    >
      <div className="flex w-full min-w-0 items-stretch">
        <MockSidebar compact />
        <div className="min-w-0 flex-1 bg-[#f9fafb]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 px-3 py-2.5">
            <div className="min-w-0 text-left">
              <p className="text-[9px] font-medium text-gray-500">Campaigns</p>
              <h2 className="truncate text-sm font-bold leading-tight text-gray-900">Campaigns</h2>
            </div>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-green-600 px-2 py-1 text-[10px] font-semibold text-white">
              <span className="text-xs leading-none">+</span>
              New
            </span>
          </div>

          <div className="p-2">
            <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className={`${th} ${MOBILE_COLS.campaign}`}>Campaign</th>
                    <th className={`${th} ${MOBILE_COLS.status}`}>Status</th>
                    <th className={`${th} ${MOBILE_COLS.sent} text-right`}>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <MobileCampaignRow key={row.id} row={row} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DesktopDashboardMock() {
  const th = 'px-2 py-2 text-left text-[10px] font-semibold text-slate-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="marketing-dashboard-mock pointer-events-none mx-auto hidden w-full max-w-5xl select-none overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_20px_50px_rgba(17,17,17,0.12)] sm:block"
      aria-hidden
    >
      <motion.div className="flex w-full items-stretch">
        <MockSidebar />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="min-w-0 flex-1 bg-[#f9fafb]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 bg-[#f9fafb] px-3 py-2">
            <div>
              <p className="text-[10px] font-medium text-gray-500">Campaigns</p>
              <h1 className="text-[15px] font-bold leading-tight text-gray-900">Campaigns</h1>
            </div>
            <motion.span
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12, duration: 0.3, ease }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-[11px] font-semibold text-white"
            >
              <span className="text-sm leading-none">+</span>
              Create Campaign
            </motion.span>
          </div>

          <div className="p-2">
            <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className={`${th} ${COLS.campaign}`}>Campaign</th>
                    <th className={`${th} ${COLS.status}`}>Status</th>
                    <th className={`${th} ${COLS.metric}`}>Sent</th>
                    <th className={`${th} ${COLS.metric}`}>Delivered</th>
                    <th className={`${th} ${COLS.metric}`}>
                      <SortHeader label="Read" />
                    </th>
                    <th className={`${th} ${COLS.metric}`}>
                      <SortHeader label="Replies" />
                    </th>
                    <th className={`${th} ${COLS.metric}`}>
                      <SortHeader label="Conv." />
                    </th>
                    <th className={`${th} ${COLS.created}`}>
                      <SortHeader label="Created" />
                    </th>
                    <th className={`${th} ${COLS.actions}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MARKETING_MOCK_CAMPAIGNS.map((row, index) => (
                    <CampaignRow key={row.id} row={row} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function MarketingCampaignsDashboardMock() {
  return (
    <div className="w-full">
      <div className="w-full sm:hidden">
        <MobileDashboardMock />
      </div>
      <DesktopDashboardMock />
      <MockExampleWorkspaceLabel className="mt-2 text-center sm:text-right" />
    </div>
  );
}
