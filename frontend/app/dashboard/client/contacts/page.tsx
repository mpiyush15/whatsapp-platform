"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Users, Plus, Upload, Download, Edit, Trash2, X, Tag, Mail, Phone as PhoneIcon, User, Building2, MapPin, MessageCircle, ChevronUp, ChevronDown, Save, Check, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
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
  score?: number
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
  score?: number
}

interface Segment {
  _id: string
  name: string
  description?: string
  filters: any
  stats: { contactCount: number }
  isPinned: boolean
  createdAt: string
}

interface TimelineEntry {
  _id: string
  type: string
  description: string
  actor: { type: string; name: string }
  timestamp: Date
  details: any
}

type SortKey = 'name' | 'type' | 'lastMessageAt' | 'createdAt' | 'messageCount'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, newThisMonth: 0, optedIn: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const router = useRouter()
  
  // Segment state
  const [segments, setSegments] = useState<Segment[]>([])
  const [showSegmentModal, setShowSegmentModal] = useState(false)
  const [segmentName, setSegmentName] = useState("")
  const [segmentDescription, setSegmentDescription] = useState("")
  const [isLoadingSegments, setIsLoadingSegments] = useState(false)

  // Bulk action state
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [bulkTag, setBulkTag] = useState("")
  const [bulkActionLoading, setIsLoadingBulkAction] = useState(false)

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [showTimelineTab, setShowTimelineTab] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    whatsappNumber: '',
    phone: '',
    email: '',
    businessName: '',
    city: '',
    type: ContactType.CUSTOMER,
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCity, setFilterCity] = useState("")
  const [filterBusinessName, setFilterBusinessName] = useState("")
  const [filterType, setFilterType] = useState<'all' | ContactType>('all')
  const [sortKey, setSortKey] = useState<'name' | 'type' | 'lastMessageAt' | 'createdAt' | 'messageCount'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showQuickViewDrawer, setShowQuickViewDrawer] = useState(false)
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerMessages, setDrawerMessages] = useState<Message[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

  const getHeaders = () => {
    const token = authService.getToken()
    return {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    }
  }

  // ============== SEGMENT FUNCTIONS ==============
  const fetchSegments = async () => {
    try {
      setIsLoadingSegments(true)
      const response = await fetch(`${API_URL}/segments`, {
        headers: getHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setSegments(data.segments || [])
      }
    } catch (error) {
      console.error("Error fetching segments:", error)
    } finally {
      setIsLoadingSegments(false)
    }
  }

  const saveSegmentFromCurrentFilters = async () => {
    if (!segmentName.trim()) {
      alert("Please enter segment name")
      return
    }

    try {
      setIsLoadingSegments(true)
      const filters = {
        type: filterType === 'all' ? [] : [filterType],
        city: filterCity ? [filterCity] : [],
        businessName: filterBusinessName ? [filterBusinessName] : [],
        searchText: searchQuery
      }

      const response = await fetch(`${API_URL}/segments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: segmentName,
          description: segmentDescription,
          filters
        })
      })

      if (response.ok) {
        alert(`Segment "${segmentName}" created successfully!`)
        setSegmentName("")
        setSegmentDescription("")
        setShowSegmentModal(false)
        fetchSegments()
      } else {
        const error = await response.json()
        alert(error.message || "Failed to create segment")
      }
    } catch (error) {
      console.error("Error saving segment:", error)
      alert("Failed to save segment")
    } finally {
      setIsLoadingSegments(false)
    }
  }

  const applySegment = async (segment: Segment) => {
    // Apply segment filters
    const f = segment.filters
    if (f.type && f.type.length > 0) {
      setFilterType(f.type[0] as ContactType)
    }
    if (f.city && f.city.length > 0) {
      setFilterCity(f.city[0])
    }
    if (f.businessName && f.businessName.length > 0) {
      setFilterBusinessName(f.businessName[0])
    }
  }

  const deleteSegment = async (segmentId: string) => {
    if (!confirm("Delete this segment?")) return

    try {
      const response = await fetch(`${API_URL}/segments/${segmentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })

      if (response.ok) {
        fetchSegments()
      }
    } catch (error) {
      console.error("Error deleting segment:", error)
    }
  }

  // ============== BULK ACTION FUNCTIONS ==============
  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContactIds)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContactIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedContactIds.size === contacts.length) {
      setSelectedContactIds(new Set())
    } else {
      setSelectedContactIds(new Set(contacts.map(c => c._id)))
    }
  }

  const bulkAddTag = async () => {
    if (!bulkTag.trim()) {
      alert("Enter tag name")
      return
    }

    try {
      setIsLoadingBulkAction(true)
      const response = await fetch(`${API_URL}/contacts/bulk-update`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          contactIds: Array.from(selectedContactIds),
          action: 'add_tag',
          payload: { tag: bulkTag }
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Tagged ${result.updated} contacts`)
        setBulkTag("")
        setShowBulkTagModal(false)
        setSelectedContactIds(new Set())
        fetchContacts()
      } else {
        alert("Failed to tag contacts")
      }
    } catch (error) {
      console.error("Error bulk tagging:", error)
      alert("Failed to tag contacts")
    } finally {
      setIsLoadingBulkAction(false)
    }
  }

  const bulkRemoveTag = async (tag: string) => {
    if (selectedContactIds.size === 0) return

    try {
      setIsLoadingBulkAction(true)
      const response = await fetch(`${API_URL}/contacts/bulk-update`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          contactIds: Array.from(selectedContactIds),
          action: 'remove_tag',
          payload: { tag }
        })
      })

      if (response.ok) {
        fetchContacts()
        setSelectedContactIds(new Set())
      }
    } catch (error) {
      console.error("Error removing tags:", error)
    } finally {
      setIsLoadingBulkAction(false)
    }
  }

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedContactIds.size} contacts?`)) return

    try {
      setIsLoadingBulkAction(true)
      const response = await fetch(`${API_URL}/contacts/bulk-update`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          contactIds: Array.from(selectedContactIds),
          action: 'delete'
        })
      })

      if (response.ok) {
        alert(`Deleted ${selectedContactIds.size} contacts`)
        fetchContacts()
        setSelectedContactIds(new Set())
      }
    } catch (error) {
      console.error("Error deleting contacts:", error)
    } finally {
      setIsLoadingBulkAction(false)
    }
  }

  // ============== TIMELINE FUNCTIONS ==============
  const fetchContactTimeline = async (contactId: string) => {
    try {
      setTimelineLoading(true)
      const response = await fetch(`${API_URL}/contacts/${contactId}/timeline`, {
        headers: getHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setTimeline(data.timeline || [])
      }
    } catch (error) {
      console.error("Error fetching timeline:", error)
    } finally {
      setTimelineLoading(false)
    }
  }

  // Auto-sync contact from live chat
  const autoSyncContactFromChat = async (phoneNumber: string) => {
    try {
      // Check if contact already exists
      const exists = contacts.some(c => 
        c.whatsappNumber === phoneNumber || c.phone === phoneNumber
      )
      
      if (exists) return // Already synced
      
      // Auto-add contact from live chat
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: `Chat ${phoneNumber}`,
          whatsappNumber: phoneNumber,
          phone: phoneNumber,
          type: ContactType.CUSTOMER,
          tags: ['auto-synced'],
        }),
      })
      
      if (response.ok) {
        // Refresh contacts list
        fetchContacts()
      }
    } catch (error) {
      console.error("Error auto-syncing contact:", error)
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
        const contacts = data.contacts || data.data || []
        setContacts(contacts)
        
        // Calculate stats
        const total = data.pagination?.total || contacts.length
        const optedIn = contacts.filter((c: Contact) => c.isOptedIn).length
        const active = contacts.filter((c: Contact) => c.lastMessageAt).length
        const now = new Date()
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        const newThisMonth = contacts.filter((c: Contact) => 
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
  const deleteContact = async (contact: Contact) => {
    if (!confirm("Are you sure you want to delete this contact?")) return
    
    try {
      const response = await fetch(`${API_URL}/contacts/${contact._id}`, {
        method: 'DELETE',
        headers: getHeaders(),
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

  // Fetch contacts from incoming chats
  const fetchContactsFromChats = async () => {
    try {
      setIsImporting(true)
      
      const response = await fetch(`${API_URL}/contacts/fetch-from-chats`, {
        method: 'GET',
        headers: getHeaders(),
      })

      const result = await response.json()

      if (response.ok) {
        const newContacts = result.contacts || []
        if (newContacts.length === 0) {
          alert('No new contacts found in incoming chats')
          return
        }

        // Show preview of fetched contacts
        setImportPreview(newContacts)
        setShowImportModal(true)
        // Flag to indicate these are from chats, not from file
        ;(window as any).fetchedFromChats = true
      } else {
        alert(result.message || 'Failed to fetch contacts from chats')
      }
    } catch (error) {
      console.error('Error fetching from chats:', error)
      alert('Failed to fetch contacts from chats')
    } finally {
      setIsImporting(false)
    }
  }

  // Save fetched contacts from chats
  const saveFetchedContacts = async () => {
    if (importPreview.length === 0) return

    try {
      setIsImporting(true)

      const response = await fetch(`${API_URL}/contacts/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contacts: importPreview }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Successfully imported ${result.imported} contacts from chats! ${result.failed > 0 ? `${result.failed} failed.` : ''}`)
        fetchContacts()
        closeImportModal()
      } else {
        alert(result.message || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import contacts')
    } finally {
      setIsImporting(false)
    }
  }

  // Open chat for a contact
  const openContactChat = (contact: Contact) => {
    router.push(`/dashboard/live-chat?phone=${encodeURIComponent(contact.whatsappNumber)}`)
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
      type: ContactType.CUSTOMER,
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
      ...contacts.map(c => [
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
            type: typeIndex !== -1 ? values[typeIndex].toLowerCase() : ContactType.CUSTOMER,
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
      ['John Doe', '919876543210', '+91 98765 43210', 'john@example.com', ContactType.CUSTOMER, 'Premium;VIP'].join(','),
      ['Jane Smith', '919876543211', '+91 98765 43211', 'jane@example.com', ContactType.LEAD, 'New'].join(','),,
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
    fetchSegments()

    // Listen for new messages to refresh contacts list in real-time
    const handleNewMessage = (data: any) => {
      console.log('🔔 Contacts Page - new_message event:', data)
      // Auto-sync phone number from live chat
      if (data?.sender) {
        autoSyncContactFromChat(data.sender)
      }
      if (data?.message?.sender) {
        autoSyncContactFromChat(data.message.sender)
      }
      if (data?.phoneNumber) {
        autoSyncContactFromChat(data.phoneNumber)
      }
      if (data?.message?.senderPhone) {
        autoSyncContactFromChat(data.message.senderPhone)
      }
      // Refresh contacts when new message arrives from live chat
      fetchContacts()
    }

    const handleConversationUpdate = (data: any) => {
      console.log('🔔 Contacts Page - conversation_update:', data)
      // Auto-sync phone number from conversation
      if (data?.phoneNumber) {
        autoSyncContactFromChat(data.phoneNumber)
      }
      if (data?.phone) {
        autoSyncContactFromChat(data.phone)
      }
      if (data?.senderPhone) {
        autoSyncContactFromChat(data.senderPhone)
      }
      // Refresh contacts when conversation updates from live chat
      fetchContacts()
    }

    const handleMessageSent = (data: any) => {
      console.log('🔔 Contacts Page - message_sent:', data)
      // Auto-sync phone number when sending message
      if (data?.receiver) {
        autoSyncContactFromChat(data.receiver)
      }
      if (data?.phoneNumber) {
        autoSyncContactFromChat(data.phoneNumber)
      }
      // When message is sent from live chat, update contacts
      fetchContacts()
    }

    const handleMessageReceived = (data: any) => {
      console.log('🔔 Contacts Page - message_received:', data)
      // Auto-sync phone number when receiving message
      if (data?.sender) {
        autoSyncContactFromChat(data.sender)
      }
      if (data?.message?.sender) {
        autoSyncContactFromChat(data.message.sender)
      }
      if (data?.phoneNumber) {
        autoSyncContactFromChat(data.phoneNumber)
      }
      if (data?.message?.senderPhone) {
        autoSyncContactFromChat(data.message.senderPhone)
      }
      // When message is received in live chat, update contacts
      fetchContacts()
    }

    const handleIncomingMessage = (data: any) => {
      console.log('🔔 Contacts Page - incoming_message:', data)
      // Auto-sync phone number from incoming message
      if (data?.from) {
        autoSyncContactFromChat(data.from)
      }
      if (data?.sender) {
        autoSyncContactFromChat(data.sender)
      }
      if (data?.phoneNumber) {
        autoSyncContactFromChat(data.phoneNumber)
      }
      fetchContacts()
    }

    // Get socket instance and subscribe to events
    const socket = getSocket()
    if (socket) {
      socket.on('new_message', handleNewMessage)
      socket.on('conversation_update', handleConversationUpdate)
      socket.on('conversation_updated', handleConversationUpdate)
      socket.on('message_sent', handleMessageSent)
      socket.on('message_received', handleMessageReceived)
      socket.on('incoming_message', handleIncomingMessage)

      // Cleanup listeners on unmount
      return () => {
        socket.off('new_message', handleNewMessage)
        socket.off('conversation_update', handleConversationUpdate)
        socket.off('conversation_updated', handleConversationUpdate)
        socket.off('message_sent', handleMessageSent)
        socket.off('message_received', handleMessageReceived)
        socket.off('incoming_message', handleIncomingMessage)
      }
    }
  }, [])

  // Filter and sort contacts using useMemo for performance
  const filteredAndSortedContacts = useMemo(() => {
    if (!contacts || !Array.isArray(contacts)) return []
    
    let filtered = contacts.filter((contact) => {
      const matchesSearch = contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery) ||
        contact.whatsappNumber?.includes(searchQuery) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesCity = !filterCity || contact.city?.toLowerCase().includes(filterCity.toLowerCase())
      const matchesBusiness = !filterBusinessName || contact.businessName?.toLowerCase().includes(filterBusinessName.toLowerCase())
      const matchesType = filterType === 'all' || contact.type === filterType
      
      return matchesSearch && matchesCity && matchesBusiness && matchesType
    })

    // Sort contacts
    filtered.sort((a, b) => {
      let aVal: any = a[sortKey]
      let bVal: any = b[sortKey]

      if (sortKey === 'name' || sortKey === 'type') {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      if (sortKey === 'lastMessageAt' || sortKey === 'createdAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })

    return filtered
  }, [contacts, searchQuery, filterCity, filterBusinessName, filterType, sortKey, sortOrder])

  // Format date with relative time
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${Math.floor(hours)}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case ContactType.CUSTOMER: return 'bg-blue-100 text-blue-700 border-blue-200'
      case ContactType.LEAD: return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case ContactType.OTHER: return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <div className="w-4 h-4" />
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const closeQuickViewDrawer = () => {
    setShowQuickViewDrawer(false)
    setDrawerContact(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage and organize your WhatsApp contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchContactsFromChats} disabled={isImporting}>
            <MessageCircle className="h-4 w-4 mr-2" />
            {isImporting ? 'Fetching...' : 'From Chats'}
          </Button>
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

      {/* Quick Stats */}
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

      {/* SEGMENTS SECTION */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Saved Segments</h3>
          <button
            onClick={() => setShowSegmentModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save Current
          </button>
        </div>

        {/* Segments horizontal scroll */}
        {isLoadingSegments ? (
          <p className="text-sm text-gray-500">Loading segments...</p>
        ) : segments.length === 0 ? (
          <p className="text-sm text-gray-500">No saved segments yet</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {segments.map((segment) => (
              <button
                key={segment._id}
                onClick={() => applySegment(segment)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 whitespace-nowrap flex items-center gap-2 transition-colors"
              >
                {segment.name}
                <span className="text-xs text-gray-500">({segment.stats?.contactCount || 0})</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSegment(segment._id)
                  }}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Table Component */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <ContactsTable 
          contacts={contacts}
          isLoading={isLoading}
          onEdit={openEditModal}
          onDelete={deleteContact}
          onView={(contact) => openContactChat(contact)}
          selectedIds={selectedContactIds}
          onSelectContact={handleSelectContact}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* Bulk Actions Sticky Bar */}
      {selectedContactIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="font-medium text-gray-900">
                {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkTagModal(true)}
                className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Add Tag
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedContactIds(new Set())}
                className="px-4 py-2 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Add Tag to {selectedContactIds.size} Contacts</h2>
              <button 
                onClick={() => setShowBulkTagModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && bulkAddTag()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Enter tag name"
                autoFocus
              />
            </div>

            <div className="flex gap-2 p-6 border-t justify-end">
              <Button 
                variant="outline"
                onClick={() => setShowBulkTagModal(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={bulkAddTag}
                disabled={bulkActionLoading || !bulkTag.trim()}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {bulkActionLoading ? 'Adding...' : 'Add Tag'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ContactType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value={ContactType.CUSTOMER}>Customer</option>
                  <option value={ContactType.LEAD}>Lead</option>
                  <option value={ContactType.OTHER}>Other</option>
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
              <h2 className="text-xl font-semibold text-gray-900">
                {(window as any).fetchedFromChats ? 'Import Contacts from Chats' : 'Import Contacts from CSV'}
              </h2>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* CSV Instructions - Show only for CSV import */}
              {!(window as any).fetchedFromChats && (
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
              )}

              {/* File Upload - Show only for CSV import */}
              {!(window as any).fetchedFromChats && (
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
              )}

              {/* Fetched from Chats Info */}
              {(window as any).fetchedFromChats && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">✅ Contacts from Incoming Chats</h3>
                  <p className="text-sm text-green-800">
                    Found <strong>{importPreview.length} new contact{importPreview.length !== 1 ? 's' : ''}</strong> from your WhatsApp conversations. These contacts will be added automatically with their phone numbers from your chats.
                  </p>
                </div>
              )}

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
                onClick={(window as any).fetchedFromChats ? saveFetchedContacts : importContacts}
                disabled={((window as any).fetchedFromChats ? importPreview.length === 0 : !importFile) || isImporting}
              >
                {isImporting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {(window as any).fetchedFromChats ? 'Save Contacts' : 'Import Contacts'}
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

      {/* Save Segment Modal */}
      {showSegmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Save Current Filters as Segment</h2>
              <button 
                onClick={() => setShowSegmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segment Name *</label>
                <input
                  type="text"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g., Premium Customers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g., High-value customers from Delhi"
                  rows={3}
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p className="font-medium mb-2">Current filters being saved:</p>
                <ul className="space-y-1 text-xs">
                  {filterType !== 'all' && <li>• Type: {filterType}</li>}
                  {filterCity && <li>• City: {filterCity}</li>}
                  {filterBusinessName && <li>• Business: {filterBusinessName}</li>}
                  {searchQuery && <li>• Search: {searchQuery}</li>}
                  {filterType === 'all' && !filterCity && !filterBusinessName && !searchQuery && (
                    <li className="text-gray-400">No filters applied</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-2 p-6 border-t justify-end">
              <Button 
                variant="outline"
                onClick={() => setShowSegmentModal(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveSegmentFromCurrentFilters}
                disabled={isLoadingSegments || !segmentName.trim()}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isLoadingSegments ? 'Saving...' : 'Save Segment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
