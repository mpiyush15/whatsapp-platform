"use client"

import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent, useMemo } from "react"
import { useParams } from "next/navigation"
import { Search, UserPlus, Upload, FileDown, RefreshCw, X, MessageSquare, Trash2 } from "lucide-react"
import { authService } from "@/lib/auth"
import Link from 'next/link'
import ContactProfileDrawer from "@/components/crm/ContactProfileDrawer"
import { ErrorToast } from '@/components/ErrorToast'
import { motion, AnimatePresence } from "framer-motion"

interface Contact {
  _id?: string
  userPhone: string
  userName: string
  email?: string
  messageCount: number
  updatedAt: string
  tags?: string[]
  source?: string
  area?: string
  courseInterest?: string
  notes?: string
  leadStatus?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  leadValue?: number
  lastActive?: string
  createdAt?: string
  firstMessage?: string
  incoming?: number
  optedIn?: boolean
  metadata?: {
    responses?: Record<string, unknown>
    unmappedResponses?: Record<string, unknown>
  }
}

interface StoredContact {
  _id: string
  phone: string
  whatsappNumber?: string
  name: string
  email?: string | null
  tags?: string[]
  source?: string
  notes?: string
  leadStatus?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  leadValue?: number
  customAttributes?: {
    area?: string
    courseInterest?: string
  }
  metadata?: {
    responses?: Record<string, unknown>
    unmappedResponses?: Record<string, unknown>
  }
  createdAt?: string
  updatedAt?: string
}

interface LeadStats {
  total: number
  new: number
  contacted: number
  qualified: number
  proposal: number
  won: number
  lost: number
  totalValue: number
  tags?: string[]
}

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

const statusClass: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  proposal: 'bg-purple-100 text-purple-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
}

