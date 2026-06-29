'use client';

// Updated imports to include useMemo
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Download, Upload, LayoutGrid, List } from 'lucide-react';
import { ErrorToast } from '@/components/ErrorToast';
import { LeadStatus } from '@/lib/enums';
import { downloadExportCsv, fetchPlatformLeads, patchPlatformLead, importPlatformLeads } from '@/lib/superadminApi';
import LeadProfileDrawer from '@/components/crm/LeadProfileDrawer';

interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  intent: string;
  score: number;
  messageCount?: number;
  status: string;
  accountId?: string;
  notes?: string;
  conversionValue?: number;
  nextFollowUp?: string;
  tags?: string[];
  source?: string;
  vertical?: string;
  location?: string;
  demoScheduled?: string;
  demoCompleted?: string;
  demoMissed?: boolean;
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
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  
  // Drawer state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [batchTag, setBatchTag] = useState('');

  // Pagination, sorting, and filtering state
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [sortField, setSortField] = useState<keyof Lead | ''>('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Compute unique locations and sources for filter dropdowns
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => l.location && set.add(l.location));
    return Array.from(set);
  }, [leads]);

  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => l.source && set.add(l.source));
    return Array.from(set);
  }, [leads]);

  const applyFilters = (data: Lead[]) => {
    let filtered = data;
    if (filter !== 'all') filtered = filtered.filter(l => l.status === filter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(term) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.phone && l.phone.toLowerCase().includes(term))
      );
    }
    if (filterLocation !== 'all') {
      filtered = filtered.filter(l => l.location === filterLocation);
    }
    if (filterSource !== 'all') {
      filtered = filtered.filter(l => l.source === filterSource);
    }
    if (filterTag) {
      filtered = filtered.filter(l => l.tags?.some(t => t.toLowerCase().includes(filterTag.toLowerCase())));
    }
    return filtered;
  };

  const sortedLeads = useMemo(() => {
    const data = applyFilters(leads);
    if (!sortField) return data;
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leads, filter, searchTerm, sortField, sortOrder, filterLocation, filterSource, filterTag]);

  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, page]);

  const totalPages = Math.ceil(sortedLeads.length / pageSize);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  // Filtered leads for analytics (without pagination)
  const filteredLeads = useMemo(() => applyFilters(leads), [leads, filter, searchTerm, filterLocation, filterSource, filterTag]);

  // Derived analytics based on filtered leads
  const derivedStats = useMemo(() => {
    const total = filteredLeads.length;
    const statusCounts = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
      stale: 0,
    } as Record<string, number>;
    let scoreSum = 0;
    filteredLeads.forEach(l => {
      const s = l.status as keyof typeof statusCounts;
      if (statusCounts[s] !== undefined) statusCounts[s]++;
      scoreSum += l.score || 0;
    });
    const averageScore = total ? Math.round(scoreSum / total) : 0;
    return { total, ...statusCounts, averageScore } as const;
  }, [filteredLeads]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await fetchPlatformLeads({
        status: filter === 'all' ? undefined : filter,
        search: searchTerm || undefined,
        limit: 100000,
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
      // Optimistic update
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
      await patchPlatformLead(leadId, { status: newStatus });
      await load(); // Reload to get exact stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead status');
      await load(); // Revert on error
    }
  };

  const handleExport = async () => {
    try {
      await downloadExportCsv('leads', `platform-leads-${Date.now()}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const openLeadProfile = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };
  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
    // Refresh the leads list to ensure all fields, including location, are up‑to‑date
    load();
  };;

  // Basic CSV Parser
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
      
      // Expected lower‑cased header keys (order not important)
      const expectedHeaders = [
        'name', 'email', 'phone', 'tags', 'vertical', 'location', 'source',
        'demoscheduled', 'democompleted', 'demomissed',
        'notes', 'intent', 'conversionvalue', 'nextfollowup'
      ];

      const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
      const missing = expectedHeaders.filter(h => !rawHeaders.includes(h));
      if (missing.length) {
        throw new Error(`CSV is missing required columns: ${missing.join(', ')}`);
      }

      const parsedLeads = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const lead: any = {};
        rawHeaders.forEach((header, i) => {
          if (values[i]) lead[header] = values[i];
        });

        return {
          name: lead.name || 'Unknown',
          email: lead.email || '',
          phone: lead.phone || '',
          company: lead.company || '',
          intent: lead.intent || 'inquiry',
          conversionValue: Number(
            lead.conversionvalue ||
              lead.conversionValue ||
              lead.deal_size ||
              0
          ),
          notes: lead.notes || '',
          tags: lead.tags ? lead.tags.split(/[;,]/).map((t: string) => t.trim()).filter(Boolean) : [],
          location: lead.location || '',
          vertical: lead.vertical || '',
          source: lead.source || '',
          demoScheduled: lead.demoscheduled || lead.demoScheduled || '',
          demoCompleted: lead.democompleted || lead.demoCompleted || '',
          demoMissed: lead.demomissed === 'true' || lead.demoMissed || false,
          nextFollowUp: lead.nextfollowup || ''
        };
      });

      if (batchTag.trim()) {
        parsedLeads.forEach(lead => {
          if (!lead.tags.includes(batchTag.trim())) {
            lead.tags.push(batchTag.trim());
          }
        });
      }

      // Prevent duplicates: update existing leads (matched by email or phone) and collect new leads
      const existingLeads = leads; // current state list
      const leadsToCreate: any[] = [];
      let updatedCount = 0;
      for (const newLead of parsedLeads) {
        const match = existingLeads.find(l => (newLead.email && l.email === newLead.email) || (newLead.phone && l.phone === newLead.phone));
        if (match) {
          // Update existing lead
          await patchPlatformLead(match._id, newLead);
          updatedCount++;
        } else {
          leadsToCreate.push(newLead);
        }
      }

      const createdRes = await importPlatformLeads(leadsToCreate);
      const createdCount = createdRes?.imported ?? 0;
      const skippedCount = createdRes?.skipped ?? 0;
      alert(`Upload complete: ${createdCount} new leads added, ${updatedCount} leads updated, ${skippedCount} leads skipped.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // HTML5 Drag and Drop for Kanban
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      const lead = leads.find(l => l._id === leadId);
      if (lead && lead.status !== status) {
        handleStatusChange(leadId, status);
      }
    }
  };

  // Kanban Board Component
  const KanbanBoard = () => {
    const columns = Object.values(LeadStatus);
    
    return (
      <div className="flex overflow-x-auto gap-4 pb-4 min-h-[600px]">
        {columns.map(status => {
          const columnLeads = leads.filter(l => l.status === status);
          
          return (
            <div 
              key={status} 
              className="flex-shrink-0 w-80 flex flex-col bg-slate-100 rounded-xl p-3"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-semibold text-slate-800 capitalize">{status}</h3>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                  {columnLeads.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 overflow-y-auto flex-1">
                {columnLeads.map(lead => (
                  <div
                    key={lead._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead._id)}
                    onClick={() => openLeadProfile(lead)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-300 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm text-slate-900 truncate">{lead.name}</h4>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {lead.score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2 truncate">{lead.email || lead.phone || 'No contact info'}</p>
                    
                    {lead.conversionValue ? (
                      <p className="text-xs font-semibold text-emerald-600 mt-2">
                        ₹{lead.conversionValue.toLocaleString('en-IN')}
                      </p>
                    ) : null}

                    {lead.notes && (
                      <div className="mt-2 bg-yellow-50 text-yellow-800 text-[10px] p-2 rounded border border-yellow-200 line-clamp-2 italic">
                        {lead.notes}
                      </div>
                    )}
                    
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <span className="capitalize text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {lead.intent?.replace(/_/g, ' ') || 'Inquiry'}
                      </span>
                      {lead.nextFollowUp && new Date(lead.nextFollowUp).getTime() > Date.now() && (
                        <span className="text-orange-500 font-medium">
                          Follow-up: {new Date(lead.nextFollowUp).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {columnLeads.length === 0 && (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 py-8">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
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
            <h1 className="text-3xl font-bold text-slate-900">Platform leads CRM</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage, nurture, and track projected revenue from platform leads
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Optional Batch Tag (e.g. june-1)"
              value={batchTag}
              onChange={(e) => setBatchTag(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm max-w-[200px]"
            />
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload CSV
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50 ml-2"
            >
              Upload One Lead
            </button>
            <a
              href="/sample-leads.csv"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 text-slate-600"
            >
              Template
            </a>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 ${viewMode === 'table' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-2 ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
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

        {derivedStats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {(['total', 'new', 'contacted', 'qualified', 'converted', 'lost', 'stale'] as const).map(
              (key) => (
                <div key={key} className="rounded-xl border bg-white p-3 text-center shadow-sm">
                  <p className="text-xs uppercase text-slate-500">{key}</p>
                  <p className="text-xl font-bold">{derivedStats[key]}</p>
                </div>
              )
            )}
            <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
              <p className="text-xs uppercase text-slate-500">avg score</p>
              <p className="text-xl font-bold">{derivedStats.averageScore}</p>
            </div>
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
              onChange={e => { setFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All statuses</option>
              {Object.values(LeadStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterLocation}
              onChange={e => { setFilterLocation(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm ml-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={e => { setFilterSource(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm ml-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All sources</option>
              {uniqueSources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Filter tags"
              value={filterTag}
              onChange={e => { setFilterTag(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm ml-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {loading && leads.length === 0 ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {leads.length === 0 ? (
                <p className="p-8 text-center text-slate-500">No leads in this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
  <th className="px-6 py-3 cursor-pointer" onClick={() => { setSortField('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setPage(1); }}>Name</th>
  <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('email'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setPage(1); }}>Contact</th>
  <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('intent'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setPage(1); }}>Intent</th>
  <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('conversionValue'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setPage(1); }}>Value</th>
  <th className="px-4 py-3">Account</th>
  <th className="px-4 py-3">Location</th>
  <th className="px-4 py-3">Tags</th>
  <th className="px-4 py-3 cursor-pointer" onClick={() => { setSortField('source'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Source</th>
  <th className="px-4 py-3">Notes</th>
  <th className="px-4 py-3">Demo Scheduled</th>
  <th className="px-4 py-3">Demo Completed</th>
  <th className="px-4 py-3">Demo Missed</th>
  <th className="px-4 py-3">Status</th>
  <th className="px-4 py-3">Action</th>
</tr>
                    </thead>
                    <tbody>
                      {paginatedLeads.map(lead => (
                        <tr key={lead._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-6 py-3 font-medium">{lead.name}</td>
                          <td className="px-4 py-3 text-slate-600">{lead.email || lead.phone || '—'}</td>
                          <td className="px-4 py-3 capitalize">{lead.intent?.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 font-medium text-emerald-600">{lead.conversionValue ? `₹${lead.conversionValue.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{lead.accountId || '—'}</td>
                        <td className="px-4 py-3">{lead.location || '—'}</td>
                        <td className="px-4 py-3">
                          {lead.tags?.map((tag, i) => (
                            <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 mr-1 rounded-full">{tag}</span>
                          ))}
                        </td>
                        <td className="px-4 py-3">{lead.source || '—'}</td>
                        <td className="px-4 py-3">
                          {lead.notes ? (
                            <div className="max-w-[150px] truncate text-xs text-slate-500 hover:whitespace-normal hover:absolute hover:bg-white hover:border hover:shadow-lg hover:p-2 hover:z-10 hover:w-64 rounded bg-slate-50 p-1 border border-slate-100 cursor-help transition-all">
                              {lead.notes}
                            </div>
                          ) : '—'}
                        </td>
                          <td className="px-4 py-3">{lead.demoScheduled ? new Date(lead.demoScheduled).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-4 py-3">{lead.demoCompleted ? new Date(lead.demoCompleted).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-4 py-3 text-center">{lead.demoMissed ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3">
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                            >
                              {Object.values(LeadStatus).map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openLeadProfile(lead)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-2 py-1 rounded"
                            >Edit Profile</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-center mt-4 space-x-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >Prev</button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >Next</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <LeadProfileDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            lead={selectedLead}
            onUpdate={load}
            onLeadUpdated={handleLeadUpdated}
          />
        </div>
    </div>
  );
}
