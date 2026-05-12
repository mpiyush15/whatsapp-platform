"use client"

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react"
import { useParams } from "next/navigation"
import { Send, Search, UserPlus, Upload, FileDown, ChevronDown, X } from "lucide-react"
import { authService } from "@/lib/auth"
import jsPDF from "jspdf"

interface Contact {
  userPhone: string
  userName: string
  messageCount: number
  updatedAt: string
  tags?: string[]
  source?: string
  status?: 'active' | 'inactive' | 'blocked'
  state?: string
  interventBy?: string
  lastActive?: string
  createdAt?: string
  firstMessage?: string
  incoming?: number
  optedIn?: boolean
  mauStatus?: 'yes' | 'no'
  waConversationStatus?: 'active' | 'inactive' | 'resolved'
}

interface StoredContact {
  _id: string
  phone: string
  name: string
  email?: string | null
  tags?: string[]
  source?: string
  createdAt?: string
  updatedAt?: string
}

interface QuotaErrorInfo {
  resource?: string
  limit?: number
  used?: number
  message: string
}

export default function ContactsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [importSummary, setImportSummary] = useState("")
  const [newContact, setNewContact] = useState({ userName: "", userPhone: "", tags: "" })
  const [quotaError, setQuotaError] = useState<QuotaErrorInfo | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  const parseConversationContacts = (conversations: any[]): Contact[] => {
    const contactMap = new Map<string, Contact>()

    conversations.forEach((conv: any) => {
      const phone = conv.userPhone || conv.customerPhone || conv.phone || conv.from || conv.phoneNumber
      const name = conv.userName || conv.customerName || phone
      const messageCount = conv.messageCount || 0
      const updatedAt = conv.updatedAt || conv.lastMessageAt || new Date().toISOString()
      const createdAt = conv.createdAt || updatedAt
      const incomingCount = conv.incomingMessages || 0
      const optedIn = conv.optedIn !== false

      if (phone && !contactMap.has(phone)) {
        contactMap.set(phone, {
          userPhone: phone,
          userName: name,
          messageCount,
          updatedAt,
          createdAt,
          incoming: incomingCount,
          optedIn,
          tags: conv.tags || [],
          source: conv.source || 'WhatsApp',
          status: conv.status || 'active',
          state: conv.state || '-',
          interventBy: conv.interventBy || '-',
          lastActive: conv.lastActive || updatedAt,
          firstMessage: conv.firstMessage,
          mauStatus: conv.mauStatus || 'yes',
          waConversationStatus: conv.waConversationStatus || 'active'
        })
      }
    })

    return Array.from(contactMap.values())
  }

  const mergeStoredContacts = (baseContacts: Contact[], storedContacts: StoredContact[]) => {
    const map = new Map<string, Contact>()
    baseContacts.forEach((c) => map.set(c.userPhone, c))

    storedContacts.forEach((stored) => {
      const phone = stored.phone
      if (!phone) return

      const existing = map.get(phone)
      const updatedAt = stored.updatedAt || existing?.updatedAt || new Date().toISOString()
      const createdAt = stored.createdAt || existing?.createdAt || updatedAt

      if (existing) {
        map.set(phone, {
          ...existing,
          userName: stored.name || existing.userName,
          tags: stored.tags && stored.tags.length ? stored.tags : existing.tags,
          source: stored.source || existing.source || 'Manual',
          updatedAt,
          createdAt,
        })
      } else {
        map.set(phone, {
          userPhone: phone,
          userName: stored.name || phone,
          messageCount: 0,
          updatedAt,
          createdAt,
          incoming: 0,
          optedIn: true,
          tags: stored.tags || [],
          source: stored.source || 'Manual',
          status: 'active',
          state: '-',
          interventBy: '-',
          lastActive: updatedAt,
          firstMessage: '',
          mauStatus: 'yes',
          waConversationStatus: 'active'
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.updatedAt || 0).getTime()
      const bTime = new Date(b.updatedAt || 0).getTime()
      return bTime - aTime
    })
  }

  // Fetch contacts from conversations + saved contacts
  const fetchContacts = async () => {
    try {
      setIsLoading(true)

      const [convRes, storedRes] = await Promise.allSettled([
        fetch(`${API_URL}/conversations?limit=1000`, { headers: getHeaders() }),
        fetch(`${API_URL}/contacts`, { headers: getHeaders() })
      ])

      let convContacts: Contact[] = []
      let savedContacts: StoredContact[] = []

      if (convRes.status === 'fulfilled' && convRes.value.ok) {
        const convData = await convRes.value.json()
        const conversations = convData.data?.conversations || convData.conversations || []
        convContacts = parseConversationContacts(conversations)
      }

      if (storedRes.status === 'fulfilled' && storedRes.value.ok) {
        const savedData = await storedRes.value.json()
        savedContacts = savedData.data?.contacts || savedData.contacts || []
      }

      setContacts(mergeStoredContacts(convContacts, savedContacts))
    } catch (error) {
      console.error("❌ Error:", error)
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [projectId])

  const filteredContacts = contacts.filter((contact) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const tags = (contact.tags || []).join(" ").toLowerCase()
    return (
      (contact.userName || "").toLowerCase().includes(q) ||
      (contact.userPhone || "").toLowerCase().includes(q) ||
      (contact.source || "").toLowerCase().includes(q) ||
      tags.includes(q)
    )
  })

  // Toggle individual contact selection
  const toggleContact = (phone: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(phone)) {
      newSelected.delete(phone)
    } else {
      newSelected.add(phone)
    }
    setSelected(newSelected)
  }

  // Toggle select all
  const toggleSelectAll = () => {
    const visiblePhones = filteredContacts.map((c) => c.userPhone)
    const allVisibleSelected = visiblePhones.length > 0 && visiblePhones.every((phone) => selected.has(phone))

    if (allVisibleSelected) {
      const newSelected = new Set(selected)
      visiblePhones.forEach((phone) => newSelected.delete(phone))
      setSelected(newSelected)
    } else {
      const newSelected = new Set(selected)
      visiblePhones.forEach((phone) => newSelected.add(phone))
      setSelected(newSelected)
    }
  }

  const createContactInDb = async (payload: { name: string; phone: string; tags: string[]; source: string }): Promise<StoredContact | null> => {
    const response = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    if (!response.ok || data?.success === false) {
      if (response.status === 429 || data?.code === 'QUOTA_EXCEEDED') {
        const quotaMessage = data?.error || data?.message || 'Quota exceeded'
        throw Object.assign(new Error(quotaMessage), {
          isQuotaError: true,
          quota: {
            resource: data?.resource,
            limit: data?.limit,
            used: data?.used,
            message: quotaMessage,
          }
        })
      }
      throw new Error(data?.error || data?.message || 'Failed to save contact')
    }

    return data?.data?.contact || data?.contact || null
  }

  const upsertContactsInTable = (storedContacts: StoredContact[]) => {
    if (!storedContacts.length) return
    setContacts((prev) => mergeStoredContacts(prev, storedContacts))
  }

  const handleCreateContact = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const name = newContact.userName.trim()
    const phone = newContact.userPhone.trim().replace(/\s+/g, "")

    if (!name || !phone) {
      alert("Name and phone number are required")
      return
    }

    const tags = newContact.tags.split(",").map((t) => t.trim()).filter(Boolean)
    setQuotaError(null)

    try {
      setIsSavingContact(true)
      const created = await createContactInDb({ name, phone, tags, source: 'Manual' })
      if (created) {
        upsertContactsInTable([created])
      } else {
        const now = new Date().toISOString()
        upsertContactsInTable([
          {
            _id: `local-${phone}-${Date.now()}`,
            phone,
            name,
            tags,
            source: 'Manual',
            createdAt: now,
            updatedAt: now
          }
        ])
      }

      setShowCreateModal(false)
      setNewContact({ userName: "", userPhone: "", tags: "" })
    } catch (error: any) {
      if (error?.isQuotaError) {
        setQuotaError(error.quota)
      }
      alert(error.message || 'Failed to create contact')
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
      setQuotaError(null)
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(Boolean)

      if (lines.length < 2) {
        alert("CSV is empty. Use: name,phone,tags")
        return
      }

      const payloads = lines
        .slice(1)
        .map((line) => {
          const [nameRaw = "", phoneRaw = "", tagsRaw = ""] = line.split(",")
          const name = nameRaw.trim()
          const phone = phoneRaw.trim().replace(/\s+/g, "")
          const tags = tagsRaw.split("|").map((t) => t.trim()).filter(Boolean)
          if (!name || !phone) return null
          return { name, phone, tags, source: 'Import' }
        })
        .filter(Boolean) as Array<{ name: string; phone: string; tags: string[]; source: string }>

      if (!payloads.length) {
        alert("No valid rows found in CSV")
        return
      }

      const results = await Promise.allSettled(payloads.map((payload) => createContactInDb(payload)))
      const successCount = results.filter((r) => r.status === 'fulfilled').length
      const failedCount = results.length - successCount

      const quotaFailure = results.find((r) => r.status === 'rejected' && (r.reason as any)?.isQuotaError) as PromiseRejectedResult | undefined
      if (quotaFailure?.reason?.quota) {
        setQuotaError(quotaFailure.reason.quota)
      }

      const createdContacts: StoredContact[] = results
        .filter((r): r is PromiseFulfilledResult<StoredContact | null> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((v): v is StoredContact => Boolean(v))

      if (createdContacts.length > 0) {
        upsertContactsInTable(createdContacts)
      }

      setImportSummary(`Imported: ${successCount}, Skipped/Failed: ${failedCount}`)
    } catch (error) {
      console.error("❌ Import failed:", error)
      alert("Failed to import contacts")
    } finally {
      setIsImporting(false)
      event.target.value = ""
    }
  }

  const handleExportCSV = () => {
    const headers = ["Name", "Phone", "Tags", "Source", "Status", "Last Active", "Created", "Messages", "Incoming", "Opted In"]
    const rows = filteredContacts.map((c) => [
      c.userName,
      c.userPhone,
      (c.tags || []).join(" | "),
      c.source || "",
      c.status || "",
      formatDate(c.lastActive),
      formatDate(c.createdAt),
      String(c.messageCount || 0),
      String(c.incoming || 0),
      c.optedIn !== false ? "Yes" : "No"
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text("Contacts Export", 14, 16)
    doc.setFontSize(10)
    doc.text(`Total contacts: ${filteredContacts.length}`, 14, 24)

    let y = 32
    filteredContacts.slice(0, 60).forEach((c, i) => {
      const line = `${i + 1}. ${c.userName} | ${c.userPhone} | ${c.status || "active"} | Msg: ${c.messageCount || 0}`
      if (y > 285) {
        doc.addPage()
        y = 16
      }
      doc.text(line, 14, y)
      y += 6
    })

    doc.save(`contacts-${new Date().toISOString().slice(0, 10)}.pdf`)
    setShowExportMenu(false)
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return "-"
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    } catch {
      return "-"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWAConversationStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMAUStatusColor = (status: string) => {
    return status === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getOptedInColor = (optedIn: boolean) => {
    return optedIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const allVisibleSelected = filteredContacts.length > 0 && filteredContacts.every((c) => selected.has(c.userPhone))
  const selectedVisibleCount = filteredContacts.filter((c) => selected.has(c.userPhone)).length

  if (isLoading) {
    return <div className="px-6 py-8 text-sm text-gray-500">Loading contacts...</div>
  }

  return (
    <div className="px-6 py-4 space-y-4">
        {/* Top Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, tags, source..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Create Contact
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors"
              >
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {quotaError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            <p className="text-sm font-semibold">Usage limit reached</p>
            <p className="text-sm mt-1">
              {quotaError.message}
              {typeof quotaError.used === 'number' && typeof quotaError.limit === 'number'
                ? ` (${quotaError.used}/${quotaError.limit})`
                : ''}
            </p>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <a href="/dashboard/features/billing" className="font-semibold underline">Upgrade plan</a>
              <span>or</span>
              <a href="/dashboard/features/billing" className="font-semibold underline">Top up credits</a>
            </div>
          </div>
        )}

        {/* Create Contact Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Create Contact</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <form onSubmit={handleCreateContact} className="space-y-4 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">Manual Contact</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={newContact.userName}
                        onChange={(e) => setNewContact((prev) => ({ ...prev, userName: e.target.value }))}
                        placeholder="Enter contact name"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="text"
                        value={newContact.userPhone}
                        onChange={(e) => setNewContact((prev) => ({ ...prev, userPhone: e.target.value }))}
                        placeholder="e.g. 919999999999"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional)</label>
                      <input
                        type="text"
                        value={newContact.tags}
                        onChange={(e) => setNewContact((prev) => ({ ...prev, tags: e.target.value }))}
                        placeholder="vip, lead"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingContact}
                        className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-50"
                      >
                        {isSavingContact ? 'Saving...' : 'Save Contact'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">Bulk Upload (CSV)</h4>

                    <div className="text-xs text-gray-600 space-y-2">
                      <p className="font-medium">Sample CSV format:</p>
                      <pre className="bg-gray-50 border rounded p-2 overflow-auto">name,phone,tags
  John Doe,919999999999,vip|lead
  Jane Smith,918888888888,new|priority</pre>
                      <p>Use <span className="font-semibold">|</span> between tags.</p>
                    </div>

                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {isImporting ? 'Uploading...' : 'Upload CSV'}
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleImportContacts}
                        disabled={isImporting}
                      />
                    </label>

                    {importSummary && (
                      <p className="text-xs text-gray-600">{importSummary}</p>
                    )}
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        {selectedVisibleCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-900">{selectedVisibleCount} selected</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                Send Message
              </button>
              <button className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
                Add Tag
              </button>
            </div>
          </div>
        )}

        {/* Contacts Table - AISensy Style */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Tags</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Source</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">State</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Intervened By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Last Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Created</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Messages</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Incoming</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Opted In</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">MAU</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">WA Conv Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'No contacts found for your search' : 'No contacts yet'}
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.userPhone} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(contact.userPhone)}
                        onChange={() => toggleContact(contact.userPhone)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{contact.userName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{contact.userPhone}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.map((tag, idx) => (
                            <span key={idx} className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{contact.source || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadgeColor(contact.status || 'active')}`}>
                        {contact.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{contact.state || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{contact.interventBy || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(contact.lastActive)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(contact.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {contact.messageCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {contact.incoming || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getOptedInColor(contact.optedIn !== false)}`}>
                        {contact.optedIn !== false ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getMAUStatusColor(contact.mauStatus || 'yes')}`}>
                        {contact.mauStatus || 'yes'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getWAConversationStatusColor(contact.waConversationStatus || 'active')}`}>
                        {contact.waConversationStatus || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Send message">
                        <Send className="h-4 w-4 text-blue-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  )
}
