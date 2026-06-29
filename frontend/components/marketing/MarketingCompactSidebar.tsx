'use client';

import {
  BarChart3,
  Bot,
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
  Settings,
};

const DEFAULT_NAV = [
  'Dashboard',
  'Leads',
  'Contacts',
  'Live Chat',
  'Chatbot',
  'Flow Builder',
  'Campaigns',
  'Templates',
  'Analytics',
  'Settings',
] as const;

type Props = {
  /** Which nav item gets the green active state */
  activeLabel: string;
};

/** Icon-only dark sidebar — shared by marketing dashboard mocks */
export function MarketingCompactSidebar({ activeLabel }: Props) {
  const navItems = SIDEBAR_NAV.filter(
    (e) => e.type === 'item' && DEFAULT_NAV.includes(e.label as (typeof DEFAULT_NAV)[number]),
  );

  return (
    <aside className="flex w-[44px] shrink-0 flex-col bg-gray-900 sm:w-[48px]">
      <div className="flex h-9 items-center justify-center border-b border-gray-800">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-600">
          <MessageSquare className="h-3 w-3 text-white" aria-hidden />
        </div>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-hidden p-1">
        {navItems.map((entry) => {
          if (entry.type !== 'item') return null;
          const Icon = ICONS[entry.icon] ?? LayoutDashboard;
          const isActive = entry.label === activeLabel;
          return (
            <div
              key={entry.label}
              title={entry.label}
              className={`flex h-7 w-7 items-center justify-center rounded-md ${
                isActive ? 'bg-green-600 text-white' : 'text-gray-300'
              }`}
            >
              <Icon className="h-3 w-3 shrink-0" />
            </div>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-md text-gray-300">
          <LogOut className="h-3 w-3" aria-hidden />
        </div>
      </div>
    </aside>
  );
}