export default function ContactsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [filterTag, setFilterTag] = useState('all')
  const [sortField, setSortField] = useState<keyof Contact | ''>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [importSummary, setImportSummary] = useState("")
  const [error, setError] = useState('')
  
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newContact, setNewContact] = useState({ userName: '', userPhone: '', email: '', tags: '', leadValue: '', notes: '' });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"
  const pageSize = 50

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  const mergeStoredContacts = useCallback((baseContacts: Contact[], storedContacts: StoredContact[]) => {
    const map = new Map<string, Contact>();
    baseContacts.forEach((c) => {
      map.set(c.userPhone, c);
    });

    storedContacts.forEach((stored) => {
      const phone = stored.phone || stored.whatsappNumber
      if (!phone) return

      const existing = map.get(phone)
      const updatedAt = stored.updatedAt || existing?.updatedAt || new Date().toISOString()
      const createdAt = stored.createdAt || existing?.createdAt || updatedAt

      map.set(phone, {
        _id: stored._id,
        userPhone: phone,
        userName: stored.name || existing?.userName || phone,
        email: stored.email || existing?.email || '',
        messageCount: existing?.messageCount || 0,
        updatedAt,
        createdAt,
        incoming: existing?.incoming || 0,
        optedIn: true,
        tags: stored.tags && stored.tags.length ? stored.tags : (existing?.tags || []),
        source: stored.source || existing?.source || 'Manual',
        area: stored.customAttributes?.area || existing?.area || '',
        courseInterest: stored.customAttributes?.courseInterest || existing?.courseInterest || '',
        notes: stored.notes || existing?.notes || '',
        leadStatus: stored.leadStatus || existing?.leadStatus || 'new',
        leadValue: stored.leadValue || existing?.leadValue || 0,
        metadata: stored.metadata || existing?.metadata || {},
        lastActive: updatedAt,
        firstMessage: existing?.firstMessage || '',
      })
    })

    return Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.updatedAt || 0).getTime()
      const bTime = new Date(b.updatedAt || 0).getTime()
      return bTime - aTime
    })
  }, [])

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsRefreshing(true)
      setError('')

      const query = new URLSearchParams({
        projectId,
        limit: String(pageSize),
        offset: String(offset),
        rawOnly: "1",
      })
      if (debouncedSearchQuery.trim()) query.set("search", debouncedSearchQuery.trim())
      if (filterStatus && filterStatus !== 'all') query.set("status", filterStatus)
      if (filterTag && filterTag !== 'all') query.set("tags", filterTag)

      const storedRes = await fetch(`${API_URL}/contacts?${query}`, { headers: getHeaders(), signal })
      let savedContacts: StoredContact[] = []
      let contactTotal = 0
      let fetchedStats = null

      if (storedRes.ok) {
        const savedData = await storedRes.json()
        savedContacts = savedData.data?.contacts || savedData.contacts || []
        contactTotal = savedData.data?.total || savedData.total || savedContacts.length
        fetchedStats = savedData.data?.stats || savedData.stats || null
      } else {
        throw new Error('Failed to fetch contacts')
      }

      setContacts(mergeStoredContacts([], savedContacts))
      setTotalContacts(Math.max(contactTotal, savedContacts.length))
      if (fetchedStats) setStats(fetchedStats)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : 'Error loading contacts')
      setContacts([])
      setTotalContacts(0)
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [API_URL, debouncedSearchQuery, offset, projectId, filterStatus, filterTag, mergeStoredContacts])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOffset(0)
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    setOffset(0)
  }, [filterStatus, filterTag, filterSource])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach(c => c.source && set.add(c.source));
    return Array.from(set);
  }, [contacts]);

  const availableTags = stats?.tags?.length ? [...stats.tags].sort() : Array.from(new Set(contacts.flatMap((contact) => contact.tags || []))).sort();

  const applyFiltersAndSort = (data: Contact[]) => {
    let filtered = data;
    if (filterStatus !== 'all') filtered = filtered.filter(l => l.leadStatus === filterStatus || (!l.leadStatus && filterStatus === 'new'));
    if (filterSource !== 'all') filtered = filtered.filter(l => l.source === filterSource);
    if (filterTag && filterTag !== 'all') {
      filtered = filtered.filter(l => l.tags?.includes(filterTag));
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const valA = a[sortField] || '';
        const valB = b[sortField] || '';
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return filtered;
  };

  const processedContacts = useMemo(() => applyFiltersAndSort(contacts), [contacts, filterStatus, filterSource, filterTag, sortField, sortOrder]);

  const updateContactInDb = async (id: string, payload: any) => {
    const response = await fetch(`${API_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ ...payload, projectId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || data?.message || 'Failed to update contact');
    return data?.data?.contact || data?.contact || null;
  };

  const createContactInDb = async (payload: any) => {
    const response = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...payload, projectId })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error || data?.message || 'Failed to save contact')
    }
    const contact = data?.data?.contact || data?.contact || null
    if (!contact) throw new Error(data?.message || 'Contact saved but server did not return contact')
    return contact
  }

  const handleStatusChange = async (contactId: string, leadStatus: string) => {
    if (!contactId) return;
    try {
      setContacts(current => current.map(c => c._id === contactId ? { ...c, leadStatus: leadStatus as any } : c));
      await updateContactInDb(contactId, { leadStatus });
      load();
    } catch (err) {
      setError('Failed to update status');
      load();
    }
  };

  const handleCreateContact = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = newContact.userName.trim()
    const phone = newContact.userPhone.trim().replace(/\s+/g, "")
    const email = newContact.email.trim()
    const notes = newContact.notes.trim()
    const leadValue = parseFloat(newContact.leadValue) || 0

    if (!name || !phone) { setError("Name and phone number are required"); return; }
    const tags = newContact.tags.split(",").map((t) => t.trim()).filter(Boolean)

    try {
      setIsSavingContact(true)
      const created = await createContactInDb({
        name, phone, email, tags, source: 'Manual', notes, leadValue, leadStatus: 'new'
      })
      setContacts((prev) => mergeStoredContacts(prev, [created]))
      setShowCreateModal(false)
      setNewContact({ userName: "", userPhone: "", email: "", tags: "", leadValue: "", notes: "" })
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create contact')
    } finally {
      setIsSavingContact(false)
    }
  }

  const handleImportContacts = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      setImportSummary("")
      setError("")
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(Boolean)

      if (lines.length < 2) throw new Error("CSV is empty. Use: name,phone,email,tags,value,notes")

      const payloads = lines.slice(1).map((line) => {
          const [nameRaw = "", phoneRaw = "", emailRaw = "", tagsRaw = "", valueRaw = "", notesRaw = ""] = line.split(",")
          const name = nameRaw.trim()
          const phone = phoneRaw.trim().replace(/\s+/g, "")
          if (!name || !phone) return null
          return { 
            name, phone, email: emailRaw.trim(), 
            tags: tagsRaw.split("|").map((t) => t.trim()).filter(Boolean), 
            leadValue: parseFloat(valueRaw) || 0,
            notes: notesRaw.trim(), 
            source: 'Import' 
          }
        }).filter(Boolean) as Array<any>

      if (!payloads.length) throw new Error("No valid rows found in CSV")

      const results = await Promise.allSettled(payloads.map((payload) => createContactInDb(payload)))
      const successCount = results.filter((r) => r.status === 'fulfilled').length
      const failedCount = results.length - successCount

      const createdContacts = results
        .filter((r): r is PromiseFulfilledResult<StoredContact | null> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((v): v is StoredContact => Boolean(v))

      if (createdContacts.length > 0) {
        setContacts((prev) => mergeStoredContacts(prev, createdContacts))
        load()
      }

      setImportSummary(`Imported: ${successCount}, Skipped/Failed: ${failedCount}`)
    } catch (err: any) {
      setError(err.message || "Failed to import contacts")
    } finally {
      setIsImporting(false)
      event.target.value = ""
    }
  }

  const handleDeleteContact = async (contact: Contact) => {
    if (!contact._id || !window.confirm(`Delete ${contact.userName}?`)) return;
    try {
      const response = await fetch(`${API_URL}/contacts/${contact._id}?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete');
      load();
    } catch (err) {
      setError('Failed to delete contact');
    }
  };

  const openContactProfile = (contact: Contact) => {
    setEditContact(contact);
    setIsDrawerOpen(true);
  };

  const handleContactUpdated = (updatedContact: Contact) => {
    setContacts(prev => prev.map(c => c._id === updatedContact._id ? updatedContact : c));
    load();
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/contacts/export?projectId=${projectId}`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${projectId}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.size === processedContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      const allIds = processedContacts.map(c => c._id).filter(Boolean) as string[];
      setSelectedContactIds(new Set(allIds));
    }
  };

  const toggleSelect = (id: string) => {
    if (!id) return;
    const newSet = new Set(selectedContactIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContactIds(newSet);
  };

  const handleBulkStatusChange = async (status: string) => {
    if (!status || selectedContactIds.size === 0) return;
    try {
      setIsBulkUpdating(true);
      const response = await fetch(`${API_URL}/contacts/bulk?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'update_status',
          contactIds: Array.from(selectedContactIds),
          payload: { status }
        })
      });
      if (!response.ok) throw new Error('Bulk update failed');
      setSelectedContactIds(new Set());
      load();
    } catch (err: any) {
      setError(err.message || 'Bulk update failed');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const hasPreviousPage = offset > 0
  const hasNextPage = offset + pageSize < totalContacts

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CRM Contacts</h1>
            <p className="mt-1 text-sm text-slate-500">Manage, nurture, and track projected revenue from leads</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
            >
              <UserPlus className="h-4 w-4" /> Add Contact
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 transition"
            >
              <Upload className="h-4 w-4" /> Upload CSV
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 transition"
            >
              <FileDown className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => load()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Total</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats?.total || totalContacts}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs uppercase font-semibold text-blue-600 tracking-wider">New</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats?.new || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs uppercase font-semibold text-amber-600 tracking-wider">Contacted</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats?.contacted || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs uppercase font-semibold text-indigo-600 tracking-wider">Qualified</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats?.qualified || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs uppercase font-semibold text-purple-600 tracking-wider">Proposal</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats?.proposal || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs uppercase font-semibold text-emerald-600 tracking-wider">Won</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats?.won || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs uppercase font-semibold text-red-600 tracking-wider">Lost</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats?.lost || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[300px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search name, email, phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setOffset(0); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => { setFilterSource(e.target.value); setOffset(0); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All sources</option>
            {uniqueSources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
          <select
            value={filterTag}
            onChange={(e) => { setFilterTag(e.target.value); setOffset(0); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedContactIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-blue-800">
              {selectedContactIds.size} contacts selected
            </span>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => handleBulkStatusChange(e.target.value)}
                value=""
                disabled={isBulkUpdating}
                className="rounded-lg border-0 px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer bg-white"
              >
                <option value="" disabled>Change Status...</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button 
                onClick={() => setSelectedContactIds(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1"
              >
                Clear
              </button>
            </div>
            {isBulkUpdating && <RefreshCw className="h-4 w-4 animate-spin text-blue-500 ml-2" />}
          </div>
        )}

        {/* Table View */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : processedContacts.length === 0 ? (
            <div className="p-16 text-center">
              <h3 className="text-lg font-medium text-slate-900">No contacts found</h3>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or adding a new contact.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-4 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={processedContacts.length > 0 && selectedContactIds.size === processedContacts.filter(c => c._id).length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => { setSortField('userName'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Name</th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100" onClick={() => { setSortField('userPhone'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Contact Info</th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100" onClick={() => { setSortField('leadValue'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Value</th>
                    <th className="px-4 py-4">Area / Location</th>
                    <th className="px-4 py-4">Tags</th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100" onClick={() => { setSortField('source'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Source</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                  {processedContacts.map(contact => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      key={contact._id || contact.userPhone} 
                      className={`hover:bg-slate-50/50 transition ${isRefreshing ? 'opacity-50 pointer-events-none' : ''} ${selectedContactIds.has(contact._id || '') ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-4 py-4">
                        {contact._id && (
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedContactIds.has(contact._id)}
                            onChange={() => toggleSelect(contact._id!)}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{contact.userName}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">{contact.notes}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-slate-900">{contact.userPhone}</p>
                        {contact.email && <p className="text-xs text-slate-500">{contact.email}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-emerald-600">
                          {contact.leadValue ? `₹${contact.leadValue.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{contact.area || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {contact.tags?.map((tag, i) => (
                            <span key={i} className="inline-block bg-blue-50 border border-blue-100 text-blue-700 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{contact.source || '—'}</td>
                      <td className="px-4 py-4">
                        <select
                          value={contact.leadStatus || 'new'}
                          onChange={(e) => handleStatusChange(contact._id!, e.target.value)}
                          className={`rounded-lg border-0 px-2.5 py-1 text-xs font-semibold focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer appearance-none ${statusClass[contact.leadStatus || 'new']}`}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/projects/${projectId}/live-chat-v2?phone=${encodeURIComponent(contact.userPhone)}`} className="text-slate-400 hover:text-blue-600 transition p-1" title="Message">
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                          <button onClick={() => openContactProfile(contact)} className="text-slate-400 hover:text-indigo-600 transition p-1 bg-slate-50 rounded" title="Edit Profile">
                            <span className="text-xs font-medium px-2">Edit</span>
                          </button>
                          <button onClick={() => handleDeleteContact(contact)} className="text-slate-400 hover:text-red-600 transition p-1" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
            <span className="text-sm text-slate-500 font-medium">
              Showing {processedContacts.length === 0 ? 0 : offset + 1}-{offset + processedContacts.length} {totalContacts ? `of ${totalContacts}` : ""}
            </span>
            <div className="flex gap-2 mt-3 sm:mt-0">
              <button 
                onClick={() => setOffset(Math.max(0, offset - pageSize))} 
                disabled={!hasPreviousPage || isRefreshing} 
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button 
                onClick={() => setOffset(offset + pageSize)} 
                disabled={!hasNextPage || isRefreshing} 
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

      </div>

      <ContactProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        contact={editContact}
        onUpdate={updateContactInDb}
        onContactUpdated={handleContactUpdated}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Add New Contacts</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-slate-200 transition">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleCreateContact} className="space-y-4 border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-2">Manual Entry</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input type="text" value={newContact.userName} onChange={(e) => setNewContact({ ...newContact, userName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <input type="text" value={newContact.userPhone} onChange={(e) => setNewContact({ ...newContact, userPhone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lead Value (₹)</label>
                    <input type="number" step="0.01" value={newContact.leadValue} onChange={(e) => setNewContact({ ...newContact, leadValue: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                  <input type="text" value={newContact.tags} onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex justify-end pt-3">
                  <button type="submit" disabled={isSavingContact} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm">
                    {isSavingContact ? 'Saving...' : 'Save Contact'}
                  </button>
                </div>
              </form>

              <div className="space-y-4 border border-slate-200 rounded-xl p-5 bg-slate-50 shadow-sm flex flex-col justify-center text-center">
                <div className="mx-auto bg-white p-3 rounded-full border border-slate-200 mb-2">
                  <Upload className="h-6 w-6 text-slate-400" />
                </div>
                <h4 className="font-semibold text-slate-900">Bulk Upload (CSV)</h4>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Format your CSV with these headers:</p>
                  <p className="font-mono bg-white border border-slate-200 px-2 py-1 rounded inline-block mt-2">name,phone,email,tags,value,notes</p>
                </div>
                <div className="pt-4">
                  <label className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl cursor-pointer transition shadow-sm w-full sm:w-auto">
                    {isImporting ? 'Uploading...' : 'Browse File'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportContacts} disabled={isImporting} />
                  </label>
                </div>
                {importSummary && <p className="text-sm font-medium text-blue-600 mt-2 bg-blue-50 py-2 rounded-lg border border-blue-100">{importSummary}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
