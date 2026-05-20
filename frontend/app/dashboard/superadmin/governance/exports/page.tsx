'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, ArrowLeft } from 'lucide-react';
import { API_URL } from '@/lib/config/api';
import { downloadExportCsv } from '@/lib/superadminApi';

type ExportItem = {
  _id: string;
  dataset: string;
  status: string;
  format: string;
  counts?: Record<string, number>;
  createdBy: string;
  createdAt: string;
};

const SNAPSHOT_DATASETS = ['billing', 'usage', 'offers', 'health', 'audit'];
const CSV_DATASETS = [
  { id: 'billing', label: 'Payments' },
  { id: 'usage', label: 'Messages' },
  { id: 'organizations', label: 'Organizations' },
  { id: 'leads', label: 'Leads' },
  { id: 'offers', label: 'Offers' },
  { id: 'audit', label: 'Audit logs' },
  { id: 'health', label: 'Health metrics' },
];

export default function ExportCenterPage() {
  const [dataset, setDataset] = useState('billing');
  const [items, setItems] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/exports`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && data?.success) setItems(Array.isArray(data.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createExport = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setNote('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/exports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataset }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Failed to create export');
        return;
      }

      setItems((prev) => [data.data, ...prev]);
      setNote('Export snapshot created');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvDownload = async (id: string) => {
    setError('');
    setDownloading(id);
    try {
      await downloadExportCsv(id, `export-${id}-${Date.now()}.csv`);
      setNote(`Downloaded ${id} CSV`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/80 p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/dashboard/superadmin"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Export center</h1>
          <p className="mt-1 text-sm text-slate-600">
            Governance snapshots and live CSV downloads for billing, usage, and audit data
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Download CSV
          </h2>
          <div className="flex flex-wrap gap-2">
            {CSV_DATASETS.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={downloading === d.id}
                onClick={() => handleCsvDownload(d.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium hover:bg-white disabled:opacity-50"
              >
                <Download className={`h-4 w-4 ${downloading === d.id ? 'animate-pulse' : ''}`} />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Create snapshot</h2>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {SNAPSHOT_DATASETS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={createExport}
              disabled={loading}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Working…' : 'Create export snapshot'}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
        ) : null}
        {note ? <p className="text-sm text-slate-600">{note}</p> : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent snapshots</h2>
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">No snapshots yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item._id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium capitalize text-slate-900">{item.dataset}</p>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium capitalize text-green-700">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Format: {item.format} • By: {item.createdBy} •{' '}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.counts ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(item.counts).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
