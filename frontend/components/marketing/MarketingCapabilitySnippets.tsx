'use client';

import { motion } from 'framer-motion';
import { MockExampleWorkspaceLabel } from '@/components/marketing/MarketingIndustryMockPrimitives';
import {
  MOCK_ANALYTICS_BARS,
  MOCK_ANALYTICS_KPIS,
  MOCK_CONTACTS,
  MOCK_FLOW_NODES,
  MOCK_LIVE_CHAT_CONVERSATIONS,
  MOCK_LIVE_CHAT_MESSAGES,
  type CapabilityMockId,
} from '@/components/marketing/marketing-capability-mock-data';
import { MARKETING_MOCK_CAMPAIGNS, STATUS_STYLES } from '@/components/marketing/marketing-campaigns-mock-data';

function MockFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative h-[200px] overflow-hidden border-b border-black/[0.06] bg-[#f4f4f5] sm:h-[220px] ${className}`}
      aria-hidden
    >
      {children}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-white via-white/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}

function LiveChatSnippet() {
  return (
    <MockFrame>
      <div className="flex h-full min-h-[200px] bg-white">
        <motion.div className="flex w-[42%] shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="flex gap-1 overflow-hidden border-b border-gray-200 bg-white px-2 py-1.5">
            {['All', 'Unread', 'Open'].map((f, i) => (
              <span
                key={f}
                className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  i === 0 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
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
                className={`border-b border-gray-100 px-2 py-2 ${c.active ? 'bg-white' : ''}`}
              >
                <motion.div className="flex items-start gap-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-800">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-[10px] font-semibold text-gray-900">{c.name}</p>
                      <span className="shrink-0 text-[8px] text-gray-400">{c.time}</span>
                    </div>
                    <p className="truncate text-[9px] text-gray-500">{c.preview}</p>
                    <span className="mt-0.5 inline-block rounded bg-gray-100 px-1 text-[8px] text-gray-600">
                      {c.agent}
                    </span>
                  </div>
                  {c.unread > 0 ? (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-green-600 px-1 text-[8px] font-bold text-white">
                      {c.unread}
                    </span>
                  ) : null}
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>
        <div className="flex min-w-0 flex-1 flex-col bg-[#e5ddd5]">
          <div className="flex items-center gap-2 border-b border-gray-200/80 bg-[#075e54] px-2.5 py-2">
            <div className="h-6 w-6 rounded-full bg-white/20" />
            <p className="truncate text-[10px] font-semibold text-white">Priya Sharma</p>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2">
            {MOCK_LIVE_CHAT_MESSAGES.map((m) => (
              <div
                key={m.id}
                className={`max-w-[88%] rounded-lg px-2 py-1 text-[9px] leading-snug shadow-sm ${
                  m.from === 'us'
                    ? 'ml-auto bg-[#dcf8c6] text-gray-900'
                    : 'mr-auto bg-white text-gray-900'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockFrame>
  );
}

function AnalyticsSnippet() {
  const rows = MARKETING_MOCK_CAMPAIGNS.slice(0, 3);
  const maxBar = Math.max(...MOCK_ANALYTICS_BARS);

  return (
    <MockFrame className="bg-[#f9fafb]">
      <div className="flex h-full flex-col p-2.5">
        <div>
          <div className="grid grid-cols-3 gap-1.5">
            {MOCK_ANALYTICS_KPIS.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 shadow-sm"
              >
                <p className="text-[8px] font-medium text-slate-500">{kpi.label}</p>
                <p className="text-sm font-bold tabular-nums text-slate-900">{kpi.value}</p>
                <p className="text-[8px] text-slate-500">{kpi.sub}</p>
              </div>
            ))}
          </div>
          <MockExampleWorkspaceLabel className="mt-1 text-right" />
        </div>
        <div className="mt-2 flex-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[9px] font-semibold text-slate-800">Campaign performance</p>
            <span className="text-[8px] text-green-700">Live</span>
          </div>
          <motion.div className="flex h-14 items-end gap-0.5">
            {MOCK_ANALYTICS_BARS.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t bg-green-500/80"
                style={{ height: `${(h / maxBar) * 100}%` }}
              />
            ))}
          </motion.div>
          <div className="mt-2 overflow-hidden rounded border border-gray-200">
            <table className="w-full text-left text-[9px]">
              <thead className="bg-gray-100 text-[8px] font-semibold text-slate-600">
                <tr>
                  <th className="px-2 py-1">Campaign</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1 text-right">Sent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 bg-white">
                    <td className="max-w-[80px] truncate px-2 py-1 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-2 py-1">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold capitalize ${STATUS_STYLES[row.status]}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-gray-700">
                      {row.sent.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MockFrame>
  );
}

function FlowBuilderSnippet() {
  return (
    <MockFrame className="bg-slate-100">
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d="M 72 70 Q 120 50 160 45"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <path
            d="M 200 55 Q 240 70 280 62"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <path
            d="M 320 70 Q 360 90 400 75"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
        </svg>
        {MOCK_FLOW_NODES.map((node) => (
          <div
            key={node.id}
            className="absolute min-w-[72px] rounded-lg border border-black/10 bg-white px-2 py-1.5 shadow-md"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className={`mb-1 h-1 w-6 rounded-full ${node.color}`} />
            <p className="text-[9px] font-semibold text-slate-800">{node.label}</p>
          </div>
        ))}
        <div className="absolute bottom-2 right-2 rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-[8px] font-medium text-slate-600 shadow-sm">
          No-code · Published
        </div>
      </div>
    </MockFrame>
  );
}

function ContactsSnippet() {
  return (
    <MockFrame>
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          <motion.div>
            <p className="text-[9px] font-medium text-gray-500">Audience</p>
            <p className="text-xs font-bold text-gray-900">Contacts</p>
          </motion.div>
          <span className="rounded-md bg-green-600 px-2 py-0.5 text-[9px] font-semibold text-white">
            Import
          </span>
        </div>
        <div className="flex gap-1 border-b border-gray-100 px-3 py-1.5">
          {['All', 'Opted in', 'Suppressed'].map((tab, i) => (
            <span
              key={tab}
              className={`rounded-full px-2 py-0.5 text-[8px] font-medium ${
                i === 1 ? 'bg-green-100 text-green-800' : 'text-gray-500'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-hidden px-2 py-1">
          <table className="w-full text-left text-[9px]">
            <thead>
              <tr className="border-b border-gray-100 text-[8px] font-semibold uppercase text-gray-500">
                <th className="py-1 pr-2">Name</th>
                <th className="py-1 pr-2">Phone</th>
                <th className="py-1">Tags</th>
                <th className="py-1 text-right">Opt-in</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CONTACTS.map((row, i) => (
                <tr key={row.name} className={i % 2 ? 'bg-gray-50/80' : ''}>
                  <td className="max-w-[72px] truncate py-1.5 pr-2 font-medium text-gray-900">
                    {row.name}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums text-gray-600">
                    {row.phone}
                  </td>
                  <td className="py-1.5">
                    <div className="flex flex-wrap gap-0.5">
                      {row.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-violet-100 px-1 py-0.5 text-[7px] font-medium text-violet-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5 text-right">
                    <span
                      className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                        row.optIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {row.optIn ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MockFrame>
  );
}

const SNIPPETS: Record<CapabilityMockId, () => React.ReactElement> = {
  liveChat: LiveChatSnippet,
  analytics: AnalyticsSnippet,
  flowBuilder: FlowBuilderSnippet,
  contacts: ContactsSnippet,
};

export function MarketingCapabilitySnippet({ type }: { type: CapabilityMockId }) {
  const Snippet = SNIPPETS[type];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="pointer-events-none select-none"
    >
      <Snippet />
    </motion.div>
  );
}
