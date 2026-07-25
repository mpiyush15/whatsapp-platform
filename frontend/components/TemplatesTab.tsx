"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/lib/context/SettingsContext"
import { useProject } from "@/lib/context/ProjectContext"
import HealthcareTemplatesInstructions from "@/components/healthcare/HealthcareTemplatesInstructions"
import {
  createDraftTemplate,
  fetchHealthcareTemplatePresets,
  fetchProjectWhatsAppStatus,
  installHealthcareTemplatePack,
} from "@/lib/healthcareWhatsAppApi"
import {
  HEALTHCARE_TEMPLATES_CATEGORY,
  isHealthcarePackTemplateName,
  mergePackWithTemplates,
  packReadiness,
  type HealthcareTemplatePreset,
} from "@/lib/healthcareWhatsAppPack"
import TemplateEditForm, {
  type TemplateFormData,
  AUTH_OTP_BODY_PRESETS,
  isValidAuthOtpBody,
  validateMetaVariables,
} from "@/components/TemplateEditForm"
import { Plus, Search, RefreshCw, X, ChevronRight, Check, CheckCircle, Eye, Clock, Download, Image as ImageIcon, MessageSquare, Trash2, Edit2, PlayCircle, FileText, MapPin, Upload, File as FileIcon, Copy } from 'lucide-react'

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

const formatWhatsAppText = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          return <strong key={i}>{part.slice(1, -1)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

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
  mediaFileName?: string
  mediaFilePath?: string
  headerText?: string
  footerText?: string
  components?: any[]
  variables?: string[]
  rejectedReason?: string
  metaTemplateId?: string
  projectId: string
  createdAt: string
  updatedAt: string
  /** Healthcare preset row not yet installed as draft */
  isPresetPreview?: boolean
  triggerEvents?: string[]
  presetLabel?: string
}

/** Media header only when Meta HEADER component or hasMedia — not from stale mediaType default */
function resolveTemplateHeaderDisplay(t: Template) {
  const headerComp = t.components?.find(
    (c: { type?: string; format?: string; text?: string; example?: { header_handle?: string[] } }) =>
      c.type === 'HEADER'
  )
  const format = String(headerComp?.format || '').toUpperCase()
  const hasMediaFlag = t.hasMedia === true
  return {
    headerText: format === 'TEXT' ? (headerComp?.text || t.headerText || '') : '',
    hasImage: format === 'IMAGE' || (hasMediaFlag && t.mediaType === 'image'),
    hasVideo: format === 'VIDEO' || (hasMediaFlag && t.mediaType === 'video'),
    hasDoc: format === 'DOCUMENT' || (hasMediaFlag && t.mediaType === 'document'),
    mediaUrl: t.mediaUrl || headerComp?.example?.header_handle?.[0] || '',
  }
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
  authUseCase?: 'login_otp' | 'signup_otp' | 'order_verification' | 'custom_otp'
  authAutoFillEnabled?: boolean
  appPackageName?: string
  appSignatureHash?: string
  content: string
  hasMedia: boolean
  mediaType: string
  mediaUrl: string
  mediaFile: File | null
  mediaInputType: 'url' | 'file'
  headerText: string
  footerText: string
  buttons: any[]
  variableType: 'Number' | 'Text'
  mediaSample: 'none' | 'image' | 'video' | 'document' | 'location'
  messageValidityEnabled?: boolean
  messageValidityPeriod?: '10_minutes' | '12_hours' | '24_hours' | '7_days' | '30_days'
  variableSamples?: string[]
  variableConfig?: any[]
}

