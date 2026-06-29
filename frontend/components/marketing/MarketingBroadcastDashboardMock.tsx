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

const MOBILE_COLS = {
  campaign: 'w-[46%]',
  status: 'w-[28%]',
  sent: 'w-[26%]',
} as const;

const COMPACT_NAV_LABELS = ['Dashboard', 'Live Chat', 'Campaigns', 'Templates', 'Analytics', 'Settings'] as const;

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function BroadcastRow({ row, index }: { row: MockCampaign; index: number }) {
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

function CompactSidebar() {
  const navItems = SIDEBAR_NAV.filter(
    (e) =>
      e.type === 'item' &&
      COMPACT_NAV_LABELS.includes(e.label as (typeof COMPACT_NAV_LABELS)[number]),
  );

  return (
    <aside className="flex w-[52px] shrink-0 flex-col bg-gray-900">
      <div className="flex h-10 items-center justify-center border-b border-gray-800 px-1">
        <motion.div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
          <MessageSquare className="h-3.5 w-3.5 text-white" aria-hidden />
        </motion.div>
      </div>
      <nav className="flex flex-col items-center gap-0.5 p-1.5">
        {navItems.map((entry) => {
          if (entry.type !== 'item') return null;
          const Icon = ICONS[entry.icon] ?? LayoutDashboard;
          return (
            <div
              key={entry.label}
              title={entry.label}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                entry.active ? 'bg-green-600 text-white' : 'text-gray-100'
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

/** Cropped campaigns UI — same look as hero dashboard mock, smaller footprint */
export function MarketingBroadcastDashboardMock() {
  const rows = MARKETING_MOCK_CAMPAIGNS.slice(0, 5);
  const th = 'px-2.5 py-2 text-left text-[10px] font-semibold text-slate-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="marketing-broadcast-mock pointer-events-none w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.1)] sm:rounded-2xl"
      aria-hidden
    >
      <div className="flex w-full min-w-0 items-stretch">
        <CompactSidebar />
        <div className="min-w-0 flex-1 bg-[#f9fafb]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 px-3 py-2.5">
            <div className="min-w-0 text-left">
              <p className="text-[9px] font-medium text-gray-500">Marketing</p>
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
                    <BroadcastRow key={row.id} row={row} index={index} />
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
