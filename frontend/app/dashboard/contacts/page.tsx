"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Users, Plus, Upload, Download, Search, MoreVertical, Edit, Trash2, X, Tag, Mail, Phone as PhoneIcon, User, Building2, MapPin, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import { authService } from "@/lib/auth"
import { getSocket } from "@/lib/socket"

interface Contact {
  _id: string
  name: string
  phone: string
  whatsappNumber: string
  email?: string
  businessName?: string
  city?: string
  type: 'customer' | 'lead' | 'other'
  tags: string[]
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

interface Message {
  _id: string
  content: string
  sender: string
  receiver: string
  senderName?: string
  timestamp?: string
  createdAt: string
  mediaUrl?: string
  messageType?: string
}

interface ContactDetail extends Contact {
  messages?: Message[]
  score?: number  // For leads, shows their quality score
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, newThisMonth: 0, optedIn: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCity, setFilterCity] = useState("")
  const [filterBusinessName, setFilterBusinessName] = useState("")
  const [filterMobile, setFilterMobile] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [showQuickViewDrawer, setShowQuickViewDrawer] = useState(false)
  const [drawerContact, setDrawerContact] = useState<ContactDetail | null>(null)
  const [drawerMessages, setDrawerMessages] = useState<Message[]>([])
  const [drawerLoading, setDrawerLoading] = useState(false)
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    whatsappNumber: '',
    phone: '',
    email: '',
    businessName: '',
    city: '',
    type: 'customer' as 'customer' | 'lead' | 'other',
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState("")

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    }
  }

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/contacts?limit=100`, {
        headers: getHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
        
        // Calculate stats
        const total = data.pagination?.total || data.contacts.length
        const optedIn = data.contacts.filter((c: Contact) => c.isOptedIn).length
        const active = data.contacts.filter((c: Contact) => c.lastMessageAt).length
        const now = new Date()
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        const newThisMonth = data.contacts.filter((c: Contact) => 
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

  // Create or update contact
  const saveContact = async () => {
    try {
      const payload = {
        ...formData,
        phone: formData.phone || `+${formData.whatsappNumber}`,
      }

      const url = selectedContact 
        ? `${API_URL}/contacts/${selectedContact._id}`
        : `${API_URL}/contacts`
      
      const method = selectedContact ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        fetchContacts()
        closeModal()
      } else {
        const error = await response.json()
        alert(error.message || "Failed to save contact")
      }
    } catch (error) {
      console.error("Error saving contact:", error)
      alert("Failed to save contact")
    }
  }

  // Delete contact
  const deleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return
    
    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        fetchContacts()
      } else {
        alert("Failed to delete contact")
      }
    } catch (error) {
      console.error("Error deleting contact:", error)
      alert("Failed to delete contact")
    }
  }

  // Open chat for a contact
  const openContactChat = (contact: Contact) => {
    // Simply navigate to chat page - contact will be passed via state
    router.push(`/dashboard/chat`)
  }

  // Open quick view drawer
  const openQuickViewDrawer = async (contact: Contact) => {
    setDrawerContact(contact)
    setDrawerLoading(true)
    setShowQuickViewDrawer(true)
    
    try {
      // Try to fetch conversations for this contact
      const response = await fetch(`${API_URL}/conversations?phone=${contact.whatsappNumber}`, {
        headers: getHeaders(),
      })
      
      if (response.ok) {
        const data = await response.json()
        const conversations = data.conversations || []
        
        if (conversations.length > 0) {
          const firstConversation = conversations[0]
          
          // Fetch messages from this conversation
          const messagesResponse = await fetch(
            `${API_URL}/conversations/${firstConversation._id}/messages`,
            { headers: getHeaders() }
          )
          
          if (messagesResponse.ok) {
            const msgData = await messagesResponse.json()
            setDrawerMessages((msgData.messages || []).slice(0, 5).reverse())
          }
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setDrawerLoading(false)
    }
  }

  // Close quick view drawer
  const closeQuickViewDrawer = () => {
    setShowQuickViewDrawer(false)
    setDrawerContact(null)
    setDrawerMessages([])
  }

  // Open modal for add/edit
  const openAddModal = () => {
    setSelectedContact(null)
    setFormData({
      name: '',
      whatsappNumber: '',
      phone: '',
      email: '',
      businessName: '',
      city: '',
      type: 'customer',
      tags: [],
    })
    setShowAddModal(true)
  }

  const openEditModal = (contact: Contact) => {
    setSelectedContact(contact)
    setFormData({
      name: contact.name,
      whatsappNumber: contact.whatsappNumber,
      phone: contact.phone,
      email: contact.email || '',
      businessName: contact.businessName || '',
      city: contact.city || '',
      type: contact.type,
      tags: contact.tags || [],
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setSelectedContact(null)
    setTagInput("")
  }

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
      setTagInput("")
    }
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  // Export contacts
  const exportContacts = () => {
    const csv = [
      ['Name', 'WhatsApp Number', 'Phone', 'Email', 'Type', 'Tags', 'Last Message', 'Message Count', 'Opted In'].join(','),
      ...filteredContacts.map(c => [
        c.name,
        c.whatsappNumber,
        c.phone,
        c.email || '',
        c.type,
        c.tags.join(';'),
        c.lastMessageAt || '',
        c.messageCount,
        c.isOptedIn ? 'Yes' : 'No'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Handle CSV file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }
    
    setImportFile(file)
    
    // Parse CSV preview
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid')
        return
      }
      
      // Parse headers and rows
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj: any = {}
        headers.forEach((header, i) => {
          obj[header] = values[i] || ''
        })
        return obj
      })
      
      setImportPreview(rows)
    }
    reader.readAsText(file)
  }

  // Import contacts from CSV
  const importContacts = async () => {
    if (!importFile) return
    
    setIsImporting(true)
    
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          alert('CSV file is empty or invalid')
          setIsImporting(false)
          return
        }
        
        // Parse CSV
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        const nameIndex = headers.findIndex(h => h.includes('name'))
        const whatsappIndex = headers.findIndex(h => h.includes('whatsapp'))
        const phoneIndex = headers.findIndex(h => h.includes('phone') && !h.includes('whatsapp'))
        const emailIndex = headers.findIndex(h => h.includes('email'))
        const typeIndex = headers.findIndex(h => h.includes('type'))
        const tagsIndex = headers.findIndex(h => h.includes('tag'))
        
        if (nameIndex === -1 || whatsappIndex === -1) {
          alert('CSV must have "Name" and "WhatsApp Number" columns')
          setIsImporting(false)
          return
        }
        
        const contacts = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          return {
            name: values[nameIndex],
            whatsappNumber: values[whatsappIndex].replace(/[^0-9]/g, ''), // Remove non-digits
            phone: phoneIndex !== -1 ? values[phoneIndex] : values[whatsappIndex],
            email: emailIndex !== -1 ? values[emailIndex] : undefined,
            type: typeIndex !== -1 ? values[typeIndex].toLowerCase() : 'customer',
            tags: tagsIndex !== -1 ? values[tagsIndex].split(';').filter(t => t.trim()) : []
          }
        }).filter(c => c.name && c.whatsappNumber)
        
        // Send to backend
        const response = await fetch(`${API_URL}/contacts/import`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ contacts }),
        })
        
        const result = await response.json()
        
        if (response.ok) {
          alert(`Successfully imported ${result.imported} contacts! ${result.failed > 0 ? `${result.failed} failed.` : ''}`)
          fetchContacts()
          closeImportModal()
        } else {
          alert(result.message || 'Import failed')
        }
      }
      
      reader.readAsText(importFile)
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import contacts')
    } finally {
      setIsImporting(false)
    }
  }

  // Close import modal
  const closeImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportPreview([])
  }

  // Download sample CSV template
  const downloadTemplate = () => {
    const csv = [
      ['Name', 'WhatsApp Number', 'Phone', 'Email', 'Type', 'Tags'].join(','),
      ['John Doe', '919876543210', '+91 98765 43210', 'john@example.com', 'customer', 'Premium;VIP'].join(','),
      ['Jane Smith', '919876543211', '+91 98765 43211', 'jane@example.com', 'lead', 'New'].join(','),
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts-template.csv'
    a.click()
  }

  useEffect(() => {
    fetchContacts()

    // Listen for new messages to refresh contacts list
    const handleNewMessage = (data: any) => {
      // Refresh contacts when new message arrives
      fetchContacts()
    }

    const handleConversationUpdate = (data: any) => {
      // Refresh contacts when conversation updates
      fetchContacts()
    }

    // Get socket instance and subscribe to events
    const socket = getSocket()
    if (socket) {
      socket.on('new_message', handleNewMessage)
      socket.on('conversation_update', handleConversationUpdate)

      // Cleanup listeners on unmount
      return () => {
        socket.off('new_message', handleNewMessage)
        socket.off('conversation_update', handleConversationUpdate)
      }
    }
  }, [])

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCity = !filterCity || contact.city?.toLowerCase().includes(filterCity.toLowerCase())
    const matchesBusiness = !filterBusinessName || contact.businessName?.toLowerCase().includes(filterBusinessName.toLowerCase())
    const matchesMobile = !filterMobile || contact.phone?.includes(filterMobile) || contact.whatsappNumber?.includes(filterMobile)
    
    return matchesSearch && matchesCity && matchesBusiness && matchesMobile
  })

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours < 24) return `${Math.floor(hours)} hours ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return '1 day ago'
    if (days < 30) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={exportContacts}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Contacts</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">All contacts</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Active Contacts</p>
          <p className="text-2xl font-bold text-gray-900">{stats.active.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">Have messaged</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">New This Month</p>
          <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
          <p className="text-xs text-green-600 mt-1">Added recently</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Opted In</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.optedIn}</p>
          <p className="text-xs text-gray-600 mt-1">Active subscriptions</p>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">All Contacts ({filteredContacts.length})</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs sm:text-sm font-medium text-gray-700 transition whitespace-nowrap"
              >
                🔍 {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent w-full sm:w-64 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Filter Panel - Mobile Optimized */}
          {showFilters && (
            <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Filter by City</label>
                  <input
                    type="text"
                    placeholder="e.g., Mumbai..."
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Filter by Business</label>
                  <input
                    type="text"
                    placeholder="e.g., ABC Corp..."
                    value={filterBusinessName}
                    onChange={(e) => setFilterBusinessName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Filter by Mobile</label>
                  <input
                    type="text"
                    placeholder="e.g., 987654..."
                    value={filterMobile}
                    onChange={(e) => setFilterMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setFilterCity('')
                    setFilterBusinessName('')
                    setFilterMobile('')
                  }}
                  className="px-3 py-1 text-xs sm:text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No contacts found</p>
              <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={openAddModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <div 
                  key={contact._id} 
                  onClick={() => openQuickViewDrawer(contact)}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-medium text-sm">
                          {contact.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                        <p className="text-xs text-gray-500 truncate">{contact.whatsappNumber}</p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                      contact.type === 'customer' ? 'bg-blue-100 text-blue-700' :
                      contact.type === 'lead' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {contact.type}
                    </span>
                  </div>

                  {contact.businessName && (
                    <p className="text-xs text-gray-600 mb-2 truncate"><span className="font-medium">Business:</span> {contact.businessName}</p>
                  )}
                  
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {contact.tags.map((tag, index) => (
                        <span key={index} className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-600">
                    <div>{contact.messageCount} messages</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          openContactChat(contact)
                        }}
                        className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded"
                        title="Send Message"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(contact)
                        }}
                        className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteContact(contact._id)
                        }}
                        className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedContact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* WhatsApp Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <PhoneIcon className="h-4 w-4 inline mr-1" />
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="919876543210"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Include country code (e.g., 919876543210)</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="john@example.com"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="e.g., ABC Corporation"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="e.g., Mumbai"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer' | 'lead' | 'other' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="customer">Customer</option>
                  <option value="lead">Lead</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag className="h-4 w-4 inline mr-1" />
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="Add tag and press Enter"
                  />
                  <Button onClick={addTag} variant="outline" type="button">Add</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-green-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-6 border-t justify-end">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button 
                className="bg-green-600 hover:bg-green-700" 
                onClick={saveContact}
                disabled={!formData.name || !formData.whatsappNumber}
              >
                {selectedContact ? 'Update Contact' : 'Add Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Import Contacts from CSV</h2>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📋 CSV Format Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Required columns: <strong>Name</strong>, <strong>WhatsApp Number</strong></li>
                  <li>Optional columns: Phone, Email, Type, Tags</li>
                  <li>WhatsApp Number should include country code (e.g., 919876543210)</li>
                  <li>Type can be: customer, lead, or other</li>
                  <li>Separate multiple tags with semicolons (e.g., Premium;VIP)</li>
                </ul>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={downloadTemplate}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Sample Template
                </Button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
                />
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Preview (first 5 rows)</h3>
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">WhatsApp</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Email</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{row.name || row.Name || '-'}</td>
                            <td className="px-3 py-2">{row['whatsapp number'] || row.whatsappnumber || row.whatsapp || '-'}</td>
                            <td className="px-3 py-2">{row.email || row.Email || '-'}</td>
                            <td className="px-3 py-2">{row.type || row.Type || 'customer'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This is a preview. All valid rows in the file will be imported.
                  </p>
                </div>
              )}

              {/* Import Summary */}
              {importFile && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>File:</strong> {importFile.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Size:</strong> {(importFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-6 border-t justify-end sticky bottom-0 bg-white">
              <Button variant="outline" onClick={closeImportModal} disabled={isImporting}>
                Cancel
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700" 
                onClick={importContacts}
                disabled={!importFile || isImporting}
              >
                {isImporting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Contacts
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Drawer */}
      {showQuickViewDrawer && drawerContact && (
        <div className="fixed inset-0 z-40">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeQuickViewDrawer}
          />
          
          {/* Drawer Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-medium">
                    {drawerContact.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{drawerContact.name}</p>
                  <p className="text-xs text-gray-500 truncate">{drawerContact.whatsappNumber}</p>
                </div>
              </div>
              <button 
                onClick={closeQuickViewDrawer}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase">Contact Info</p>
                {drawerContact.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{drawerContact.email}</span>
                  </div>
                )}
                {drawerContact.businessName && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{drawerContact.businessName}</span>
                  </div>
                )}
                {drawerContact.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{drawerContact.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MessageCircle className="h-4 w-4 text-gray-400" />
                  <span>{drawerContact.messageCount} messages</span>
                </div>
              </div>

              {/* Lead Score (if this contact is a lead type) */}
              {drawerContact.type === 'lead' && drawerContact.score !== undefined && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Lead Quality Score</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            drawerContact.score >= 75
                              ? 'bg-green-600'
                              : drawerContact.score >= 50
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${drawerContact.score}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-10 text-right">
                      {Math.round(drawerContact.score)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {drawerContact.score >= 75 ? '🟢 High potential' : drawerContact.score >= 50 ? '🟡 Medium potential' : '🔴 Low potential'}
                  </p>
                </div>
              )}

              {/* Tags */}
              {drawerContact.tags && drawerContact.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Tags</p>
                  <div className="flex gap-2 flex-wrap">
                    {drawerContact.tags.map((tag, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Messages */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase">Recent Messages</p>
                {drawerLoading ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">Loading messages...</p>
                  </div>
                ) : drawerMessages.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {drawerMessages.map((msg, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <p className="text-xs font-medium text-gray-700">
                            {msg.sender === drawerContact.whatsappNumber ? 'Them' : 'You'}
                          </p>
                          <span className="text-xs text-gray-500">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 break-words">
                          {msg.content || msg.messageType || 'Media message'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Action Buttons */}
            <div className="flex gap-2 p-4 border-t border-gray-200 bg-white">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  closeQuickViewDrawer()
                  openContactChat(drawerContact)
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => {
                  closeQuickViewDrawer()
                  openEditModal(drawerContact)
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
