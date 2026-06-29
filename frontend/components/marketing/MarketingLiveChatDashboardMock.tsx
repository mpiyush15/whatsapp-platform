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
  MOCK_LIVE_CHAT_CONVERSATIONS,
  MOCK_LIVE_CHAT_MESSAGES,
} from '@/components/marketing/marketing-capability-mock-data';
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

/**
 * Full chrome live chat mock (sidebar + inbox + thread) — same visual system as
 * MarketingBroadcastDashboardMock, so the support solution page looks like the real product.
 */
const COMPACT_NAV_LABELS = ['Dashboard', 'Live Chat', 'Campaigns', 'Templates', 'Analytics', 'Settings'] as const;

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
          const isActive = entry.label === 'Live Chat';
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

function LiveChatWorkspace() {
  const activeName = MOCK_LIVE_CHAT_CONVERSATIONS.find((c) => c.active)?.name ?? 'Conversation';

  return (
    <div className="flex min-h-[280px] w-full min-w-0 sm:min-h-[360px]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex w-[40%] shrink-0 flex-col border-r border-gray-200 bg-gray-50 sm:w-[38%]"
      >
        <div className="flex gap-1 overflow-hidden border-b border-gray-200 bg-white px-2.5 py-2">
          {(['All', 'Unread', 'Open'] as const).map((f, i) => (
            <span
              key={f}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-[11px] ${
                i === 0 ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f}
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {MOCK_LIVE_CHAT_CONVERSATIONS.map((c) => (
            <div
              key={c.id}
              className={`border-b border-gray-100 px-2.5 py-2.5 sm:px-3 ${c.active ? 'bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-9 sm:w-9 sm:text-xs ${
                    c.active ? 'bg-green-600 text-white' : 'bg-green-100 text-green-900'
                  }`}
                >
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[11px] font-semibold text-gray-900 sm:text-xs">{c.name}</p>
                    <span className="shrink-0 text-[9px] tabular-nums text-gray-400 sm:text-[10px]">{c.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] leading-snug text-gray-600 sm:text-[11px]">{c.preview}</p>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-700">
                      {c.agent}
                    </span>
                    {c.unread > 0 ? (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                        {c.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex min-w-0 flex-1 flex-col bg-[#e5ddd5]">
        <div className="flex items-center gap-2 border-b border-black/10 bg-[#075e54] px-3 py-2.5">
          <div className="h-8 w-8 rounded-full bg-white/25 ring-2 ring-white/30" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-white sm:text-sm">{activeName}</p>
            <p className="truncate text-[9px] text-white/75">Online · Cloud API</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-hidden p-2.5 sm:p-3">
          {MOCK_LIVE_CHAT_MESSAGES.map((m) => (
            <div
              key={m.id}
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed shadow-sm sm:text-xs ${
                m.from === 'us'
                  ? 'ml-auto rounded-br-md bg-[#dcf8c6] text-gray-900'
                  : 'mr-auto rounded-bl-md bg-white text-gray-900'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <div className="border-t border-black/10 bg-[#f0f0f0] p-2">
          <div className="flex items-center gap-2 rounded-full border border-gray-300/80 bg-white px-3 py-2 shadow-inner">
            <span className="flex-1 text-[10px] text-gray-400">Type a message…</span>
            <span className="rounded-full bg-green-600 px-2 py-1 text-[9px] font-semibold text-white">Send</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingLiveChatDashboardMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="marketing-livechat-mock pointer-events-none w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.1)] sm:rounded-2xl"
      aria-hidden
    >
      <div className="flex w-full min-w-0 items-stretch">
        <CompactSidebar />
        <div className="min-w-0 flex-1 bg-[#f9fafb]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 px-3 py-2.5">
            <div className="min-w-0 text-left">
              <p className="text-[9px] font-medium text-gray-500">Conversations</p>
              <h2 className="truncate text-sm font-bold leading-tight text-gray-900">Live Chat</h2>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 shadow-sm">
              3 open
            </span>
          </div>
          <div className="p-2">
            <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
              <LiveChatWorkspace />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
