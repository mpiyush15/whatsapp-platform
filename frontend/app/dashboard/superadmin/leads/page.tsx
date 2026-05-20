'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Download } from 'lucide-react';
import { ErrorToast } from '@/components/ErrorToast';
import { LeadStatus } from '@/lib/enums';
import { downloadExportCsv, fetchPlatformLeads, patchPlatformLead } from '@/lib/superadminApi';

interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  intent: string;
  score: number;
  messageCount?: number;
  status: LeadStatus;
  accountId?: string;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  stale: number;
  averageScore: number;
}

export default function SuperadminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await fetchPlatformLeads({
        status: filter === 'all' ? undefined : filter,
        search: searchTerm || undefined,
        limit: 200,
      });
      setLeads(result.leads as Lead[]);
      setStats(result.stats as unknown as Stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await patchPlatformLead(leadId, newStatus);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    }
  };

  const handleExport = async () => {
    try {
      await downloadExportCsv('leads', `platform-leads-${Date.now()}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="min-h-full bg-slate-50/80 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/superadmin"
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Platform leads</h1>
            <p className="mt-1 text-sm text-slate-600">
              Conversation leads captured across all organizations
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error ? <ErrorToast message={error} onDismiss={() => setError('')} /> : null}

        {stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {(['total', 'new', 'contacted', 'qualified', 'converted', 'lost', 'stale'] as const).map(
              (key) => (
                <div key={key} className="rounded-xl border bg-white p-3 text-center shadow-sm">
                  <p className="text-xs uppercase text-slate-500">{key}</p>
                  <p className="text-xl font-bold">{stats[key]}</p>
                </div>
              )
            )}
            <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
              <p className="text-xs uppercase text-slate-500">avg score</p>
              <p className="text-xl font-bold">{stats.averageScore}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search name, email, phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {Object.values(LeadStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Loading leads…</p>
          ) : leads.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No leads in this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Intent</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead._id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{lead.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {lead.email || lead.phone || '—'}
                      </td>
                      <td className="px-4 py-3 capitalize">{lead.intent?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">{lead.score}</td>
                      <td className="px-4 py-3 font-mono text-xs">{lead.accountId}</td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        >
                          {Object.values(LeadStatus).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