export default function TemplatesTab({ projectId, isCreatePage = false }: { projectId: string, isCreatePage?: boolean }) {
  const router = useRouter()
  const { vertical } = useProject()
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<Stats>({ approved: 0, pending: 0, rejected: 0, draft: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [createFlowStep, setCreateFlowStep] = useState<1 | 2 | 3>(1)
  const [templateType, setTemplateType] = useState<'default' | 'catalogue' | 'calling_permissions_request'>('default')
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'draft'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [localMediaPreviewUrl, setLocalMediaPreviewUrl] = useState('')
  const itemsPerPage = 10

  const isHealthcareProject = vertical === 'healthcare'
  const isHealthcareCategory =
    isHealthcareProject && categoryFilter === HEALTHCARE_TEMPLATES_CATEGORY

  const [healthcareLoading, setHealthcareLoading] = useState(false)
  const [healthcareInstalling, setHealthcareInstalling] = useState(false)
  const [healthcarePresets, setHealthcarePresets] = useState<HealthcareTemplatePreset[]>([])
  const [healthcareWaConnected, setHealthcareWaConnected] = useState(false)
  const [healthcarePackMessage, setHealthcarePackMessage] = useState<string | null>(null)
  const [healthcarePackError, setHealthcarePackError] = useState<string | null>(null)
  const [creatingPresetName, setCreatingPresetName] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (isCreatePage && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const editId = urlParams.get('edit')
      if (editId) {
        setEditingTemplateId(editId)
      }
    }
  }, [isCreatePage])

  useEffect(() => {
    if (editingTemplateId && templates.length > 0) {
      const t = templates.find(t => t._id === editingTemplateId)
      if (t) {
        const rawButtons = t.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || (t as any).buttons || []
        const mappedButtons = rawButtons.map((b: any, idx: number) => ({
          ...b,
          id: b.id || `btn_${idx}`,
          value: b.url || b.phone_number || b.value || ''
        }))
        
        setFormData({
          name: t.name || '',
          language: t.language || 'en',
          category: t.category || 'utility',
          authUseCase: 'login_otp',
          authAutoFillEnabled: false,
          appPackageName: '',
          appSignatureHash: '',
          content: t.components?.find((c: any) => c.type === 'BODY')?.text || '',
          hasMedia: t.hasMedia || false,
          mediaType: t.mediaType || 'image',
          mediaUrl: t.mediaUrl || '',
          mediaFile: null,
          mediaInputType: 'url',
          headerText: t.components?.find((c: any) => c.type === 'HEADER' && c.format === 'TEXT')?.text || t.headerText || '',
          footerText: t.components?.find((c: any) => c.type === 'FOOTER')?.text || t.footerText || '',
          buttons: mappedButtons,
          variableType: 'Number',
          mediaSample: (t as any).mediaSample || (t.hasMedia ? t.mediaType?.toLowerCase() : 'none'),
          messageValidityEnabled: (t as any).messageValidityEnabled || false,
          messageValidityPeriod: (t as any).messageValidityPeriod || '10_minutes',
          variableSamples: (t as any).variableSamples || [],
          variableConfig: (t as any).variableConfig || [],
        } as any)
        if ((t as any).templateType) setTemplateType((t as any).templateType as any)
        setCreateFlowStep(2)
      }
    }
  }, [editingTemplateId, templates])

  // Get settings context to connect buttons to topbar
  const { setShowSyncButton, setShowCreateButton, setSyncClick, setCreateClick, setIsSyncing: setContextIsSyncing } = useSettings()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    language: 'en',
    category: TemplateCategory.UTILITY,
    authUseCase: 'login_otp',
    authAutoFillEnabled: false,
    appPackageName: '',
    appSignatureHash: '',
    content: '',
    hasMedia: false,
    mediaType: 'image',
    mediaUrl: '',
    mediaFile: null,
    mediaInputType: 'url',
    headerText: '',
    footerText: '',
    buttons: [],
    variableType: 'Number',
    mediaSample: 'none',
    messageValidityEnabled: false,
    messageValidityPeriod: '10_minutes',
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

  useEffect(() => {
    if (formData.mediaFile) {
      const objectUrl = URL.createObjectURL(formData.mediaFile)
      setLocalMediaPreviewUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setLocalMediaPreviewUrl('')
  }, [formData.mediaFile])

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
        // sendSuccess wraps in { success, data: { templates, stats } }
        const payload = data.data || data
        if (Array.isArray(payload)) {
          templatesList = payload
        } else if (payload.templates && Array.isArray(payload.templates)) {
          templatesList = payload.templates
        } else if (payload.data && Array.isArray(payload.data)) {
          templatesList = payload.data
        }
        
        setTemplates(templatesList)

        // Calculate stats from returned stats or compute locally
        const returnedStats = payload.stats
        const stats = returnedStats || {
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
  const canSaveTemplate = useMemo(() => {
    if (!formData.name?.trim() || !formData.content?.trim()) return false
    if (formData.category === 'authentication' && !isValidAuthOtpBody(formData.content)) {
      return false
    }
    if (!validateMetaVariables(formData.content).isValid) {
      return false
    }
    return true
  }, [formData.name, formData.content, formData.category])

  const createTemplate = async () => {
    try {
      if (formData.category === 'authentication' && !isValidAuthOtpBody(formData.content)) {
        alert('Authentication templates must include exactly one {{1}} variable for the OTP code.')
        return
      }

      const metaValidation = validateMetaVariables(formData.content)
      if (!metaValidation.isValid) {
        alert(metaValidation.error)
        return
      }

      const isAuth = formData.category === 'authentication'
      let finalData: any = {
        ...formData,
        category: formData.category.toUpperCase(),
        projectId,
        templateType,
        ...(isAuth
          ? {
              hasMedia: false,
              mediaSample: 'none',
              mediaUrl: '',
              mediaFile: null,
              headerText: '',
              footerText: '',
              buttons: [],
            }
          : {}),
      }
      
      // If using file upload, create FormData to send file
      if (formData.hasMedia && formData.mediaInputType === 'file' && formData.mediaFile) {
        const formDataToSend = new FormData()
        formDataToSend.append('name', formData.name)
        formDataToSend.append('language', formData.language)
        formDataToSend.append('category', formData.category.toUpperCase())
        formDataToSend.append('content', formData.content)
        formDataToSend.append('hasMedia', String(formData.hasMedia))
        formDataToSend.append('mediaType', formData.mediaType)
        formDataToSend.append('headerText', formData.headerText)
        formDataToSend.append('footerText', formData.footerText)
        formDataToSend.append('projectId', projectId)
        formDataToSend.append('templateType', templateType)
        formDataToSend.append('mediaSample', formData.mediaSample || 'none')
        formDataToSend.append('variableType', formData.variableType || 'Number')
        formDataToSend.append('messageValidityEnabled', String(!!formData.messageValidityEnabled))
        formDataToSend.append('messageValidityPeriod', formData.messageValidityPeriod || '10_minutes')
        formDataToSend.append('buttons', JSON.stringify(formData.buttons || []))
        if (formData.variableSamples?.length) {
          formDataToSend.append('variableSamples', JSON.stringify(formData.variableSamples))
        }
        if (formData.variableConfig?.length) {
          formDataToSend.append('variableConfig', JSON.stringify(formData.variableConfig))
        }
        formDataToSend.append('mediaFile', formData.mediaFile)
        
        const url = editingTemplateId ? `${API_URL}/templates/${editingTemplateId}` : `${API_URL}/templates`
        const method = editingTemplateId ? 'PUT' : 'POST'
        const response = await fetch(url, {
          method,
          headers: {
            ...(authService.getToken() && { 'Authorization': `Bearer ${authService.getToken()}` })
          },
          body: formDataToSend,
        })

        const result = await response.json()
        if (response.ok) {
          alert((result.data?.message || result.message) ?? 'Template saved as draft!')
          fetchTemplates()
          closeModal()
        } else {
          alert(result.message || result.error || "Failed to create template")
        }
      } else {
        // Send as JSON if using URL
        const url = editingTemplateId ? `${API_URL}/templates/${editingTemplateId}` : `${API_URL}/templates`
        const method = editingTemplateId ? 'PUT' : 'POST'
        const response = await fetch(url, {
          method,
          headers: getHeaders(),
          body: JSON.stringify(finalData),
        })

        const result = await response.json()
        if (response.ok) {
          alert((result.data?.message || result.message) ?? 'Template saved as draft!')
          fetchTemplates()
          closeModal()
        } else {
          alert(result.message || result.error || "Failed to create template")
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

  const handleDuplicate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to duplicate this template?")) return

    try {
      const response = await fetch(`${API_URL}/templates/${templateId}/duplicate?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
      })

      if (response.ok) {
        alert("✅ Template duplicated successfully!")
        fetchTemplates()
      } else {
        const result = await response.json()
        alert(`❌ Failed to duplicate template: ${result.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error duplicating template:", error)
      alert("❌ Failed to duplicate template. Please try again.")
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
        const submitPayload = result.data || result
        const submittedMetaId = submitPayload.metaTemplateId || submitPayload.template?.metaTemplateId || 'N/A'

        // Auto-sync immediately so status updates quickly after submit
        const syncResponse = await fetch(`${API_URL}/templates/sync?projectId=${projectId}`, {
          method: 'POST',
          headers: getHeaders(),
        })
        const syncResult = await syncResponse.json()
        const syncPayload = syncResult.data || syncResult

        if (syncResponse.ok) {
          alert(`✅ Template submitted to Meta successfully!\nTemplate ID: ${submittedMetaId}\n\n🔄 Synced: ${syncPayload.synced ?? 0} (Created: ${syncPayload.created ?? 0}, Updated: ${syncPayload.updated ?? 0})`)
        } else {
          alert(`✅ Template submitted to Meta successfully!\nTemplate ID: ${submittedMetaId}\n\n⚠️ Auto-sync failed. Please click Sync.`)
        }

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
      const response = await fetch(`${API_URL}/templates/sync?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
      })

      const result = await response.json()
      if (response.ok) {
        const payload = result.data || result
        alert(`✅ ${result.message || 'Templates synced'}\n\n📊 Created: ${payload.created ?? 0}\n🔄 Updated: ${payload.updated ?? 0}\n📈 Total Synced: ${payload.synced ?? 0}`)
        await fetchTemplates()
        if (isHealthcareCategory) {
          await loadHealthcarePack()
        }
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
    router.push(`/projects/${projectId}/templates/create`)
  }

  const openViewModal = (template: Template) => {
    setSelectedTemplate(template)
    setShowViewModal(true)
  }

  const closeModal = () => {
    if (isCreatePage) {
      router.push(`/projects/${projectId}/templates`)
      return
    }
    setShowModal(false)
    setShowViewModal(false)
    setSelectedTemplate(null)
    setCreateFlowStep(1)
  }

  useEffect(() => {
    fetchTemplates()
  }, [projectId])

  const healthcareCategoryDefaulted = useRef(false)
  useEffect(() => {
    if (isHealthcareProject && !healthcareCategoryDefaulted.current) {
      setCategoryFilter(HEALTHCARE_TEMPLATES_CATEGORY)
      healthcareCategoryDefaulted.current = true
    }
  }, [isHealthcareProject])

  const loadHealthcarePack = async () => {
    if (!isHealthcareProject) return
    try {
      setHealthcareLoading(true)
      setHealthcarePackError(null)
      const [presetList, phone] = await Promise.all([
        fetchHealthcareTemplatePresets(projectId),
        fetchProjectWhatsAppStatus(projectId),
      ])
      setHealthcarePresets(presetList)
      setHealthcareWaConnected(phone.whatsappConnected)
    } catch (e) {
      setHealthcarePackError(e instanceof Error ? e.message : 'Failed to load healthcare pack')
    } finally {
      setHealthcareLoading(false)
    }
  }

  useEffect(() => {
    if (isHealthcareCategory) {
      loadHealthcarePack()
    }
  }, [isHealthcareCategory, projectId])

  const healthcarePackRows = useMemo(() => {
    if (!isHealthcareCategory) return []
    return mergePackWithTemplates(healthcarePresets, templates)
  }, [isHealthcareCategory, healthcarePresets, templates])

  const healthcareReadiness = useMemo(() => packReadiness(healthcarePackRows), [healthcarePackRows])

  const healthcareDisplayTemplates = useMemo((): Template[] => {
    if (!isHealthcareCategory) return []
    const q = searchQuery.trim().toLowerCase()

    return healthcarePackRows
      .filter(({ preset, status }) => {
        const matchesSearch =
          !q ||
          preset.name.toLowerCase().includes(q) ||
          preset.recommendedTemplateName.toLowerCase().includes(q) ||
          preset.sampleMessage.toLowerCase().includes(q) ||
          preset.triggerEvents.some((e) => e.toLowerCase().includes(q))
        const matchesStatus =
          statusFilter === 'all' ||
          status === statusFilter ||
          (statusFilter === 'draft' && status === 'missing')
        return matchesSearch && matchesStatus
      })
      .map(({ preset, status, existing }) => {
        const account = existing?._id
          ? templates.find((t) => t._id === existing._id && t.name === preset.recommendedTemplateName)
          : null

        if (account) {
          return {
            ...account,
            triggerEvents: preset.triggerEvents,
            presetLabel: preset.name,
            isPresetPreview: false,
          }
        }

        return {
          _id: `preset-${preset.key}`,
          name: preset.recommendedTemplateName,
          language: 'en',
          category: TemplateCategory.UTILITY,
          content: preset.sampleMessage,
          status: TemplateStatus.DRAFT,
          variables: preset.variables.map((_, i) => String(i + 1)),
          projectId,
          createdAt: '',
          updatedAt: '',
          isPresetPreview: true,
          triggerEvents: preset.triggerEvents,
          presetLabel: preset.name,
        }
      })
  }, [
    isHealthcareCategory,
    healthcarePackRows,
    templates,
    searchQuery,
    statusFilter,
    projectId,
  ])

  const handleInstallHealthcarePack = async () => {
    try {
      setHealthcareInstalling(true)
      setHealthcarePackMessage(null)
      setHealthcarePackError(null)
      const result = await installHealthcareTemplatePack(projectId)
      if (result.created.length > 0) {
        setHealthcarePackMessage(`Created ${result.created.length} draft(s). View preview, then submit to Meta.`)
      } else {
        setHealthcarePackMessage('All pack templates exist. Submit drafts or sync status.')
      }
      if (result.errors.length > 0) {
        setHealthcarePackError(result.errors.map((e) => `${e.name}: ${e.message}`).join(' · '))
      }
      await fetchTemplates()
      await loadHealthcarePack()
    } catch (e) {
      setHealthcarePackError(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setHealthcareInstalling(false)
    }
  }

  const handleCreateHealthcareDraft = async (preset: HealthcareTemplatePreset) => {
    try {
      setCreatingPresetName(preset.recommendedTemplateName)
      await createDraftTemplate(projectId, preset)
      setHealthcarePackMessage(`Draft created: ${preset.recommendedTemplateName}`)
      await fetchTemplates()
      await loadHealthcarePack()
    } catch (e) {
      setHealthcarePackError(e instanceof Error ? e.message : 'Create draft failed')
    } finally {
      setCreatingPresetName(null)
    }
  }

  const openTemplateView = (template: Template) => {
    setSelectedTemplate(template)
    setShowViewModal(true)
  }

  // Filter templates
  const filteredTemplates = Array.isArray(templates)
    ? templates.filter((template) => {
        const matchesSearch =
          template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.category?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus =
          statusFilter === 'all' || template.status?.toLowerCase() === statusFilter.toLowerCase()

        let matchesCategory = categoryFilter === 'all'
        if (categoryFilter === HEALTHCARE_TEMPLATES_CATEGORY) {
          matchesCategory = isHealthcarePackTemplateName(template.name)
        } else if (categoryFilter !== 'all') {
          matchesCategory = template.category === categoryFilter
        }

        return matchesSearch && matchesStatus && matchesCategory
      })
    : []

  const tableTemplates = isHealthcareCategory ? healthcareDisplayTemplates : filteredTemplates
  const tableLoading = isHealthcareCategory ? healthcareLoading : isLoading

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

  const renderMetaMobilePreview = (isLive = false) => {
    let liveContent = formData.content?.trim() || ''
    
    if (formData.variableSamples && formData.variableSamples.length > 0) {
      liveContent = liveContent.replace(/\{\{(\d+)\}\}/g, (match, num) => {
        const index = parseInt(num) - 1;
        return formData.variableSamples?.[index] ? formData.variableSamples[index] : match;
      });
    }

    const liveFooter = formData.footerText?.trim()
    const liveHeader = formData.headerText?.trim()
    const liveImage = localMediaPreviewUrl || formData.mediaUrl?.trim()
    const quickButtons = (formData.buttons || []).slice(0, 2)

    const buttonLabel1 = quickButtons[0]?.text?.trim()
    const buttonLabel2 = quickButtons[1]?.text?.trim()

    return (
    <div className="w-full flex flex-col items-center mt-2">
      <h4 className="font-semibold text-gray-900 mb-4 self-start">Template preview</h4>
      
      {/* Mobile Screen Mockup */}
      <div className="relative w-[320px] h-[650px] border-[12px] border-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden bg-[#ece5dd]">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-3xl mx-auto w-32 z-20"></div>
        
        {/* WhatsApp Header Mockup */}
        <div className="bg-[#008069] text-white px-3 py-3 flex items-center gap-2 pt-8 relative z-10 shadow-sm">
           <div className="text-white">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
           </div>
           <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
             <img src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80" alt="Business" className="w-full h-full object-cover" />
           </div>
           <div>
             <div className="text-[13px] font-semibold leading-tight">Business Account</div>
             <div className="text-[10px] text-gray-200">bot</div>
           </div>
        </div>

        {/* WhatsApp Chat Background */}
        <div 
          className="p-3 h-[calc(100%-4rem)] overflow-y-auto pb-20 relative z-10" 
          style={{ 
            backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', 
            backgroundSize: 'cover' 
          }}
        >
          {/* Message Bubble */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4 relative max-w-[92%] rounded-tl-none">
            {/* Small tail on the bubble */}
            <div className="absolute top-0 -left-2 w-2 h-3 bg-white" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
          {formData.category === 'marketing' && templateType === 'default' && (
            <>
              {(!isLive || (formData.hasMedia && formData.mediaType?.toLowerCase() === 'image')) && (
                <img
                  src={isLive && liveImage ? liveImage : "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&q=80"}
                  alt="Media preview"
                  className="w-full h-auto max-h-[300px] object-cover bg-gray-50"
                />
              )}
              {isLive && formData.hasMedia && formData.mediaType?.toLowerCase() === 'video' && (
                <div className="relative w-full bg-gray-900 flex items-center justify-center overflow-hidden">
                  {liveImage ? <img src={liveImage} className="w-full h-auto max-h-[300px] object-cover opacity-60" /> : <div className="w-full h-[150px] bg-gray-800" />}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                    </div>
                  </div>
                </div>
              )}
              {isLive && formData.hasMedia && formData.mediaType?.toLowerCase() === 'document' && (
                <div className="w-full bg-white rounded-t-lg overflow-hidden border-b border-gray-100 flex flex-col">
                  {liveImage ? (
                    <iframe 
                      src={`${liveImage}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                      className="w-full h-[250px]" 
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="w-full h-[150px] bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      No PDF selected
                    </div>
                  )}
                </div>
              )}
              <div className="px-3 py-2">
                {isLive && liveHeader && <p className="text-[11px] text-gray-500 leading-snug mb-1">{liveHeader}</p>}
                <p className="text-[12px] text-gray-800 leading-snug whitespace-pre-wrap">
                  {isLive && liveContent ? formatWhatsAppText(liveContent) : 'Hey there! Check out our fresh groceries now!'}
                </p>
                {!isLive && <p className="text-[12px] text-gray-800 leading-snug mt-1.5">Use code <span className="font-bold">HEALTH</span> to get additional 10% off on your entire purchase.</p>}
                {isLive && liveFooter && <p className="text-[11px] text-gray-500 leading-snug mt-1.5">{liveFooter}</p>}
                <p className="text-[10px] text-gray-400 text-right mt-1.5">11:59 ✓✓</p>
              </div>
              <div className="border-t border-gray-100">
                {isLive && formData.buttons && formData.buttons.length > 0 ? (
                  formData.buttons.slice(0, 3).map((btn, i) => (
                    <div key={btn.id || i}>
                      {i > 0 && <div className="border-t border-gray-100" />}
                      <button className="w-full py-1.5 text-[12px] font-semibold" style={{ color: '#0096de' }}>
                        {btn.type === 'URL' ? '↗' : btn.type === 'PHONE_NUMBER' ? '📞' : '↩'}{' '}
                        {btn.text?.trim() || 'Button'}
                      </button>
                    </div>
                  ))
                ) : (
                  <>
                    <button className="w-full py-1.5 text-[12px] font-semibold" style={{ color: '#0096de' }}>↗ {buttonLabel1 || 'Shop now'}</button>
                    <div className="border-t border-gray-100" />
                    <button className="w-full py-1.5 text-[12px] font-semibold" style={{ color: '#0096de' }}>📋 {buttonLabel2 || 'Copy code'}</button>
                  </>
                )}
                {isLive && formData.buttons && formData.buttons.length > 3 && (
                  <div>
                    <div className="border-t border-gray-100" />
                    <button className="w-full py-1.5 text-[12px] font-semibold text-gray-500">See all options</button>
                  </div>
                )}
              </div>
            </>
          )}

          {formData.category === 'marketing' && templateType === 'catalogue' && (
            <>
              <div className="flex items-start gap-2 p-2 border-b border-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=120&q=80"
                  alt="Catalog thumbnail"
                  className="w-12 h-12 object-cover rounded"
                />
                <div>
                  <p className="text-[11px] font-bold text-gray-900 leading-tight">View Jasper Market&apos;s Catalog on WhatsApp</p>
                  <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Browse pictures and details of our offerings.</p>
                </div>
              </div>
              <div className="px-3 py-2">
                <p className="text-[12px] text-gray-800 leading-snug whitespace-pre-wrap">{isLive && liveContent ? formatWhatsAppText(liveContent) : 'Discover our latest products and bestsellers in our catalog. Browse and shop with ease on WhatsApp #happyshopping!'}</p>
                <p className="text-[10px] text-gray-400 text-right mt-1.5">11:59 ✓✓</p>
              </div>
              <div className="border-t border-gray-100">
                <button className="w-full py-1.5 text-[12px] font-semibold" style={{ color: '#0096de' }}>View catalog</button>
              </div>
            </>
          )}

          {((formData.category === 'marketing' && templateType === 'calling_permissions_request') || (formData.category === 'utility' && templateType === 'calling_permissions_request')) && (
            <>
              <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#e8f5e9' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#25d366' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-gray-900 leading-tight">Can Jasper&apos;s Market call you?</p>
                  <p className="text-[11px] text-gray-600 leading-snug mt-0.5">You can update your preference anytime in the business profile.</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-right px-3 pb-1">11:57 ✓✓</p>
              <div className="border-t border-gray-100">
                <button className="w-full py-1.5 text-[12px] font-semibold" style={{ color: '#25d366' }}>Choose preference ▾</button>
              </div>
            </>
          )}

          {formData.category === 'utility' && templateType === 'default' && (
            <>
              <div className="px-3 py-2">
                <p className="text-[12px] text-gray-800 leading-snug whitespace-pre-wrap">{isLive && liveContent ? formatWhatsAppText(liveContent) : 'Good news! Your order 23KFEJJ2312 has shipped!\n\nHere\'s your tracking information, please check link below.'}</p>
                {isLive && liveFooter && <p className="text-[11px] text-gray-500 leading-snug mt-1.5">{liveFooter}</p>}
                <p className="text-[10px] text-gray-400 text-right mt-1.5">11:59 ✓✓</p>
              </div>
              <div className="border-t border-gray-100">
                <button className="w-full py-1.5 text-[12px] font-semibold" style={{ color: '#0096de' }}>{buttonLabel1 || 'Track shipment'}</button>
              </div>
            </>
          )}

          {formData.category === 'authentication' && (
            <>
              <div className="px-3 py-2">
                <p className="text-[12px] text-gray-800 leading-snug whitespace-pre-wrap">{isLive && liveContent ? formatWhatsAppText(liveContent) : '123456 is your verification code. For your security, do not share this code.'}</p>
                <p className="text-[10px] text-gray-400 text-right mt-1.5">11:59 ✓✓</p>
              </div>
              <div className="border-t border-gray-100">
                <button className="w-full py-1.5 text-[12px] font-semibold" style={{ color: '#0096de' }}>📋 {buttonLabel1 || 'Copy code'}</button>
              </div>
            </>
          )}
          </div>
        </div>
        
        {/* WhatsApp Footer Mockup */}
        <div className="absolute bottom-0 inset-x-0 bg-[#f0f2f5] p-2 flex items-center gap-2 z-10">
          <div className="flex-1 bg-white rounded-full px-4 py-2 text-gray-400 text-sm flex items-center">
            Message
          </div>
          <div className="w-10 h-10 bg-[#008069] rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </div>
        </div>
      </div>
    </div>
    )
  }


  const createFormContent = (
    <>
      <div className="flex items-center justify-between pb-4 mb-2 flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {isCreatePage && (
            <button
              onClick={() => router.push(`/projects/${projectId}/templates`)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center w-8 h-8 bg-white rounded-lg border border-gray-200 shadow-sm transition-colors"
              title="Back to templates"
            >
              ←
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create template</h2>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className={`font-medium ${createFlowStep === 1 ? 'text-blue-600' : 'text-gray-500'}`}>1. Set up template</span>
              <span className="text-gray-300">•</span>
              <span className={`font-medium ${createFlowStep === 2 ? 'text-blue-600' : 'text-gray-500'}`}>2. Edit template</span>
              <span className="text-gray-300">•</span>
              <span className={`font-medium ${createFlowStep === 3 ? 'text-blue-600' : 'text-gray-500'}`}>3. Submit for review</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => isCreatePage ? router.push(`/projects/${projectId}/templates`) : closeModal()} className="border-gray-300">Discard</Button>
          {createFlowStep === 2 && (
            <Button variant="outline" onClick={() => setCreateFlowStep(1)} className="border-gray-300">Back</Button>
          )}
          {createFlowStep === 1 ? (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setCreateFlowStep(2)}>Next</Button>
          ) : (
            <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold" onClick={createTemplate} disabled={!canSaveTemplate}>
              Create Template
            </Button>
          )}
          {!isCreatePage && (
            <button onClick={() => closeModal()} className="p-2 hover:bg-gray-100 rounded-lg transition ml-2">
              <X className="h-6 w-6 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto pb-6 pr-8">
          {createFlowStep === 1 ? (
            <div className="py-2">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Set up your template</h3>
              <p className="text-sm text-gray-600 mb-6">Choose the category that best describes your template, then choose the type.</p>

              <div className="grid grid-cols-3 border border-gray-300 rounded-lg overflow-hidden mb-6">
                {[
                  { id: 'marketing', label: 'Marketing' },
                  { id: 'utility', label: 'Utility' },
                  { id: 'authentication', label: 'Authentication' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (c.id === 'authentication') {
                        setFormData({
                          ...formData,
                          category: c.id as any,
                          authUseCase: 'custom_otp',
                          authAutoFillEnabled: false,
                          appPackageName: '',
                          appSignatureHash: '',
                          content: AUTH_OTP_BODY_PRESETS.custom_otp,
                          variableType: 'Number',
                          hasMedia: false,
                          mediaSample: 'none',
                          mediaUrl: '',
                          mediaFile: null,
                          headerText: '',
                          footerText: '',
                          buttons: [],
                        })
                      } else {
                        setFormData((p) => ({ ...p, category: c.id, templateType: 'default' }))
                      }
                      setTemplateType('default')
                    }}
                    className={`py-3 text-sm font-semibold transition-colors ${formData.category === c.id ? 'bg-[#e7f1ff] text-blue-800' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Choose a template type</h4>
                
                <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${templateType === 'default' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="templateType" checked={templateType === 'default'} onChange={() => setTemplateType('default')} className="mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Standard</p>
                    <p className="text-sm text-gray-600 mt-1">Send a message with text, media and buttons.</p>
                  </div>
                </label>

                {formData.category === 'marketing' && (
                  <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${templateType === 'catalogue' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="templateType" checked={templateType === 'catalogue'} onChange={() => setTemplateType('catalogue')} className="mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Catalog</p>
                      <p className="text-sm text-gray-600 mt-1">Send a message with a catalog.</p>
                    </div>
                  </label>
                )}

                {(formData.category === 'marketing' || formData.category === 'utility') && (
                  <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${templateType === 'calling_permissions_request' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="templateType" checked={templateType === 'calling_permissions_request'} onChange={() => setTemplateType('calling_permissions_request')} className="mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Calling permissions request</p>
                      <p className="text-sm text-gray-600 mt-1">Ask customers if you can call them on WhatsApp.</p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="">
              <TemplateEditForm
                formData={formData as unknown as TemplateFormData}
                setFormData={(d) => setFormData(d as unknown as FormData)}
                category={formData.category}
                templateType={templateType}
              />
            </div>
          )}
        </div>

        <div className="w-[360px] flex-shrink-0 relative">
          <div className="sticky top-6 bg-transparent pb-10">
            {renderMetaMobilePreview(createFlowStep !== 1)}
          </div>
        </div>
      </div>
    </>
  );

  if (isCreatePage) {
    return (
      <div className="flex flex-col w-full h-full min-h-screen px-4 pb-12">
        <div className="w-full flex flex-col">
          {createFormContent}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 mt-4 px-4">
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
        <div className="w-64">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm bg-white"
          >
            <option value="all">All Categories</option>
            {['Trending', 'General', 'Top Rated', 'Ecommerce', 'Education', 'Banking', 'Webinar', 'Healthcare', 'Automobile', 'Real Estate', 'Services', 'Non profit'].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
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


        {/* Right Content - Templates Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]">
            {isHealthcareCategory ? (
              <HealthcareTemplatesInstructions
                projectId={projectId}
                waConnected={healthcareWaConnected}
                approved={healthcareReadiness.approved}
                total={healthcareReadiness.total}
                missing={healthcareReadiness.missing}
                ready={healthcareReadiness.ready}
                loading={healthcareLoading}
                installing={healthcareInstalling}
                syncing={isSyncing}
                message={healthcarePackMessage}
                error={healthcarePackError}
                onInstallPack={handleInstallHealthcarePack}
                onSync={syncTemplatesFromWhatsApp}
              />
            ) : null}

            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="w-full min-w-[920px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-[1]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Type</th>
                    {isHealthcareCategory ? (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap min-w-[140px]">Triggers</th>
                    ) : (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Health</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan={isHealthcareCategory ? 7 : 7} className="px-6 py-10 text-center text-gray-500">
                        Loading templates…
                      </td>
                    </tr>
                  ) : tableTemplates.length > 0 ? (
                    (isHealthcareCategory
                      ? tableTemplates
                      : tableTemplates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    ).map((template) => (
                      <tr key={template._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          <span className="block">{template.name}</span>
                          {template.presetLabel ? (
                            <span className="text-xs font-normal text-gray-500">{template.presetLabel}</span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{template.category}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            template.isPresetPreview
                              ? "bg-violet-100 text-violet-800"
                              : template.status === TemplateStatus.APPROVED
                              ? "bg-green-100 text-green-700"
                              : template.status === TemplateStatus.PENDING
                              ? "bg-orange-100 text-orange-700"
                              : template.status === TemplateStatus.REJECTED
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {template.isPresetPreview ? 'preset preview' : template.status}
                          </span>
                          {template.rejectedReason ? (
                            <p className="mt-1 max-w-[200px] truncate text-[10px] text-rose-600" title={template.rejectedReason}>
                              {template.rejectedReason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{template.language}</td>
                        {isHealthcareCategory ? (
                          <td className="px-6 py-4 text-xs text-gray-500 max-w-[220px]">
                            {template.triggerEvents?.length ? template.triggerEvents.join(', ') : '—'}
                          </td>
                        ) : (
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              High
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {template.isPresetPreview ? '—' : formatDate(template.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <div className="flex gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => openTemplateView(template)}
                              className="text-blue-600 hover:text-blue-800"
                              title="View & preview"
                            >
                              <Eye size={16} />
                            </button>
                            {template.isPresetPreview ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const preset = healthcarePresets.find(
                                    (p) => p.recommendedTemplateName === template.name,
                                  )
                                  if (preset) handleCreateHealthcareDraft(preset)
                                }}
                                disabled={creatingPresetName === template.name}
                                className="text-xs font-semibold text-violet-600 hover:text-violet-800"
                              >
                                {creatingPresetName === template.name ? '…' : 'Create draft'}
                              </button>
                            ) : (
                              <>
                                {template.status === TemplateStatus.DRAFT && (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/projects/${projectId}/templates/create?edit=${template._id}`)}
                                    className="text-amber-500 hover:text-amber-600"
                                    title="Edit Draft"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(template._id)}
                                  className="text-indigo-500 hover:text-indigo-600"
                                  title="Duplicate Template"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => submitTemplateToMeta(template._id)}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-40"
                                  title="Submit to Meta"
                                  disabled={template.status === TemplateStatus.APPROVED}
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteTemplate(template._id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        {isHealthcareCategory
                          ? 'No healthcare presets match this filter.'
                          : 'No templates found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isHealthcareCategory && filteredTemplates.length > itemsPerPage && (
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
      {/* View Modal */}
      {showViewModal && selectedTemplate && (() => {
        const t = selectedTemplate
        const bodyComp   = t.components?.find((c: any) => c.type === 'BODY')
        const footerComp = t.components?.find((c: any) => c.type === 'FOOTER')
        const buttonsComp = t.components?.find((c: any) => c.type === 'BUTTONS')
        const { headerText, hasImage, hasVideo, hasDoc, mediaUrl } = resolveTemplateHeaderDisplay(t)
        const bodyText   = bodyComp?.text || t.content || ''
        const footerText = footerComp?.text || t.footerText || ''
        const buttons    = buttonsComp?.buttons || []
        const statusColors: Record<string, string> = {
          approved: 'bg-green-100 text-green-700',
          pending:  'bg-orange-100 text-orange-700',
          rejected: 'bg-red-100 text-red-700',
          draft:    'bg-gray-100 text-gray-600',
        }
        const isPresetPreview = Boolean(t.isPresetPreview || t._id.startsWith('preset-'))
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{t.name}</h2>
                  <p className="text-xs text-gray-500 capitalize">{t.category} • {t.language?.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${isPresetPreview ? 'bg-violet-100 text-violet-800' : statusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
                  {isPresetPreview ? 'preset preview' : t.status}
                </span>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body: info left + preview right */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: template info */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {isPresetPreview ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                    <p className="font-semibold">Healthcare preset preview</p>
                    <p className="mt-1 text-violet-800">
                      Sample message before install. Click <strong>Create draft</strong> in the table, then submit to Meta.
                    </p>
                    {t.triggerEvents && t.triggerEvents.length > 0 ? (
                      <p className="mt-2 text-xs text-violet-700">
                        Triggers: {t.triggerEvents.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {/* Rejection banner */}
                {t.status === TemplateStatus.REJECTED && t.rejectedReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-red-800">Rejected by Meta</p>
                      <p className="text-sm text-red-700 mt-0.5">{t.rejectedReason}</p>
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Usage Count', value: `${t.usageCount || 0} times` },
                    { label: 'Last Used', value: formatDate(t.lastUsedAt) },
                    { label: 'Created', value: formatDate(t.createdAt) },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Header section */}
                {(headerText || hasImage || hasVideo || hasDoc) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Header</p>
                    {headerText && (
                      <div className="bg-gray-50 rounded-xl p-3 text-sm font-medium text-gray-800">{headerText}</div>
                    )}
                    {(hasImage || hasVideo || hasDoc) && (
                      <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-2xl shrink-0">{hasImage ? '🖼️' : hasVideo ? '🎬' : '📄'}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 capitalize truncate">{t.mediaType} attachment</p>
                            {t.mediaFileName && <p className="text-xs text-gray-500 mt-0.5 truncate" title={t.mediaFileName}>{t.mediaFileName}</p>}
                          </div>
                        </div>
                        {mediaUrl && (
                          <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                            className="ml-2 shrink-0 text-xs text-blue-600 hover:underline font-medium">
                            Open Full ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Body */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message Body</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {formatWhatsAppText(bodyText)}
                  </div>
                </div>

                {/* Footer */}
                {footerText && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Footer</p>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500 italic">{footerText}</div>
                  </div>
                )}

                {/* Buttons */}
                {buttons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Buttons</p>
                    <div className="space-y-2">
                      {buttons.map((btn: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                          <span className="text-base">
                            {btn.type === 'URL' ? '↗' : btn.type === 'PHONE_NUMBER' ? '📞' : '↩'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{btn.text}</p>
                            {(btn.url || btn.phone_number) && (
                              <p className="text-xs text-gray-500">{btn.url || btn.phone_number}</p>
                            )}
                          </div>
                          <span className="ml-auto text-xs text-gray-400 capitalize">{btn.type?.replace('_', ' ').toLowerCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variables */}
                {t.variables && t.variables.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Variables</p>
                    <div className="flex gap-2 flex-wrap">
                      {t.variables.map((v: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-mono font-semibold">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: WhatsApp bubble preview */}
              <div className="w-[320px] flex-shrink-0 bg-[#f2f5fb] border-l border-gray-100 flex flex-col items-center pt-8 px-4 overflow-y-auto pb-8">
                <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wide">Preview</p>
                <div className="w-full rounded-2xl bg-[#ece5dd] p-2.5 shadow-inner">
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* Image header */}
                    {hasImage && mediaUrl && (
                      <img src={mediaUrl} alt="header" className="w-full max-h-[160px] object-cover" />
                    )}
                    {hasImage && !mediaUrl && (
                      <div className="w-full h-[110px] bg-gray-100 flex items-center justify-center text-3xl">🖼️</div>
                    )}
                    {hasVideo && mediaUrl && (
                      <video src={mediaUrl} controls className="w-full max-h-[160px] bg-black object-cover" />
                    )}
                    {hasVideo && !mediaUrl && (
                      <div className="w-full h-[110px] bg-gray-800 flex items-center justify-center">
                        <span className="text-3xl">▶️</span>
                      </div>
                    )}
                    {hasDoc && mediaUrl && (
                      <div className="w-full bg-gray-50 border-b border-gray-100 flex flex-col items-center justify-center p-0">
                        <iframe src={mediaUrl} title="Document Preview" className="w-full h-[160px] border-none pointer-events-auto" />
                      </div>
                    )}
                    {hasDoc && !mediaUrl && (
                      <div className="w-full bg-gray-50 border-b border-gray-100 px-3 py-2.5 flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        <p className="text-xs text-gray-600 truncate">{t.mediaFileName || 'Document'}</p>
                      </div>
                    )}
                    <div className="px-3 py-2">
                      {headerText && <p className="text-[11px] font-semibold text-gray-700 mb-1">{headerText}</p>}
                      <p className="text-[12px] text-gray-800 leading-snug whitespace-pre-wrap">{formatWhatsAppText(bodyText)}</p>
                      {footerText && <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{footerText}</p>}
                      <p className="text-[10px] text-gray-400 text-right mt-1.5">11:59 ✓✓</p>
                    </div>
                    {buttons.length > 0 && (
                      <div className="border-t border-gray-100">
                        {buttons.slice(0, 3).map((btn: any, i: number) => (
                          <div key={i}>
                            {i > 0 && <div className="border-t border-gray-100" />}
                            <p className="w-full py-1.5 text-[12px] font-semibold text-center" style={{ color: '#0096de' }}>
                              {btn.type === 'URL' ? '↗' : btn.type === 'PHONE_NUMBER' ? '📞' : '↩'} {btn.text}
                            </p>
                          </div>
                        ))}
                        {buttons.length > 3 && (
                          <>
                            <div className="border-t border-gray-100" />
                            <p className="w-full py-1.5 text-[11px] text-center text-gray-400">See all options</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta ID if submitted */}
                {t.metaTemplateId && (
                  <div className="mt-4 w-full bg-white rounded-xl p-3 text-center border border-gray-200">
                    <p className="text-xs text-gray-500">Meta Template ID</p>
                    <p className="text-xs font-mono font-semibold text-gray-700 mt-0.5">{t.metaTemplateId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 justify-between items-center">
              <div className="text-xs text-gray-400">
                ID: <span className="font-mono">{t._id}</span>
              </div>
              <div className="flex gap-2">
                {!isPresetPreview && t.status === TemplateStatus.DRAFT && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white text-sm"
                    onClick={() => { closeModal(); submitTemplateToMeta(t._id) }}
                  >
                    Submit to Meta
                  </Button>
                )}
                <Button variant="outline" onClick={closeModal} className="text-sm">Close</Button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}
    </>
  )
}
