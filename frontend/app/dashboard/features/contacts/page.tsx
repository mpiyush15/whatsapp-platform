"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Plus, RefreshCw, Send, Upload, X } from "lucide-react"
import { authService } from "@/lib/auth"

interface Contact {
  userPhone: string
  userName: string
  email?: string
  type?: "customer" | "lead" | "other"
  source?: string
  messageCount: number
  updatedAt: string
}

type ContactForm = {
  name: string
  phone: string
  email: string
  type: "customer" | "lead" | "other"
  company: string
  intent: string
  tags: string
}

type CsvRow = Record<string, string>

const emptyForm: ContactForm = {
  name: "",
  phone: "",
  email: "",
  type: "customer",
  company: "",
  intent: "inquiry",
  tags: "",
}

const csvHeaders = ["name", "phone", "email", "type", "company", "intent", "tags", "notes"]

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "")
}

function canonicalHeader(header: string) {
  const normalized = normalizeHeader(header)
  const aliases: Record<string, string> = {
    fullname: "name",
    customername: "name",
    mobilenumber: "phone",
    mobile: "phone",
    number: "phone",
    whatsapp: "whatsappNumber",
    whatsappnumber: "whatsappNumber",
    lead: "isLead",
    islead: "isLead",
    business: "company",
    businessname: "company",
    leadstatus: "status",
  }

  return aliases[normalized] || normalized
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = []
  let cell = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim())
      cell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)

  const [headerRow, ...dataRows] = rows
  if (!headerRow) return []

  const headers = headerRow.map(canonicalHeader)
  return dataRows
    .map((values) =>
      headers.reduce<CsvRow>((acc, header, index) => {
        acc[header] = values[index] || ""
        return acc
      }, {})
    )
    .filter((entry) => entry.phone || entry.whatsappNumber || entry.name)
}

