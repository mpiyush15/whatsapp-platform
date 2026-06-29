'use client';

import { ArrowLeft, Eye, MessageSquare, RefreshCw, Send, Users } from 'lucide-react';
import {
  ADVANCED_MOCK_CAMPAIGN_DETAIL,
  ADVANCED_MOCK_CAMPAIGN_RECIPIENTS,
  RECIPIENT_STATUS_BADGE,
} from '@/components/marketing/marketing-advanced-features-mock-data';
import { MarketingCompactSidebar } from '@/components/marketing/MarketingCompactSidebar';

const FILTER_TABS = ['All', 'Opened', 'Replied', 'No reply'] as const;

const { metrics, followUp, summary } = ADVANCED_MOCK_CAMPAIGN_DETAIL;


function CampaignDetailMain() {
  const stats = [
    { label: 'Sent', value: metrics.sent, pct: null as number | null },
    { label: 'Delivered', value: metrics.delivered, pct: metrics.deliveryPct },
    { label: 'Opened', value: metrics.opened, pct: metrics.openPct },
    { label: 'Replied', value: metrics.replied, pct: metrics.replyPct },
  ];

  return (
    <div className="min-w-0 flex-1 bg-[#f9fafb]">
      <div className="border-b border-gray-200 bg-white px-2.5 py-2">
        <p className="mb-1 flex items-center gap-0.5 text-[8px] text-gray-500">
          <ArrowLeft className="h-2.5 w-2.5" aria-hidden />
          All campaigns
        </p>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-gray-900">
              {ADVANCED_MOCK_CAMPAIGN_DETAIL.name}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[7px] font-semibold capitalize text-green-800">
                {ADVANCED_MOCK_CAMPAIGN_DETAIL.status}
              </span>
              <span className="text-[7px] text-gray-500">
                Created {ADVANCED_MOCK_CAMPAIGN_DETAIL.createdAt}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <span className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[7px] font-medium text-gray-700">
              <RefreshCw className="h-2.5 w-2.5" aria-hidden />
              Refresh
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[7px] font-medium text-gray-700">
              <MessageSquare className="h-2.5 w-2.5" aria-hidden />
              Live Chat
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-2">
        {/* Metrics + follow-up */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 divide-x divide-gray-100">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-0 flex-1 px-1 py-1.5 text-center sm:px-1.5">
                  <p className="truncate text-[7px] font-medium uppercase tracking-wide text-gray-500">
                    {stat.label}
                  </p>
                  <p className="text-[11px] font-bold leading-tight text-gray-900 sm:text-xs">
                    {stat.value.toLocaleString('en-US')}
                  </p>
                  {stat.pct != null ? (
                    <p className="text-[7px] text-gray-400">{stat.pct.toFixed(1)}%</p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1 border-t border-green-100 bg-green-50/90 px-2 py-1.5 sm:border-l sm:border-t-0">
              <p className="hidden text-[7px] font-semibold uppercase tracking-wide text-green-800 sm:block">
                Follow-up
              </p>
              <span className="inline-flex items-center gap-0.5 rounded-md bg-green-600 px-1.5 py-1 text-[7px] font-semibold text-white">
                <Send className="h-2.5 w-2.5" aria-hidden />
                Repliers ({followUp.repliers})
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-md border border-green-600 bg-white px-1.5 py-1 text-[7px] font-semibold text-green-700">
                <Eye className="h-2.5 w-2.5" aria-hidden />
                Opened ({followUp.opened.toLocaleString('en-US')})
              </span>
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-2 py-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="flex items-center gap-1 text-[9px] font-semibold text-gray-900">
                  <Users className="h-3 w-3 text-gray-500" aria-hidden />
                  Recipients
                </h4>
                <p className="mt-0.5 text-[7px] text-gray-500">
                  {summary.total.toLocaleString('en-US')} contacts · {summary.opened.toLocaleString('en-US')}{' '}
                  opened · {summary.replied} replied
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-0.5">
                {FILTER_TABS.map((tab, i) => (
                  <span
                    key={tab}
                    className={`rounded-md px-1.5 py-0.5 text-[7px] font-medium ${
                      i === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[140px] overflow-hidden sm:max-h-[160px]">
            <table className="w-full text-left text-[7px] sm:text-[8px]">
              <thead className="sticky top-0 z-[1] bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-2 py-1 font-medium">Contact</th>
                  <th className="px-2 py-1 font-medium">Phone</th>
                  <th className="px-2 py-1 font-medium">Status</th>
                  <th className="px-2 py-1 font-medium">Replied</th>
                  <th className="px-2 py-1 text-right font-medium">Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ADVANCED_MOCK_CAMPAIGN_RECIPIENTS.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="max-w-[56px] truncate px-2 py-1 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums text-gray-600">
                      {row.phone}
                    </td>
                    <td className="px-2 py-1">
                      <span
                        className={`inline-flex rounded-full px-1 py-0.5 text-[7px] font-medium capitalize ${RECIPIENT_STATUS_BADGE[row.status]}`}
                      >
                        {row.status === 'read' ? 'Read' : row.status}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      {row.replied ? (
                        <span className="font-medium text-green-700">
                          Yes{row.replyCount > 1 ? ` · ${row.replyCount}` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-900 px-1.5 py-0.5 text-[7px] font-medium text-white">
                        <MessageSquare className="h-2 w-2" aria-hidden />
                        Open
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Campaign detail + retarget UI (matches product screenshot) */
export function MarketingCampaignRetargetMock() {
  return (
    <div
      className="marketing-dashboard-mock pointer-events-none flex min-h-[280px] w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_32px_rgba(17,17,17,0.1)] sm:min-h-[320px]"
      aria-hidden
    >
      <MarketingCompactSidebar activeLabel="Campaigns" />
      <CampaignDetailMain />
    </div>
  );
}
