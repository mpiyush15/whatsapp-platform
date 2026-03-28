'use client';

import { useState, useEffect } from 'react';
import { ErrorToast } from '@/components/ErrorToast';
import { LeadStatus } from '@/lib/enums';
import Link from 'next/link';

interface Lead {
  _id: string;
  name: string;
  email: string;
  intent: string;
  score: number;
  messageCount: number;
  status: LeadStatus;
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLeads();
  }, [filter, searchTerm]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError('');

      let url = '/api/leads?';
      if (filter !== 'all') {
        url += `status=${filter}&`;
      }
      if (searchTerm) {
        url += `search=${encodeURIComponent(searchTerm)}&`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch leads');
      }

      setLeads(data.leads);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }

      // Update local state
      const oldLead = leads.find(l => l._id === leadId);
      setLeads(leads.map(l => l._id === leadId ? { ...l, status: newStatus as Lead['status'] } : l));
      
      if (stats && oldLead) {
        setStats({
          ...stats,
          [newStatus]: (stats[newStatus as keyof Stats] as number || 0) + 1,
          [oldLead.status]: Math.max(0, ((stats[oldLead.status as keyof Stats] as number) || 0) - 1)
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    }
  };

  const handleExport = async () => {
    try {
      let url = '/api/leads/bulk/export?';
      if (filter !== 'all') {
        url += `status=${filter}&`;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'leads.csv';
      link.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export leads');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="h-12 w-12 border-4 border-slate-300 border-t-blue-600 rounded-full"></div>
          </div>
          <p className="mt-4 text-slate-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📊 Leads</h1>
          <p className="text-slate-600">Manage and track leads from chatbot conversations</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Total Leads</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">New</p>
              <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Converted</p>
              <p className="text-3xl font-bold text-green-600">{stats.converted}</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Avg Score</p>
              <p className="text-3xl font-bold text-purple-600">{stats.averageScore}</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value={LeadStatus.NEW}>New</option>
              <option value={LeadStatus.CONTACTED}>Contacted</option>
              <option value={LeadStatus.QUALIFIED}>Qualified</option>
              <option value={LeadStatus.CONVERTED}>Converted</option>
              <option value={LeadStatus.LOST}>Lost</option>
              <option value={LeadStatus.STALE}>Stale</option>
            </select>

            <button
              onClick={handleExport}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              <p>No leads found. Chatbot replies will automatically create leads here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Intent</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Score</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Messages</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{lead.name}</p>
                          <p className="text-sm text-slate-600">{lead.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                          {lead.intent}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                lead.score >= 75
                                  ? 'bg-green-600'
                                  : lead.score >= 50
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{lead.score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{lead.messageCount}</td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                            lead.status === LeadStatus.NEW
                              ? 'bg-blue-100 text-blue-700'
                              : lead.status === LeadStatus.CONVERTED
                              ? 'bg-green-100 text-green-700'
                              : lead.status === LeadStatus.LOST
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <option value={LeadStatus.NEW}>New</option>
                          <option value={LeadStatus.CONTACTED}>Contacted</option>
                          <option value={LeadStatus.QUALIFIED}>Qualified</option>
                          <option value={LeadStatus.CONVERTED}>Converted</option>
                          <option value={LeadStatus.LOST}>Lost</option>
                          <option value={LeadStatus.STALE}>Stale</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/leads/${lead._id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View →
                        </Link>
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
