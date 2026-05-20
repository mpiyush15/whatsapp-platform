'use client';

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

const COMPACT_NAV = [
  'Dashboard',
  'Live Chat',
  'Contacts',
  'Campaigns',
  'Chatbot',
  'Templates',
  'Flow Builder',
  'Analytics',
  'Settings',
] as const;

type Props = {
  activeNav: string;
  sectionLabel: string;
  pageTitle: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
};

function CompactSidebar({ activeNav }: { activeNav: string }) {
  const navItems = SIDEBAR_NAV.filter(
    (e) => e.type === 'item' && COMPACT_NAV.includes(e.label as (typeof COMPACT_NAV)[number]),
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
          const isActive = entry.label === activeNav;
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

/** Hero-style dashboard chrome — compact sidebar + main panel */
export function MarketingDashboardMockShell({
  activeNav,
  sectionLabel,
  pageTitle,
  children,
  headerAction,
}: Props) {
  return (
    <div className="marketing-dashboard-mock pointer-events-none flex w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_32px_rgba(17,17,17,0.08)]">
      <CompactSidebar activeNav={activeNav} />
      <div className="min-w-0 flex-1 bg-[#f9fafb]">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 bg-[#f9fafb] px-3 py-2">
          <div className="min-w-0 text-left">
            <p className="text-[9px] font-medium text-gray-500">{sectionLabel}</p>
            <h2 className="truncate text-sm font-bold leading-tight text-gray-900">{pageTitle}</h2>
          </div>
          {headerAction}
        </div>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
