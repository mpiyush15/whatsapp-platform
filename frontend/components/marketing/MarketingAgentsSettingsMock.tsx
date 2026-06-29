'use client';

import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  GitBranch,
  Headset,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Phone,
  Plus,
  Settings,
  Target,
  User,
  Users,
  Webhook,
  Zap,
  Eye,
  type LucideIcon,
} from 'lucide-react';
import {
  ADVANCED_MOCK_AGENTS,
  ROLE_BADGE,
  STATUS_BADGE,
} from '@/components/marketing/marketing-advanced-features-mock-data';
import { SIDEBAR_NAV } from '@/components/marketing/marketing-campaigns-mock-data';

const MAIN_ICONS: Record<string, LucideIcon> = {
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

const SETTINGS_TABS = [
  { id: 'connect', label: 'Connect Number', icon: Phone },
  { id: 'quick', label: 'Quick Replies', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'agents', label: 'Agents', icon: Headset, active: true },
] as const;

function MainSidebar() {
  return (
    <aside className="flex w-[148px] shrink-0 flex-col bg-gray-900">
      <div className="flex h-9 items-center gap-1.5 border-b border-gray-800 px-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-600">
          <MessageSquare className="h-3 w-3 text-white" aria-hidden />
        </div>
        <span className="truncate text-[10px] font-bold text-white">Replysys</span>
      </div>
      <nav className="flex-1 overflow-hidden p-1.5">
        {SIDEBAR_NAV.map((entry) => {
          if (entry.type === 'group') {
            return (
              <p
                key={entry.label}
                className="px-1.5 pb-0.5 pt-1.5 text-[7px] font-semibold uppercase tracking-wide text-gray-500 first:pt-1"
              >
                {entry.label}
              </p>
            );
          }
          if (entry.type !== 'item') return null;
          const Icon = MAIN_ICONS[entry.icon] ?? LayoutDashboard;
          const isSettings = entry.label === 'Settings';
          return (
            <div
              key={entry.label}
              className={`mb-0.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[9px] font-medium ${
                isSettings ? 'bg-green-600 text-white' : 'text-gray-100'
              }`}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{entry.label}</span>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-1.5">
        <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[9px] font-medium text-gray-100">
          <LogOut className="h-3 w-3 shrink-0" />
          <span>Logout</span>
        </div>
      </div>
    </aside>
  );
}

function SettingsSubnav() {
  return (
    <aside className="flex w-[118px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <p className="px-2.5 py-2 text-[7px] font-semibold uppercase tracking-wider text-gray-500">
        Settings
      </p>
      <nav className="flex-1 px-1.5 pb-2">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] font-medium ${
                tab.id === 'agents'
                  ? 'bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100'
                  : 'text-gray-700'
              }`}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate leading-tight">{tab.label}</span>
            </div>
          );
        })}
        <p className="mb-1 mt-2 px-2 text-[7px] font-semibold uppercase tracking-wider text-gray-500">
          API & Webhooks
        </p>
        <div className="mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] font-medium text-gray-700">
          <KeyRound className="h-3 w-3 shrink-0" />
          <span className="truncate">API Keys</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] font-medium text-gray-700">
          <Webhook className="h-3 w-3 shrink-0" />
          <span className="truncate">Webhooks</span>
        </div>
      </nav>
    </aside>
  );
}

function AgentsPanel() {
  return (
    <div className="min-w-0 flex-1 bg-gray-50 p-2.5 sm:p-3">
      <p className="mb-2 text-[8px] text-gray-500">Settings / Agents</p>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Agents</h3>
          <p className="mt-0.5 text-[9px] text-gray-600">
            Manage your support team and agent assignments
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-teal-700 px-2 py-1 text-[9px] font-semibold text-white">
          <Plus className="h-3 w-3" aria-hidden />
          Add Agent
        </span>
      </div>
      <div className="mb-2 flex gap-1.5">
        <div className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[9px] text-gray-400">
          Search by name or email...
        </div>
        <div className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-[9px] text-gray-700">
          All Status
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-[9px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 font-semibold text-gray-700">Name</th>
              <th className="px-2 py-1.5 font-semibold text-gray-700">Email</th>
              <th className="px-2 py-1.5 font-semibold text-gray-700">Role</th>
              <th className="px-2 py-1.5 font-semibold text-gray-700">Status</th>
              <th className="px-2 py-1.5 font-semibold text-gray-700">Conversations</th>
              <th className="px-2 py-1.5 font-semibold text-gray-700">Joined</th>
              <th className="px-2 py-1.5 font-semibold text-gray-700" />
            </tr>
          </thead>
          <tbody>
            {ADVANCED_MOCK_AGENTS.map((agent) => (
              <tr key={agent.id} className="border-b border-gray-100 last:border-0">
                <td className="whitespace-nowrap px-2 py-1.5 font-medium text-gray-900">
                  {agent.name}
                </td>
                <td className="max-w-[72px] truncate px-2 py-1.5 text-gray-600">{agent.email}</td>
                <td className="px-2 py-1.5">
                  <span
                    className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-medium capitalize ${ROLE_BADGE[agent.role]}`}
                  >
                    {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-medium capitalize ${STATUS_BADGE[agent.status]}`}
                  >
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                </td>
                <td className="px-2 py-1.5 font-medium tabular-nums text-gray-900">
                  {agent.conversations}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-gray-600">{agent.joinedAt}</td>
                <td className="px-2 py-1.5">
                  <Eye className="h-3 w-3 text-blue-600" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Full settings → Agents UI (matches product screenshot) */
export function MarketingAgentsSettingsMock() {
  return (
    <div
      className="marketing-dashboard-mock pointer-events-none flex min-h-[280px] w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_32px_rgba(17,17,17,0.1)] sm:min-h-[300px]"
      aria-hidden
    >
      <MainSidebar />
      <SettingsSubnav />
      <AgentsPanel />
    </div>
  );
}
