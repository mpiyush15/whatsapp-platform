'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Download, Users } from 'lucide-react';
import { ErrorToast } from '@/components/ErrorToast';
import { downloadExportCsv, fetchPlatformContacts } from '@/lib/superadminApi';

interface Contact {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
  source: string;
  accountId?: string;
  conversationCount: number;
  lastContactedAt?: string;
  firstContactAt?: string;
}

interface Stats {
  total: number;
  customer: number;
  lead: number;
  other: number;
}

export default function SuperadminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await fetchPlatformContacts({
        type: filter === 'all' ? undefined : filter,
        search: searchTerm || undefined,
        limit: 100000,
      });
      setContacts(result.contacts as Contact[]);
      setStats(result.stats as unknown as Stats);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleExport = async () => {
    try {
      await downloadExportCsv('contacts', `platform-contacts-${Date.now()}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="min-h-full bg-slate-50/80 p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/superadmin"
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">Platform Contacts</h1>
            <p className="mt-1 text-sm text-slate-600">
              Directory of all end-user contacts across the entire platform
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error ? <ErrorToast message={error} onDismiss={() => setError('')} /> : null}

        {stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm shadow-[inset_4px_0_0_0_#3b82f6]">
              <div className="flex items-center gap-2 text-xs uppercase text-slate-500 mb-1">
                <Users className="w-4 h-4 text-blue-500" /> Total Contacts
              </div>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            {(['customer', 'lead', 'other'] as const).map(
              (key) => (
                <div key={key} className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase text-slate-500 mb-1">{key}s</p>
                  <p className="text-2xl font-bold">{stats[key] || 0}</p>
                </div>
              )
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search name, email, phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-[300px] flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="customer">Customers</option>
            <option value="lead">Leads</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && contacts.length === 0 ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No contacts found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Account ID</th>
                    <th className="px-4 py-3">Conversations</th>
                    <th className="px-4 py-3">Last Contacted</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                            {contact.name.charAt(0)}
                          </div>
                          {contact.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {contact.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {contact.email || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          contact.type === 'customer' ? 'bg-emerald-100 text-emerald-700' :
                          contact.type === 'lead' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {contact.type || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{contact.accountId || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{contact.conversationCount || 0}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleDateString() : 'Never'}
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
