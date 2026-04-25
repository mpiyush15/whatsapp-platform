"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { RefreshCw, Send } from "lucide-react"
import { authService } from "@/lib/auth"

interface Contact {
  userPhone: string
  userName: string
  messageCount: number
  updatedAt: string
}

export default function ContactsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  // Fetch contacts from conversations
  const fetchContacts = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`${API_URL}/conversations?limit=1000`, {
        headers: getHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("❌ Failed to fetch conversations:", response.status)
        setContacts([])
        return
      }

      // Use correct path - data.conversations or conversations
      const conversations = data.data?.conversations || data.conversations || []

      if (conversations.length === 0) {
        setContacts([])
        return
      }

      // Extract unique contacts from conversations
      const contactMap = new Map<string, Contact>()

      conversations.forEach((conv: any) => {
        const phone = conv.userPhone || conv.customerPhone || conv.phone || conv.from || conv.phoneNumber
        const name = conv.userName || conv.customerName || phone
        const messageCount = conv.messageCount || 0
        const updatedAt = conv.updatedAt || conv.lastMessageAt

        if (phone && !contactMap.has(phone)) {
          contactMap.set(phone, {
            userPhone: phone,
            userName: name,
            messageCount,
            updatedAt
          })
        }
      })

      const contactsList = Array.from(contactMap.values())
        .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
      
      setContacts(contactsList)
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
    if (selected.size === contacts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(contacts.map(c => c.userPhone)))
    }
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

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-gray-600 text-sm mt-1">From your WhatsApp conversations</p>
        </div>
        <button
          onClick={fetchContacts}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Action Bar */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-blue-900">{selected.size} selected</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
              Send Message
            </button>
            <button className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
              Add Contact
            </button>
            <button className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
              Export
            </button>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Messages</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Message</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No contacts yet
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.userPhone} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(contact.userPhone)}
                      onChange={() => toggleContact(contact.userPhone)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{contact.userName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.userPhone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {contact.messageCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(contact.updatedAt)}
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

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-xs font-semibold text-blue-600">TOTAL CONTACTS</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{contacts.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-xs font-semibold text-green-600">TOTAL MESSAGES</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {contacts.reduce((sum, c) => sum + (c.messageCount || 0), 0)}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <p className="text-xs font-semibold text-purple-600">SELECTED</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{selected.size}</p>
        </div>
      </div>
    </div>
  )
}
