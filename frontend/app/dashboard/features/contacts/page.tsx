"use client"

import { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContactType } from "@/lib/enums"
import { authService } from "@/lib/auth"
import { getSocket } from "@/lib/socket"
import { ContactsTable } from "@/components/tables/ContactsTable"

interface Contact {
  _id: string
  name: string
  phone: string
  whatsappNumber: string
  email?: string
  businessName?: string
  city?: string
  type: ContactType
  tags?: string[]
  lastMessageAt?: string
  messageCount: number
  isOptedIn: boolean
  createdAt: string
}

interface Stats {
  total: number
  active: number
  newThisMonth: number
  optedIn: number
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, newThisMonth: 0, optedIn: 0 })
  const [isLoading, setIsLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    }
  }

  // Fetch all contacts
  const fetchContacts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/contacts?limit=100`, {
        headers: getHeaders(),
      })
      
      if (response.ok) {
        const data = await response.json()
        const contactsList = data.contacts || data.data || []
        setContacts(contactsList)
        
        // Calculate stats
        const total = data.pagination?.total || contactsList.length
        const optedIn = contactsList.filter((c: Contact) => c.isOptedIn).length
        const active = contactsList.filter((c: Contact) => c.lastMessageAt).length
        const now = new Date()
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        const newThisMonth = contactsList.filter((c: Contact) => 
          new Date(c.createdAt) > monthAgo
        ).length
        
        setStats({ total, active, newThisMonth, optedIn })
      }
    } catch (error) {
      console.error("Error fetching contacts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-sync contact from incoming message
  const autoSyncContact = async (phoneNumber: string) => {
    if (!phoneNumber) return
    
    // Check if already exists
    const exists = contacts.some(c => 
      c.whatsappNumber === phoneNumber || c.phone === phoneNumber
    )
    
    if (exists) return
    
    try {
      console.log(`✅ Auto-syncing contact: ${phoneNumber}`)
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: `Chat ${phoneNumber}`,
          whatsappNumber: phoneNumber,
          phone: phoneNumber,
          type: ContactType.CUSTOMER,
          tags: ['auto-synced'],
          isOptedIn: true
        })
      })
      
      if (response.ok) {
        fetchContacts()
      }
    } catch (error) {
      console.error("Error syncing contact:", error)
    }
  }

  // Listen for live chat messages
  useEffect(() => {
    fetchContacts()

    const handleNewMessage = (data: any) => {
      console.log('📨 new_message:', data)
      
      // Extract phone from different possible locations
      let phone = data?.senderPhone || 
                  data?.sender ||
                  data?.message?.senderPhone ||
                  data?.message?.sender ||
                  data?.phoneNumber
      
      if (phone) {
        autoSyncContact(phone)
      }
    }

    const handleConversationUpdate = (data: any) => {
      console.log('🔄 conversation_update:', data)
      
      let phone = data?.senderPhone || 
                  data?.phoneNumber ||
                  data?.phone ||
                  data?.sender
      
      if (phone) {
        autoSyncContact(phone)
      }
    }

    const handleMessageReceived = (data: any) => {
      console.log('📥 message_received:', data)
      
      let phone = data?.senderPhone ||
                  data?.sender ||
                  data?.message?.senderPhone ||
                  data?.message?.sender ||
                  data?.phoneNumber
      
      if (phone) {
        autoSyncContact(phone)
      }
    }

    // Subscribe to socket events
    const socket = getSocket()
    if (socket) {
      socket.on('new_message', handleNewMessage)
      socket.on('conversation_update', handleConversationUpdate)
      socket.on('message_received', handleMessageReceived)

      return () => {
        socket.off('new_message', handleNewMessage)
        socket.off('conversation_update', handleConversationUpdate)
        socket.off('message_received', handleMessageReceived)
      }
    }
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Auto-synced from your WhatsApp chats</p>
        </div>
        <Button 
          onClick={fetchContacts}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {isLoading ? "Syncing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-600 uppercase">Total</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <p className="text-xs font-semibold text-green-600 uppercase">Active</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <p className="text-xs font-semibold text-purple-600 uppercase">Opted In</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{stats.optedIn}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <p className="text-xs font-semibold text-orange-600 uppercase">New</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">{stats.newThisMonth}</p>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <ContactsTable 
          contacts={contacts}
          isLoading={isLoading}
          onEdit={() => {}}
          onDelete={() => {}}
          onView={() => {}}
        />
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>💡 How it works:</strong> Any contact you chat with in Live Chat will automatically appear here with the tag "auto-synced"
        </p>
      </div>
    </div>
  )
}
