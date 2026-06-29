'use client';

import { CheckCircle, Eye, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  ADVANCED_MOCK_TEMPLATES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_HEALTH_BADGE,
  TEMPLATE_STATUS_BADGE,
} from '@/components/marketing/marketing-advanced-features-mock-data';
import { MarketingCompactSidebar } from '@/components/marketing/MarketingCompactSidebar';

const STATUS_TABS = [
  { id: 'all', label: 'All', active: true },
  { id: 'draft', label: 'Draft', icon: '📝' },
  { id: 'pending', label: 'Pending', icon: '⏱' },
  { id: 'approved', label: 'Approved', icon: '✓' },
  { id: 'rejected', label: 'Rejected', icon: '✕' },
] as const;


function TemplatesMain() {
  return (
    <div className="min-w-0 flex-1 bg-[#f9fafb]">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-2.5 py-2">
        <h3 className="text-sm font-bold text-gray-900">Templates</h3>
        <div className="flex shrink-0 items-center gap-1">
          <span className="inline-flex items-center gap-0.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-[8px] font-medium text-gray-700">
            <RefreshCw className="h-2.5 w-2.5" aria-hidden />
            Sync
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-green-600 px-2 py-1 text-[8px] font-semibold text-white">
            <Plus className="h-2.5 w-2.5" aria-hidden />
            Create
          </span>
        </div>
      </div>

      <div className="px-2.5 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" aria-hidden />
          <div className="rounded-md border border-gray-300 bg-white py-1 pl-7 pr-2 text-[8px] text-gray-400">
            Search templates (status, name etc.)
          </div>
        </div>

        <div className="mt-2 flex gap-2 overflow-hidden border-b border-gray-200">
          {STATUS_TABS.map((tab) => (
            <span
              key={tab.id}
              className={`shrink-0 border-b-2 pb-1.5 text-[8px] font-medium ${
                tab.id === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {'icon' in tab ? `${tab.icon} ` : ''}
              {tab.label}
            </span>
          ))}
        </div>

        <div className="mt-2 flex min-h-0 gap-2 pb-2">
          <aside className="w-[72px] shrink-0 sm:w-[80px]">
            <div className="rounded-md border border-gray-200 bg-white p-1.5">
              <p className="mb-1 text-[8px] font-semibold text-gray-900">Categories</p>
              <nav className="space-y-0.5">
                {TEMPLATE_CATEGORIES.slice(0, 8).map((cat, i) => (
                  <div
                    key={cat}
                    className={`truncate rounded px-1.5 py-0.5 text-[7px] font-medium leading-tight ${
                      i === 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {cat}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-gray-200 bg-white">
            <div className="max-h-[200px] overflow-hidden sm:max-h-[220px]">
              <table className="w-full text-left text-[7px] sm:text-[8px]">
                <thead className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-1.5 py-1 font-semibold text-gray-700">Name</th>
                    <th className="px-1.5 py-1 font-semibold text-gray-700">Category</th>
                    <th className="px-1.5 py-1 font-semibold text-gray-700">Status</th>
                    <th className="hidden px-1.5 py-1 font-semibold text-gray-700 sm:table-cell">Type</th>
                    <th className="hidden px-1.5 py-1 font-semibold text-gray-700 md:table-cell">Health</th>
                    <th className="hidden px-1.5 py-1 font-semibold text-gray-700 lg:table-cell">Created</th>
                    <th className="px-1.5 py-1 font-semibold text-gray-700" />
                  </tr>
                </thead>
                <tbody>
                  {ADVANCED_MOCK_TEMPLATES.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="max-w-[52px] truncate px-1.5 py-1 font-medium text-gray-900 sm:max-w-[64px]">
                        {row.name}
                      </td>
                      <td className="truncate px-1.5 py-1 text-gray-600">{row.category}</td>
                      <td className="px-1.5 py-1">
                        <span
                          className={`inline-block rounded-full px-1 py-0.5 text-[7px] font-medium capitalize ${TEMPLATE_STATUS_BADGE[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="hidden px-1.5 py-1 text-gray-600 sm:table-cell">{row.type}</td>
                      <td className="hidden px-1.5 py-1 md:table-cell">
                        <span
                          className={`inline-block rounded-full px-1 py-0.5 text-[7px] font-medium capitalize ${TEMPLATE_HEALTH_BADGE[row.health]}`}
                        >
                          {row.health === 'high' ? 'High' : row.health === 'medium' ? 'Medium' : 'Low'}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-1.5 py-1 text-gray-500 lg:table-cell">
                        {row.createdAt}
                      </td>
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <Eye className="h-2.5 w-2.5 text-blue-600" aria-hidden />
                          <CheckCircle className="h-2.5 w-2.5 text-green-600" aria-hidden />
                          <Trash2 className="h-2.5 w-2.5 text-red-500" aria-hidden />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full Templates UI (matches product screenshot) */
export function MarketingTemplatesDashboardMock() {
  return (
    <div
      className="marketing-dashboard-mock pointer-events-none flex min-h-[240px] w-full select-none overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_32px_rgba(17,17,17,0.1)] sm:min-h-[280px]"
      aria-hidden
    >
      <MarketingCompactSidebar activeLabel="Templates" />
      <TemplatesMain />
    </div>
  );
}
