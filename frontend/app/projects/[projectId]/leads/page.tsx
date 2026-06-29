'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ErrorToast } from '@/components/ErrorToast';
import { LeadStatus } from '@/lib/enums';
import { API_URL } from '@/lib/config/api';
import { authService } from '@/lib/auth';

const getHeaders = () => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

interface Lead {
  _id: string;
  chatbotId?: string;
  name: string;
  email?: string;
  phone?: string;
  intent: string;
  score: number;
  messageCount: number;
  status: LeadStatus;
  source?: 'crm' | 'chatbot' | string;
  sourceMessage?: string;
  chatbotName?: string;
  responses?: Record<string, string>;
  tags?: string[];
  createdAt?: string;
}

interface ChatbotFlow {
  _id: string;
  name: string;
  replyType?: string;
}

const sourceLabel = (source?: string, lead?: Lead) => {
  const msg = lead?.sourceMessage || '';
  if (msg.toLowerCase().includes('campaign')) {
    const match = msg.match(/-\s*(.*)$/);
    if (match && match[1]) {
      return `Campaign: ${match[1].trim()}`;
    }
    return 'Campaign';
  }
  return 'Manual';
};

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
  const params = useParams()
  const projectId = params.projectId as string

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [flowFilter, setFlowFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeads(controller.signal);
    return () => controller.abort();
  }, [filter, debouncedSearchTerm, projectId]);

  useEffect(() => {
    fetchFlows();
  }, [projectId]);

  const fetchFlows = async () => {
    try {
      const response = await fetch(`${API_URL}/chatbots?projectId=${projectId}`, { headers: getHeaders() });
      const data = await response.json();
      const list = (data.data?.bots || data.bots || [])
        .filter((bot: ChatbotFlow) => bot.replyType === 'workflow');
      setFlows(list);
    } catch {
      setFlows([]);
    }
  };

  const fetchLeads = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError('');

      let url = `${API_URL}/leads?projectId=${projectId}`;
      if (filter !== 'all') {
        url += `&status=${filter}`;
      }
      if (debouncedSearchTerm) {
        url += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
      }

      const response = await fetch(url, { headers: getHeaders(), signal });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch leads');
      }

      setLeads(data.leads || data.data?.leads || []);
      setStats(data.stats || data.data?.stats || null);
      setInitialLoad(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const visibleLeads = leads.filter((lead) => {
    if (flowFilter !== 'all' && lead.chatbotId !== flowFilter) return false;
    if (tagFilter !== 'all' && !(lead.tags || []).includes(tagFilter)) return false;
    if (sourceFilter !== 'all' && sourceLabel(lead.source, lead) !== sourceFilter) return false;
    return true;
  });

  const availableTags = Array.from(new Set(leads.flatMap((lead) => lead.tags || []))).sort();
  const availableSources = Array.from(new Set(leads.map((lead) => sourceLabel(lead.source, lead)))).sort();

  const visibleStats = visibleLeads.reduce(
    (acc, lead) => {
      acc.total += 1;
      if (lead.status === LeadStatus.NEW) acc.new += 1;
      if (lead.status === LeadStatus.QUALIFIED) acc.qualified += 1;
      if (lead.status === LeadStatus.CONVERTED) acc.converted += 1;
      acc.scoreTotal += Number(lead.score || 0);
      return acc;
    },
    { total: 0, new: 0, qualified: 0, converted: 0, scoreTotal: 0 }
  );
  const averageScore = visibleStats.total > 0 ? Math.round(visibleStats.scoreTotal / visibleStats.total) : 0;

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/leads/${leadId}?projectId=${projectId}`, {
        method: 'PATCH',
        headers: getHeaders(),
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

  const handleTagsChange = async (leadId: string, tags: string[]) => {
    const cleanTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
    const previousLeads = leads;
    setLeads((current) => current.map((lead) => lead._id === leadId ? { ...lead, tags: cleanTags } : lead));

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}?projectId=${projectId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ tags: cleanTags })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
    } catch (err) {
      setLeads(previousLeads);
      setError(err instanceof Error ? err.message : 'Failed to update tags');
    }
  };

  const addTag = (lead: Lead) => {
    const tag = window.prompt('Add tag, for example: NEET, 2026 batch, Andheri');
    if (!tag?.trim()) return;
    handleTagsChange(lead._id, [...(lead.tags || []), tag.trim()]);
  };

  const removeTag = (lead: Lead, tag: string) => {
    handleTagsChange(lead._id, (lead.tags || []).filter((item) => item !== tag));
  };

  const handleExport = async () => {
    try {
      let url = `${API_URL}/leads/bulk/export?projectId=${projectId}`;
      if (filter !== 'all') {
        url += `&status=${filter}`;
      }

      const response = await fetch(url, { headers: getHeaders() });
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

  if (initialLoad) {
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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

      <div className="mx-auto max-w-[1600px]">
        {/* Stats Cards */}
        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Total</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{visibleStats.total}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">New</p>
              <p className="mt-1 text-xl font-semibold text-blue-600">{visibleStats.new}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Qualified</p>
              <p className="mt-1 text-xl font-semibold text-purple-600">{visibleStats.qualified}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Converted</p>
              <p className="mt-1 text-xl font-semibold text-emerald-600">{visibleStats.converted}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Avg Score</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{averageScore}</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="text"
              placeholder="Search leads, phone, chatbot, replies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <select
              value={flowFilter}
              onChange={(e) => setFlowFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 lg:w-64"
            >
              <option value="all">All chatbot flows</option>
              {flows.map((flow) => (
                <option key={flow._id} value={flow._id}>{flow.name}</option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 lg:w-48"
            >
              <option value="all">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 lg:w-44"
            >
              <option value="all">All sources</option>
              {availableSources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 lg:w-44"
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
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {visibleLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              <p>No leads found. Chatbot replies will automatically create leads here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1660px] w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                    <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source</th>
                    <th className="w-[220px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Chatbot Flow</th>
                    <th className="w-[300px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</th>
                    <th className="w-[560px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Saved Replies</th>
                    <th className="w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleLeads.map((lead) => {
                    const responseEntries = Object.entries(lead.responses || {})
                      .filter(([key]) => !key.endsWith('__id'));
                    return (
                      <tr key={lead._id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 align-top">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{lead.name || lead.phone || 'Unknown lead'}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{lead.email || lead.phone || 'No contact detail'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {(() => {
                            const lbl = sourceLabel(lead.source, lead);
                            if (lbl.startsWith('Campaign:')) {
                              const campName = lbl.replace('Campaign:', '').trim();
                              return (
                                <div className="flex flex-col">
                                  <span className="inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                                    Campaign
                                  </span>
                                  <span className="mt-1 text-[10px] font-semibold text-blue-600 truncate max-w-[150px]" title={campName}>
                                    {campName}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                                {lbl}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="truncate text-sm text-slate-700">
                            {lead.chatbotName || lead.intent?.replaceAll('_', ' ') || 'Inquiry'}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex max-w-[280px] gap-1.5 overflow-x-auto whitespace-nowrap pb-1">
                            {(lead.tags || []).map((tag) => (
                              <span key={tag} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(lead, tag)}
                                  className="text-green-500 hover:text-red-600"
                                  aria-label={`Remove ${tag}`}
                                >
                                  x
                                </button>
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => addTag(lead)}
                              className="inline-flex shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              + Tag
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {responseEntries.length > 0 ? (
                            <div className="flex max-w-[540px] gap-2 overflow-x-auto whitespace-nowrap pb-1">
                              {responseEntries.map(([key, value]) => (
                                <span key={key} className="inline-flex max-w-[280px] shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                                  <span className="mr-1 font-medium capitalize text-slate-900">{key.replaceAll('_', ' ')}:</span>
                                  <span className="truncate">{String(value)}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">No saved replies</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                            className={`cursor-pointer rounded-md border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
                        <td className="px-4 py-3 align-top text-xs text-slate-500">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {lead.phone ? (
                            <Link
                              href={`/projects/${projectId}/live-chat-v2?phone=${encodeURIComponent(lead.phone)}`}
                              className="inline-flex rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Message
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">No phone</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
