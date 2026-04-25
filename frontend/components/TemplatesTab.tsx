"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/lib/context/SettingsContext"
import {
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  X,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Search
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

// Get JWT token from localStorage
const authService = {
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token')
    }
    return null
  }
}

// Get headers with auth token
const getHeaders = () => {
  const token = authService.getToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

// Enums
enum TemplateStatus {
  APPROVED = "approved",
  PENDING = "pending",
  REJECTED = "rejected",
  DRAFT = "draft"
}

enum TemplateCategory {
  MARKETING = "marketing",
  UTILITY = "utility",
  AUTHENTICATION = "authentication"
}

// Interfaces
interface Template {
  _id: string
  name: string
  language: string
  category: string
  content: string
  status: TemplateStatus
  usageCount?: number
  lastUsedAt?: string
  hasMedia?: boolean
  mediaType?: string
  mediaUrl?: string
  headerText?: string
  footerText?: string
  components?: any[]
  variables?: string[]
  rejectedReason?: string
  metaTemplateId?: string
  projectId: string
  createdAt: string
  updatedAt: string
}

interface Stats {
  approved: number
  pending: number
  rejected: number
  draft: number
  total: number
}

interface FormData {
  name: string
  language: string
  category: string
  content: string
  hasMedia: boolean
  mediaType: string
  mediaUrl: string
  mediaFile: File | null
  mediaInputType: 'url' | 'file'
  headerText: string
  footerText: string
  buttons: any[]
}

export default function TemplatesTab({ projectId }: { projectId: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<Stats>({ approved: 0, pending: 0, rejected: 0, draft: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'draft'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Get settings context to connect buttons to topbar
  const { setShowSyncButton, setShowCreateButton, setSyncClick, setCreateClick, setIsSyncing: setContextIsSyncing } = useSettings()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    language: 'en',
    category: TemplateCategory.UTILITY,
    content: '',
    hasMedia: false,
    mediaType: 'image',
    mediaUrl: '',
    mediaFile: null,
    mediaInputType: 'url',
    headerText: '',
    footerText: '',
    buttons: []
  })

  // Setup context callbacks on mount and when functions change
  useEffect(() => {
    setShowSyncButton(true)
    setShowCreateButton(true)
    setSyncClick(() => syncTemplatesFromWhatsApp)
    setCreateClick(() => openCreateModal)

    return () => {
      setShowSyncButton(false)
      setShowCreateButton(false)
    }
  }, [setShowSyncButton, setShowCreateButton, setSyncClick, setCreateClick])

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/templates?projectId=${projectId}`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        let templatesList: Template[] = []
        
        // Handle different response formats
        if (Array.isArray(data)) {
          templatesList = data
        } else if (data.templates && Array.isArray(data.templates)) {
          templatesList = data.templates
        } else if (data.data && Array.isArray(data.data)) {
          templatesList = data.data
        } else if (typeof data === 'object') {
          // Fallback: ensure it's an array
          templatesList = []
        }
        
        setTemplates(templatesList)

        // Calculate stats
        const stats = {
          approved: templatesList.filter((t: Template) => t.status === TemplateStatus.APPROVED).length,
          pending: templatesList.filter((t: Template) => t.status === TemplateStatus.PENDING).length,
          rejected: templatesList.filter((t: Template) => t.status === TemplateStatus.REJECTED).length,
          draft: templatesList.filter((t: Template) => t.status === TemplateStatus.DRAFT).length,
          total: templatesList.length
        }
        setStats(stats)
      } else {
        console.error("Failed to fetch templates:", response.status)
        setTemplates([])
        const errorData = await response.text()
        console.error("Error response:", errorData)
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  // Create template
  const createTemplate = async () => {
    try {
      let finalData: any = { ...formData, projectId }
      
      // If using file upload, create FormData to send file
      if (formData.hasMedia && formData.mediaInputType === 'file' && formData.mediaFile) {
        const formDataToSend = new FormData()
        formDataToSend.append('name', formData.name)
        formDataToSend.append('language', formData.language)
        formDataToSend.append('category', formData.category)
        formDataToSend.append('content', formData.content)
        formDataToSend.append('hasMedia', String(formData.hasMedia))
        formDataToSend.append('mediaType', formData.mediaType)
        formDataToSend.append('headerText', formData.headerText)
        formDataToSend.append('footerText', formData.footerText)
        formDataToSend.append('projectId', projectId)
        formDataToSend.append('mediaFile', formData.mediaFile)
        
        const response = await fetch(`${API_URL}/templates`, {
          method: 'POST',
          headers: {
            ...(authService.getToken() && { 'Authorization': `Bearer ${authService.getToken()}` })
          },
          body: formDataToSend,
        })

        const result = await response.json()
        if (response.ok) {
          alert(result.message)
          fetchTemplates()
          closeModal()
        } else {
          alert(result.message || "Failed to create template")
        }
      } else {
        // Send as JSON if using URL
        const response = await fetch(`${API_URL}/templates`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(finalData),
        })

        const result = await response.json()
        if (response.ok) {
          alert(result.message)
          fetchTemplates()
          closeModal()
        } else {
          alert(result.message || "Failed to create template")
        }
      }
    } catch (error) {
      console.error("Error creating template:", error)
      alert("Failed to create template")
    }
  }

  // Delete template
  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return
    
    try {
      const response = await fetch(`${API_URL}/templates/${id}?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })

      if (response.ok) {
        fetchTemplates()
      } else {
        alert("Failed to delete template")
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      alert("Failed to delete template")
    }
  }

  // Submit template to Meta
  const submitTemplateToMeta = async (id: string) => {
    if (!confirm("Submit this template to Meta for approval?")) return
    
    try {
      const response = await fetch(`${API_URL}/templates/${id}/submit?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
      })

      const result = await response.json()
      if (response.ok) {
        alert(`✅ Template submitted to Meta successfully!\nTemplate ID: ${result.metaTemplateId}`)
        fetchTemplates()
      } else {
        alert(`❌ Failed to submit template: ${result.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error submitting template:", error)
      alert("❌ Failed to submit template. Please try again.")
    }
  }

  // Sync templates from WhatsApp Manager
  const syncTemplatesFromWhatsApp = async () => {
    try {
      setIsSyncing(true)
      const response = await fetch(`${API_URL}/settings/templates/sync?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
      })

      const result = await response.json()
      if (response.ok) {
        alert(`✅ ${result.message}\n\n📊 Created: ${result.created}\n🔄 Updated: ${result.updated}\n📈 Total Synced: ${result.synced}`)
        fetchTemplates()
      } else {
        alert(`❌ ${result.message || "Failed to sync templates"}`)
      }
    } catch (error) {
      console.error("Error syncing templates:", error)
      alert("❌ Failed to sync templates. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  // Modal handlers
  const openCreateModal = () => {
    setSelectedTemplate(null)
    setFormData({
      name: '',
      language: 'en',
      category: TemplateCategory.UTILITY,
      content: '',
      hasMedia: false,
      mediaType: 'image',
      mediaUrl: '',
      mediaFile: null,
      mediaInputType: 'url',
      headerText: '',
      footerText: '',
      buttons: []
    })
    setShowModal(true)
  }

  const openViewModal = (template: Template) => {
    setSelectedTemplate(template)
    setShowViewModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setShowViewModal(false)
    setSelectedTemplate(null)
  }

  useEffect(() => {
    fetchTemplates()
  }, [projectId])

  // Filter templates
  const filteredTemplates = Array.isArray(templates) 
    ? templates.filter((template) => {
        // Search filter
        const matchesSearch = template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.category?.toLowerCase().includes(searchQuery.toLowerCase())
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || template.status?.toLowerCase() === statusFilter.toLowerCase()
        
        // Category filter
        const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
        
        return matchesSearch && matchesStatus && matchesCategory
      })
    : []

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

  // Extract variables from content
  const extractVariables = (content: string): number => {
    const matches = content.match(/\{\{(\d+)\}\}/g)
    return matches ? matches.length : 0
  }

  return (
    <>
      <div className="flex flex-col gap-6">
      {/* Search Bar */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates (status, name etc.)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 w-full text-sm"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'all', label: 'All', icon: '◎' },
          { id: 'draft', label: 'Draft', icon: '📝' },
          { id: 'pending', label: 'Pending', icon: '⏱️' },
          { id: 'approved', label: 'Approved', icon: '✓' },
          { id: 'rejected', label: 'Rejected', icon: '✕' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id as any)
              setCurrentPage(1)
            }}
            className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              statusFilter === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content - Sidebar + Table */}
      <div className="flex gap-6">
        {/* Left Sidebar - Categories */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setCategoryFilter('all')
                  setCurrentPage(1)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {['Trending', 'General', 'Top Rated', 'Ecommerce', 'Education', 'Banking', 'Webinar', 'Healthcare', 'Automobile', 'Real Estate', 'Services', 'Non profit'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat)
                    setCurrentPage(1)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    categoryFilter === cat
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Right Content - Templates Table */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Health</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTemplates.length > 0 ? (
                    filteredTemplates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((template) => (
                      <tr key={template._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{template.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{template.category}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            template.status === TemplateStatus.APPROVED
                              ? "bg-green-100 text-green-700"
                              : template.status === TemplateStatus.PENDING
                              ? "bg-orange-100 text-orange-700"
                              : template.status === TemplateStatus.REJECTED
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {template.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{template.language}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            High
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(template.createdAt)}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => {
                              setSelectedTemplate(template)
                              setShowViewModal(true)
                            }} className="text-blue-600 hover:text-blue-800">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => submitTemplateToMeta(template._id)} className="text-green-600 hover:text-green-800">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={() => deleteTemplate(template._id)} className="text-red-600 hover:text-red-800">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No templates found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTemplates.length > itemsPerPage && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTemplates.length)} of {filteredTemplates.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= filteredTemplates.length}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Table ends here - main content div closes */}
    </div>

    <>
      {/* Create Modal - Right Drawer with Glass Blur */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          {/* Glass Blur Background */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          />
          
          {/* Right Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white/95 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-gray-900">Create WhatsApp Template</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Template Guidelines</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Templates must be approved by Meta before use</li>
                  <li>Use variables with {`{{1}}, {{2}}`}, etc. for dynamic content (names, URLs, emails, etc.)</li>
                  <li>Website URLs can be sent as variables - just map to "Website URL" field</li>
                  <li>Category: utility for OTPs/updates, marketing for promotions</li>
                  <li>Keep messages clear and concise</li>
                </ul>
              </div>

              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="order_confirmation"
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase and underscores only</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="utility">Utility - Transactional updates</option>
                  <option value="marketing">Marketing - Promotional messages</option>
                  <option value="authentication">Authentication - OTPs and verification</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="en">English</option>
                  <option value="en_US">English (US)</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              {/* Media Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasMedia"
                  checked={formData.hasMedia}
                  onChange={(e) => setFormData({ ...formData, hasMedia: e.target.checked })}
                  className="h-4 w-4 text-green-600 rounded"
                />
                <label htmlFor="hasMedia" className="text-sm font-medium text-gray-700">
                  Include Media (Header)
                </label>
              </div>

              {/* Media Configuration */}
              {formData.hasMedia && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Media Type</label>
                    <select
                      value={formData.mediaType}
                      onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Video</option>
                      <option value="DOCUMENT">Document</option>
                    </select>
                  </div>

                  {/* Input Type Toggle: File or URL */}
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mediaInputType"
                        value="file"
                        checked={formData.mediaInputType === 'file'}
                        onChange={(e) => setFormData({ ...formData, mediaInputType: 'file' })}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="text-sm font-medium text-gray-700">📎 Upload File</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mediaInputType"
                        value="url"
                        checked={formData.mediaInputType === 'url'}
                        onChange={(e) => setFormData({ ...formData, mediaInputType: 'url' })}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="text-sm font-medium text-gray-700">🔗 Use URL</span>
                    </label>
                  </div>

                  {/* File Upload Input */}
                  {formData.mediaInputType === 'file' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attach {formData.mediaType.charAt(0) + formData.mediaType.slice(1).toLowerCase()} *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition cursor-pointer bg-white">
                        <input
                          type="file"
                          accept={
                            formData.mediaType === 'image' 
                              ? 'image/jpeg,image/png,image/gif,image/webp' 
                              : formData.mediaType === 'video' 
                              ? 'video/mp4,video/quicktime'
                              : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                          }
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFormData({ ...formData, mediaFile: e.target.files[0] })
                            }
                          }}
                          className="hidden"
                          id="mediaFileInput"
                        />
                        <label htmlFor="mediaFileInput" className="cursor-pointer">
                          {formData.mediaFile ? (
                            <div className="text-sm">
                              <p className="text-green-600 font-semibold">✓ {formData.mediaFile.name}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                ({(formData.mediaFile.size / 1024 / 1024).toFixed(2)} MB)
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-gray-500">
                                {formData.mediaType === 'image' 
                                  ? '📷 Click to upload image (JPG, PNG, GIF, WebP)'
                                  : formData.mediaType === 'video'
                                  ? '🎥 Click to upload video (MP4, MOV)'
                                  : '📄 Click to upload document (PDF, DOC, DOCX)'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">Max 16 MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* URL Input */}
                  {formData.mediaInputType === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Media URL (Sample) *
                      </label>
                      <input
                        type="url"
                        value={formData.mediaUrl}
                        onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        placeholder="https://example.com/image.jpg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Sample URL for Meta approval. Actual media URL will be provided when sending.
                      </p>
                    </div>
                  )}

                  {/* Header Text for Video/Document */}
                  {formData.mediaType !== 'image' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Header Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.headerText}
                        onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        placeholder="Document title or video caption"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-mono text-sm"
                  placeholder="Hello {{1}}, your order {{2}} has been confirmed!"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables found: {extractVariables(formData.content)}
                </p>
              </div>

              {/* Variable Mappings - Show when there are variables */}
              {extractVariables(formData.content) > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-base font-bold text-indigo-900">
                      🔗 Variable to Field Mapping
                    </p>
                    <span className="bg-indigo-300 text-indigo-900 text-xs px-3 py-1 rounded-full font-bold">
                      {extractVariables(formData.content)} variables
                    </span>
                  </div>
                  <p className="text-sm text-indigo-800 mb-4">
                    Define which contact field each variable will use:
                  </p>
                  
                  {/* Mapping Display */}
                  <div className="space-y-3">
                    {Array.from({ length: extractVariables(formData.content) }, (_, i) => (
                      <div key={i + 1} className="bg-white rounded-lg border-2 border-indigo-200 p-4 hover:border-indigo-400 transition">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-lg font-bold text-sm">
                            {i + 1}
                          </div>
                          <p className="font-semibold text-gray-900">Variable {i + 1}</p>
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-1 text-xs rounded font-mono">
                            Variable#{i + 1}
                          </span>
                        </div>
                        
                        <div className="ml-11 space-y-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              What does this variable represent?
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., Customer Name, Order ID, Amount, Email"
                              className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Which contact field to use?
                            </label>
                            <select className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium">
                              <option value="">-- Select contact field --</option>
                              <option value="name">👤 Name</option>
                              <option value="email">📧 Email</option>
                              <option value="phone">📱 Phone</option>
                              <option value="website_url">🌐 Website URL</option>
                              <option value="whatsappNumber">💬 WhatsApp Number</option>
                              <option value="type">🏷️ Contact Type</option>
                              <option value="custom">⚙️ Custom Field</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Example */}
                  <div className="mt-4 bg-indigo-100 border-l-4 border-indigo-600 p-3 rounded">
                    <p className="text-xs font-semibold text-indigo-900 mb-2">📌 Examples:</p>
                    <p className="text-xs text-indigo-800 mb-2">
                      • Variable 1 = Name (from name field) and Variable 2 = Order ID (from custom field)
                    </p>
                    <p className="text-xs text-indigo-800">
                      • Variable 1 = Website URL (from website_url field) to send dynamic links to customers
                    </p>
                  </div>
                </div>
              )}

              {/* Show hint when no variables */}
              {extractVariables(formData.content) === 0 && formData.content && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ℹ️ Add variables like {'{'}'{'{'}1{'}'}, {'{'}'{'{'}2{'}}{'}') to enable field mappings
                  </p>
                </div>
              )}

              {/* Footer Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Footer Text (Optional)
                </label>
                <input
                  type="text"
                  value={formData.footerText}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Small text at the bottom (e.g., 'Reply STOP to unsubscribe')"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum 60 characters</p>
              </div>

              {/* Preview */}
              {formData.content && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Preview:</p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{formData.content}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-6 border-t justify-end sticky bottom-0 bg-white/95 backdrop-blur-sm">
              <Button variant="outline" onClick={closeModal} className="border-gray-300">
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold" 
                onClick={createTemplate}
                disabled={!formData.name || !formData.content}
              >
                Create Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Template Details</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedTemplate.status === TemplateStatus.APPROVED
                      ? "bg-green-100 text-green-700"
                      : selectedTemplate.status === TemplateStatus.PENDING
                      ? "bg-orange-100 text-orange-700"
                      : selectedTemplate.status === TemplateStatus.REJECTED
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedTemplate.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900">{selectedTemplate.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Language</p>
                  <p className="font-medium text-gray-900">{selectedTemplate.language}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Usage Count</p>
                  <p className="font-medium text-gray-900">{selectedTemplate.usageCount || 0} times</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Used</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedTemplate.lastUsedAt)}</p>
                </div>
              </div>

              {/* Display components if available */}
              {selectedTemplate.components && selectedTemplate.components.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Template Components</p>
                  <div className="space-y-2">
                    {selectedTemplate.components.map((comp: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-blue-600 uppercase">{comp.type}</span>
                          {comp.format && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{comp.format}</span>
                          )}
                        </div>
                        {comp.text && (
                          <p className="text-sm text-gray-900 font-mono">{comp.text}</p>
                        )}
                        {comp.example && comp.example.header_handle && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Sample Media URL:</p>
                            <a 
                              href={comp.example.header_handle[0]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline break-all"
                            >
                              {comp.example.header_handle[0]}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-2">Content</p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap font-mono">{selectedTemplate.content}</p>
                </div>
              </div>

              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Variables</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedTemplate.variables.map((v, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.status === TemplateStatus.REJECTED && selectedTemplate.rejectedReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-800">{selectedTemplate.rejectedReason}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-6 border-t justify-end sticky bottom-0 bg-white">
              <Button variant="outline" onClick={closeModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
    </>
  )
}
