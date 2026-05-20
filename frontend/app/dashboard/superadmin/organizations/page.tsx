'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import DataTable from '@/components/DataTable';
import OrganizationDetailsDrawer from '@/components/OrganizationDetailsDrawer';
import { VerticalBadgesFromCounts } from '@/components/platform/VerticalBadges';
import { formatCount } from '@/components/platform/PlatformAnalyticsCharts';
import {
  fetchAdminOrganizations,
  type AdminOrganizationRow,
} from '@/lib/superadminApi';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<AdminOrganizationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganizationRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminOrganizations({ limit: 500 });
      setOrganizations(data.organizations);
      setTotal(data.pagination?.total ?? data.organizations.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const internalCount = organizations.filter(
    (o) => o.isInternal || o.type === 'internal'
  ).length;

  const columns = [
    {
      key: 'accountId',
      label: 'Account ID',
      minWidth: '10rem',
      className: 'font-mono',
      render: (value: string) => (
        <span className="font-mono text-sm font-semibold text-slate-900">{value}</span>
      ),
    },
    {
      key: 'name',
      label: 'Organization',
      minWidth: '14rem',
      className: 'whitespace-normal',
      render: (value: string, row: AdminOrganizationRow) => (
        <div className="space-y-1.5 min-w-[12rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{value}</span>
            {(row.isInternal || row.type === 'internal') && (
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 border border-indigo-200">
                Internal
              </span>
            )}
            {row.hasMultipleVerticals ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                mixed verticals
              </span>
            ) : row.hasMultipleProjects ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
                multi-project
              </span>
            ) : null}
          </div>
          {row.company ? (
            <p className="text-xs text-slate-500">{row.company}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      minWidth: '16rem',
      className: 'whitespace-normal break-all',
      render: (value: string) => (
        <span className="text-slate-700">{value || '—'}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      minWidth: '9rem',
      render: (value: string) => <span className="text-slate-700">{value || '—'}</span>,
    },
    {
      key: 'plan',
      label: 'Plan',
      minWidth: '6rem',
      render: (value: string, row: AdminOrganizationRow) => (
        <div>
          <span className="capitalize font-medium text-slate-900">{value || 'free'}</span>
          {row.billingCycle ? (
            <p className="text-xs text-slate-500 capitalize mt-0.5">{row.billingCycle}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Account type',
      minWidth: '7rem',
      render: (value: string, row: AdminOrganizationRow) => (
        <span
          className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${
            value === 'internal' || row.isInternal
              ? 'bg-purple-100 text-purple-800'
              : value === 'client'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {row.isInternal && value !== 'internal' ? `${value} (internal)` : value}
        </span>
      ),
    },
    {
      key: 'projectCount',
      label: 'Projects',
      minWidth: '8rem',
      render: (value: number, row: AdminOrganizationRow) => (
        <div className="text-slate-800">
          <span className="text-base font-semibold">{value ?? 0}</span>
          {(row.connectedProjects ?? 0) > 0 ? (
            <p className="text-xs text-green-700 mt-0.5">
              {row.connectedProjects} WhatsApp connected
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">none connected</p>
          )}
        </div>
      ),
    },
    {
      key: 'projectsByVertical',
      label: 'Verticals',
      minWidth: '12rem',
      className: 'whitespace-normal',
      render: (_: unknown, row: AdminOrganizationRow) => (
        <VerticalBadgesFromCounts projectsByVertical={row.projectsByVertical} />
      ),
    },
    {
      key: 'phoneCount',
      label: 'Phone lines',
      minWidth: '6rem',
      render: (value: number) => (
        <span className="text-base font-semibold text-slate-800">{value ?? 0}</span>
      ),
    },
    {
      key: 'messages7d',
      label: 'Messages (7d)',
      minWidth: '7rem',
      render: (value: number) => (
        <span className="text-base font-semibold text-slate-800">{formatCount(value ?? 0)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: '6rem',
      render: (value: string) => (
        <span
          className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
            value === 'active'
              ? 'bg-green-100 text-green-800'
              : value === 'pending'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      minWidth: '8rem',
      render: (value: string) => (
        <span className="text-slate-700 whitespace-nowrap">
          {new Date(value).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-slate-50/80 p-6 lg:p-8">
      <div className="w-full">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Organizations</h1>
            <p className="mt-2 text-sm text-slate-600 max-w-3xl">
              All organizations including internal accounts. Scroll horizontally for full columns.
              Click a row for details.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Internal</p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{internalCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Active</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {organizations.filter((o) => o.status === 'active').length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Multi-vertical</p>
            <p className="mt-2 text-3xl font-bold text-sky-600">
              {organizations.filter((o) => o.hasMultipleVerticals).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Multi-project</p>
            <p className="mt-2 text-3xl font-bold text-violet-600">
              {organizations.filter((o) => o.hasMultipleProjects).length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-6 shadow-sm">
          <p className="mb-3 text-xs text-slate-500">
            Table scrolls horizontally — columns expand to fit content.
          </p>
          <DataTable
            columns={columns}
            data={organizations}
            loading={loading}
            error={error}
            emptyMessage="No organizations found"
            wide
            onRowClick={(row) => {
              setSelectedOrg(row);
              setDrawerOpen(true);
            }}
            rowClassName="hover:bg-green-50/60"
          />
        </div>

        <OrganizationDetailsDrawer
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedOrg(null);
            load();
          }}
          organization={selectedOrg}
        />
      </div>
    </div>
  );
}