function csvEscape(value: string | number | undefined) {
  const raw = String(value ?? "")
  return `"${raw.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: Array<Array<string | number | undefined>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  const upsertDisplayContact = (map: Map<string, Contact>, contact: Contact) => {
    const existing = map.get(contact.userPhone)
    map.set(contact.userPhone, {
      ...existing,
      ...contact,
      messageCount: Math.max(existing?.messageCount || 0, contact.messageCount || 0),
      updatedAt: contact.updatedAt || existing?.updatedAt || "",
    })
  }

  const fetchContacts = async () => {
    try {
      setIsLoading(true)
      setError("")

      const contactsResponse = await fetch(`${API_URL}/contacts?limit=1000&rawOnly=1`, { headers: getHeaders() })

      const contactMap = new Map<string, Contact>()

      if (contactsResponse.ok) {
        const contactData = await contactsResponse.json()
        const savedContacts = contactData.data?.contacts || contactData.contacts || []

        savedContacts.forEach((contact: any) => {
          const phone = contact.whatsappNumber || contact.phone
          if (!phone) return

          upsertDisplayContact(contactMap, {
            userPhone: phone,
            userName: contact.name || phone,
            email: contact.email,
            type: contact.type,
            source: contact.source,
            messageCount: contact.messageCount || 0,
            updatedAt: contact.updatedAt || contact.createdAt,
          })
        })
      }

      const contactsList = Array.from(contactMap.values()).sort((a, b) => {
        if ((b.messageCount || 0) !== (a.messageCount || 0)) {
          return (b.messageCount || 0) - (a.messageCount || 0)
        }
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      })

      setContacts(contactsList)
      setSelected(new Set())
    } catch (err) {
      console.error("Error loading contacts:", err)
      setError("Failed to load contacts")
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const toggleContact = (phone: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(phone)) {
      newSelected.delete(phone)
    } else {
      newSelected.add(phone)
    }
    setSelected(newSelected)
  }

  const toggleSelectAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(contacts.map((contact) => contact.userPhone)))
    }
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return "-"
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "-"
    }
  }

  const submitContact = async () => {
    try {
      setIsSaving(true)
      setError("")
      setStatusMessage("")

      const response = await fetch(`${API_URL}/contacts`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          whatsappNumber: form.phone,
          email: form.email,
          type: form.type,
          isLead: form.type === "lead",
          company: form.company,
          intent: form.intent,
          tags: form.tags,
          source: "Manual",
        }),
      })

      const data = await response.json()
      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to add contact")
      }

      setStatusMessage(form.type === "lead" ? "Contact added and synced to leads" : "Contact added")
      setForm(emptyForm)
      setShowAddContact(false)
      await fetchContacts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact")
    } finally {
      setIsSaving(false)
    }
  }

  const importCsv = async (file: File) => {
    try {
      setIsImporting(true)
      setError("")
      setStatusMessage("")

      const contactsToImport = parseCsv(await file.text())
      if (contactsToImport.length === 0) {
        throw new Error("No contacts found in CSV")
      }

      const response = await fetch(`${API_URL}/contacts/import`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ contacts: contactsToImport }),
      })

      const data = await response.json()
      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || "CSV import failed")
      }

      const result = data.data || data
      const skipped = result.skipped ? `, ${result.skipped} skipped` : ""
      setStatusMessage(
        `Imported ${result.imported || 0} contacts (${result.created || 0} new, ${result.updated || 0} updated), ${result.leadsSynced || 0} leads synced${skipped}`
      )
      await fetchContacts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV import failed")
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const exportContacts = () => {
    const selectedContacts = selected.size > 0 ? contacts.filter((contact) => selected.has(contact.userPhone)) : contacts
    downloadCsv("contacts.csv", [
      csvHeaders,
      ...selectedContacts.map((contact) => [
        contact.userName,
        contact.userPhone,
        contact.email || "",
        contact.type || "customer",
        "",
        contact.type === "lead" ? "inquiry" : "",
        "",
        "",
      ]),
    ])
  }

  const downloadTemplate = () => {
    downloadCsv("contacts-template.csv", [
      csvHeaders,
      ["Aarav Sharma", "+919876543210", "aarav@example.com", "lead", "Acme", "demo_request", "hot;website", "Interested in demo"],
      ["Priya Mehta", "+919812345678", "priya@example.com", "customer", "Bright Co", "", "vip", ""],
    ])
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="mt-1 text-sm text-gray-600">Raw manual and bulk uploaded campaign contacts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddContact(true)}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Importing..." : "Upload CSV"}
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Template
          </button>
          <button
            onClick={fetchContacts}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Loading..." : "Refresh"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) importCsv(file)
            }}
          />
        </div>
      </div>

      {(statusMessage || error) && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || statusMessage}
        </div>
      )}

      {showAddContact && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add Contact</h2>
            <button
              onClick={() => setShowAddContact(false)}
              className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="Phone or WhatsApp number"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Email"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as ContactForm["type"] })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="customer">Customer</option>
              <option value="lead">Lead</option>
              <option value="other">Other</option>
            </select>
            <input
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              placeholder="Company"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={form.intent}
              onChange={(event) => setForm({ ...form, intent: event.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="inquiry">Inquiry</option>
              <option value="demo_request">Demo request</option>
              <option value="pricing_inquiry">Pricing inquiry</option>
              <option value="purchase_intent">Purchase intent</option>
              <option value="support_request">Support request</option>
              <option value="other">Other</option>
            </select>
            <input
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
              placeholder="Tags separated by semicolon"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm lg:col-span-2"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={submitContact}
              disabled={isSaving || !form.phone.trim()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : form.type === "lead" ? "Add and Sync Lead" : "Save Contact"}
            </button>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-900">{selected.size} selected</p>
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700">
              Send Message
            </button>
            <button
              onClick={exportContacts}
              className="rounded bg-gray-600 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-700"
            >
              Export
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Messages</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Activity</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {isLoading ? "Loading contacts..." : "No contacts yet"}
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.userPhone} className="border-b transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(contact.userPhone)}
                      onChange={() => toggleContact(contact.userPhone)}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {contact.userName}
                    {contact.email && <p className="text-xs font-normal text-gray-500">{contact.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.userPhone}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        contact.type === "lead"
                          ? "bg-amber-100 text-amber-800"
                          : contact.type === "other"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {contact.type || "customer"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {contact.messageCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(contact.updatedAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="rounded p-1 transition-colors hover:bg-gray-200" title="Send message">
                      <Send className="h-4 w-4 text-blue-600" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-600">TOTAL CONTACTS</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{contacts.length}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-600">LEADS</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {contacts.filter((contact) => contact.type === "lead").length}
          </p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-semibold text-green-600">TOTAL MESSAGES</p>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {contacts.reduce((sum, contact) => sum + (contact.messageCount || 0), 0)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600">SELECTED</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{selected.size}</p>
        </div>
      </div>
    </div>
  )
}
