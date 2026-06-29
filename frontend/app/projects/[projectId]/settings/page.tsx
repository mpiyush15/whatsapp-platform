"use client"

import { useState, useEffect, useRef, Suspense, lazy } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Phone, CheckCircle, AlertCircle, Settings as SettingsIcon, CreditCard, BarChart3, Headset, Loader, KeyRound, Webhook, Building2, Zap } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSettings } from "@/lib/context/SettingsContext"

// PHASE 5: Dynamic imports for code splitting - reduce initial bundle
const BillingTab = lazy(() => import("@/components/BillingTab"))
const AnalyticsTab = lazy(() => import("@/components/AnalyticsTab"))
const AgentsTab = lazy(() => import("@/components/AgentsTab"))
const QuickRepliesTab = lazy(() => import("@/components/QuickRepliesTab"))

// Loading fallback component for lazy-loaded tabs
function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Type declaration for WhatsApp function on window
declare global {
  interface Window {
    launchWhatsAppSignup?: (callback?: (response: any) => void) => void
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

// Get JWT token from localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token')
  }
  return null
}

// Get headers with auth token
const getHeaders = () => {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

interface Project {
  projectId: string
  name: string
  status: string
  plan: string
  createdAt: string
}

// Settings Tabs - dynamic based on project type
const getSettingsTabs = (businessCategory?: string) => {
  const baseTabs = [
    { id: 'connect-number', label: 'Connect Number', icon: Phone },
    { id: 'quick-replies', label: 'Quick Replies', icon: Zap },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'agents', label: 'Agents', icon: Headset }
  ];

  // Add clinic setup for healthcare projects
  if (businessCategory === 'health') {
    baseTabs.splice(1, 0, { id: 'clinic-setup', label: 'Clinic Setup', icon: Building2 });
  }

  return baseTabs;
};

// Connect Number Tab
function ConnectNumberTab({ projectId }: { projectId: string }) {
  const [connectedPhones, setConnectedPhones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [planLoading, setPlanLoading] = useState(true)
  const [hasActivePlan, setHasActivePlan] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaExceeded, setQuotaExceeded] = useState(false)

  useEffect(() => {
    fetchConnectedPhones()
    fetchPlanAccess()
  }, [projectId])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let parsed: any = event.data
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }
      }

      if (parsed?.type === 'WA_EMBEDDED_SIGNUP' && parsed?.event === 'FINISH') {
        const { waba_id, phone_number_id } = parsed.data || {}
        if (!waba_id || !phone_number_id) {
          console.error('Error: FINISH event missing waba_id or phone_number_id')
          return
        }
        connectWhatsAppWithData(waba_id, phone_number_id)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [projectId])

  const fetchConnectedPhones = async () => {
    try {
      const response = await fetch(
        `${API_URL}/integrations/whatsapp/phones`,
        { headers: getHeaders() }
      )

      if (response.ok) {
        const result = await response.json()
        // API returns { phones: [...] }
        const phones = result.phones || result.phoneNumbers || result.data?.phones || []
        setConnectedPhones(phones)
        setError(null)
      } else {
        const err = await response.json().catch(() => null)
        setError(err?.error || 'Failed to fetch connected phones')
      }
    } catch (err) {
      console.error("Error fetching phones:", err)
      setError("Failed to fetch connected phones")
    } finally {
      setLoading(false)
    }
  }

  const fetchPlanAccess = async () => {
    try {
      setPlanLoading(true)
      const response = await fetch(`${API_URL}/subscriptions/my-subscriptions`, {
        headers: getHeaders(),
      })
      if (!response.ok) {
        setHasActivePlan(false)
        return
      }
      const data = await response.json()
      const subscriptions = data.data?.subscriptions || data.data || []
      setHasActivePlan(
        Array.isArray(subscriptions)
          ? subscriptions.some((sub: any) => String(sub?.status || '').toLowerCase() === 'active')
          : String(subscriptions?.status || '').toLowerCase() === 'active'
      )
    } catch {
      setHasActivePlan(false)
    } finally {
      setPlanLoading(false)
    }
  }

  const connectWhatsAppWithData = async (wabaId: string, phoneNumberId: string) => {
    if (!hasActivePlan) {
      setError('Active plan required. Please upgrade or complete payment before connecting WhatsApp.')
      return
    }
    try {
      setConnecting(true)
      setError(null)

      const response = await fetch(
        `${API_URL}/integrations/whatsapp/connect?projectId=${projectId}`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            waba_id: wabaId,
            phone_number_id: phoneNumberId
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        const phone = result.data?.phone
        setQuotaExceeded(false)

        if (phone) {
          setConnectedPhones([phone])
          setError(null)
          alert(`✅ WhatsApp connected! Phone: ${phone.displayPhone || phone.display_phone_number || phone.phoneNumberId}`)
        } else {
          fetchConnectedPhones()
        }
      } else {
        const err = await response.json()
        if (response.status === 429 || err?.code === 'QUOTA_EXCEEDED') {
          setQuotaExceeded(true)
          setError(err.error || 'Phone number limit reached for your current plan')
        } else {
          setQuotaExceeded(false)
          setError(err.error || 'Failed to connect WhatsApp')
        }
      }
    } catch (err) {
      console.error('Error connecting WhatsApp:', err)
      setError('An error occurred while connecting WhatsApp')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = () => {
    if (!hasActivePlan) {
      setError('Active plan required. Please upgrade or complete payment before connecting WhatsApp.')
      return
    }
    setConnecting(true)
    try {
      if (typeof window !== 'undefined' && typeof window.launchWhatsAppSignup === 'function') {
        window.launchWhatsAppSignup((response: any) => {
          // If response has an error or user closed popup without finishing
          if (response && response.error) {
            setError(response.error);
            setConnecting(false);
          } else if (!response || response.status === 'unknown') {
            // User likely closed the popup
            setConnecting(false);
          }
          // If successful, the postMessage listener will handle the FINISH event
          // and we keep connecting=true until the backend finishes
        });
      } else {
        setError('Facebook SDK not loaded yet. Please refresh and try again.')
        setConnecting(false)
      }
    } catch (err) {
      console.error('Error launching signup:', err)
      setError('Failed to launch WhatsApp connection')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetch(
        `${API_URL}/integrations/whatsapp/disconnect?projectId=${projectId}`,
        { method: 'POST', headers: getHeaders() }
      )
      setConnectedPhones([])
      setError(null)
    } catch (err) {
      console.error('Error disconnecting:', err)
      setError('Failed to disconnect WhatsApp')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Connect WhatsApp Number</h2>
        <p className="text-gray-600">Connect and manage your WhatsApp Business phone numbers</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
            {quotaExceeded && (
              <div className="mt-2 text-sm text-red-800 flex items-center gap-2">
                <a href="/dashboard/features/billing" className="font-semibold underline">Upgrade plan</a>
                <span>or</span>
                <a href="/dashboard/features/billing" className="font-semibold underline">Top up credits</a>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasActivePlan && !planLoading && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Active plan required</h3>
            <p className="text-sm text-amber-800">Upgrade or complete payment before connecting Meta WhatsApp API.</p>
            <Link href={`/projects/${projectId}/billing`} className="mt-2 inline-block text-sm font-semibold text-amber-900 underline">
              Open billing
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin mb-4">
                <Phone size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600">Loading connected numbers...</p>
            </div>
          </div>
        ) : connectedPhones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Phone size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No WhatsApp Numbers Connected</h3>
            <p className="text-gray-600 text-center mb-8 max-w-sm">Connect your first WhatsApp Business number to start sending and receiving messages</p>
            <Button 
              onClick={handleConnect} 
              disabled={connecting || planLoading || !hasActivePlan}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {connecting ? 'Connecting...' : 'Connect WhatsApp'}
            </Button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone Number</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Display Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Quality</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Verification</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {connectedPhones.map((phone: any) => (
                    <tr key={phone.phoneNumberId} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono font-semibold">{phone.displayPhone || phone.display_phone_number || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{phone.displayName || phone.display_name || 'WhatsApp Business'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          phone.qualityRating === 'GREEN' ? 'bg-green-100 text-green-800' :
                          phone.qualityRating === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {phone.qualityRating || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          phone.verificationStatus === 'VERIFIED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {phone.verificationStatus || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={18} />
                          <span className="font-semibold">Connected</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button 
                onClick={handleConnect}
                variant="outline"
                disabled={connecting || planLoading || !hasActivePlan}
                className="px-6 py-2"
              >
                Connect Another Number
              </Button>
              <Button 
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Clinic Setup Tab
function ClinicSetupTab({ projectId }: { projectId: string }) {
  const [clinic, setClinic] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    fetchClinic()
  }, [projectId])

  const fetchClinic = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/healthcare/clinic/${projectId}`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setClinic(data.data || null)
        setError(null)
      } else {
        const err = await response.json().catch(() => null)
        if (response.status === 404) {
          setClinic(null) // Not configured yet
        } else {
          setError(err?.error || 'Failed to fetch clinic settings')
        }
      }
    } catch (err) {
      console.error('Error fetching clinic:', err)
      setError('Failed to fetch clinic settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (formData: any) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`${API_URL}/healthcare/clinic/${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setClinic(data.data)
        alert('Clinic settings saved successfully!')
      } else {
        const err = await response.json().catch(() => null)
        setError(err?.error || 'Failed to save clinic settings')
      }
    } catch (err) {
      console.error('Error saving clinic:', err)
      setError('Failed to save clinic settings')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return

    try {
      const response = await fetch(`${API_URL}/healthcare/clinic/${projectId}/categories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ category: newCategory.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setClinic(data.data)
        setNewCategory('')
      } else {
        const err = await response.json().catch(() => null)
        setError(err?.error || 'Failed to add category')
      }
    } catch (err) {
      console.error('Error adding category:', err)
      setError('Failed to add category')
    }
  }

  const handleLogoUpload = async (file: File) => {
    setError(null)

    if (!file) {
      throw new Error('No file selected')
    }

    try {
      const token = getAuthToken()
      const headers: any = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const formData = new FormData()
      formData.append('logoFile', file)

      const response = await fetch(`${API_URL}/healthcare/clinic/${projectId}/logo`, {
        method: 'PATCH',
        headers,
        body: formData
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || 'Failed to upload logo')
      }

      const data = await response.json()
      setClinic(data.data)
      return data.data
    } catch (err: any) {
      console.error('Error uploading clinic logo:', err)
      setError(err?.message || 'Failed to upload clinic logo')
      throw err
    }
  }

  const handleRemoveCategory = async (category: string) => {
    try {
      const response = await fetch(`${API_URL}/healthcare/clinic/${projectId}/categories/${encodeURIComponent(category)}`, {
        method: 'DELETE',
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setClinic(data.data)
      } else {
        const err = await response.json().catch(() => null)
        setError(err?.error || 'Failed to remove category')
      }
    } catch (err) {
      console.error('Error removing category:', err)
      setError('Failed to remove category')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2">Loading clinic settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clinic Setup</h2>
        <p className="text-gray-600 mt-1">Configure your clinic details and settings</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <ClinicForm
        projectId={projectId}
        clinic={clinic}
        onSave={handleSave}
        onLogoUpload={handleLogoUpload}
        saving={saving}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        onAddCategory={handleAddCategory}
        onRemoveCategory={handleRemoveCategory}
      />
    </div>
  )
}

// Clinic Form Component
function ClinicForm({ projectId, clinic, onSave, onLogoUpload, saving, newCategory, setNewCategory, onAddCategory, onRemoveCategory }: any) {
  const [formData, setFormData] = useState({
    name: clinic?.name || '',
    address: clinic?.address || '',
    phone: clinic?.phone || '',
    email: clinic?.email || '',
    website: clinic?.website || '',
    doctorName: clinic?.doctorName || '',
    doctorDegree: clinic?.doctorDegree || '',
    registrationNumber: clinic?.registrationNumber || '',
    gstNumber: clinic?.gstNumber || '',
    licenseNumber: clinic?.licenseNumber || '',
    logoUrl: clinic?.logoUrl || '',
    enablePrescriptionDesign: clinic?.enablePrescriptionDesign ?? true,
    prescriptionBlankPdfUrl: clinic?.prescriptionBlankPdfUrl || ''
  })
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (clinic) {
      setFormData({
        name: clinic.name || '',
        address: clinic.address || '',
        phone: clinic.phone || '',
        email: clinic.email || '',
        website: clinic.website || '',
        doctorName: clinic.doctorName || '',
        doctorDegree: clinic.doctorDegree || '',
        registrationNumber: clinic.registrationNumber || '',
        gstNumber: clinic.gstNumber || '',
        licenseNumber: clinic.licenseNumber || '',
        logoUrl: clinic.logoUrl || '',
        enablePrescriptionDesign: clinic.enablePrescriptionDesign ?? true,
        prescriptionBlankPdfUrl: clinic.prescriptionBlankPdfUrl || ''
      })
    }
  }, [clinic])

  const handleSubmit = (e: any) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLogoUploadError(null)
    setLogoUploading(true)

    try {
      const updatedClinic = await onLogoUpload(file)
      if (updatedClinic?.logoUrl) {
        setFormData(prev => ({ ...prev, logoUrl: updatedClinic.logoUrl }))
      }
    } catch (err: any) {
      setLogoUploadError(err?.message || 'Logo upload failed')
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerLogoInput = () => {
    fileInputRef.current?.click()
  }

  const handlePdfUpload = async (file: File) => {
    if (!file) {
      throw new Error('No file selected')
    }

    try {
      const token = getAuthToken()
      const headers: any = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const formDataUpload = new FormData()
      formDataUpload.append('pdfFile', file)
      formDataUpload.append('enablePrescriptionDesign', formData.enablePrescriptionDesign.toString())

      const response = await fetch(`${API_URL}/healthcare/clinic/${projectId}/prescription-design`, {
        method: 'PATCH',
        headers,
        body: formDataUpload
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || 'Failed to upload PDF')
      }

      const data = await response.json()
      return data.data
    } catch (err: any) {
      console.error('Error uploading prescription PDF:', err)
      throw err
    }
  }

  const handlePdfFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setPdfUploadError(null)
    setPdfUploading(true)

    try {
      const updatedClinic = await handlePdfUpload(file)
      if (updatedClinic) {
        setFormData(prev => ({ 
          ...prev, 
          enablePrescriptionDesign: updatedClinic.enablePrescriptionDesign ?? prev.enablePrescriptionDesign,
          prescriptionBlankPdfUrl: updatedClinic.prescriptionBlankPdfUrl || '' 
        }))
      }
    } catch (err: any) {
      setPdfUploadError(err?.message || 'PDF upload failed')
    } finally {
      setPdfUploading(false)
      if (pdfInputRef.current) {
        pdfInputRef.current.value = ''
      }
    }
  }

  const triggerPdfInput = () => {
    pdfInputRef.current?.click()
  }

  const handleDesignToggle = async () => {
    try {
      const newValue = !formData.enablePrescriptionDesign
      setFormData(prev => ({ ...prev, enablePrescriptionDesign: newValue }))

      const token = getAuthToken()
      const headers: any = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch(`${API_URL}/healthcare/clinic/${projectId}/prescription-design`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enablePrescriptionDesign: newValue })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        // Revert on error
        setFormData(prev => ({ ...prev, enablePrescriptionDesign: !newValue }))
      } else {
        const data = await response.json()
      }
    } catch (err) {
      console.error('Error updating design toggle:', err)
      // Revert on error
      setFormData(prev => ({ ...prev, enablePrescriptionDesign: !prev.enablePrescriptionDesign }))
    }
  }

  return (
    <div className="space-y-8">
      {/* Clinic Details Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinic Details</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => handleChange('doctorName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Degree</label>
              <input
                type="text"
                value={formData.doctorDegree}
                onChange={(e) => handleChange('doctorDegree', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Clinic Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Clinic logo"
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No logo uploaded</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <Button type="button" onClick={triggerLogoInput} disabled={logoUploading} className="px-4 py-2">
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  {logoUploadError && <p className="text-sm text-red-600">{logoUploadError}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => handleChange('registrationNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="px-6 py-2">
              {saving ? 'Saving...' : 'Save Clinic Details'}
            </Button>
          </div>
        </form>
      </div>

      {/* Prescription Design Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescription Design Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Prescription Design</label>
              <p className="text-sm text-gray-500">Use generated prescription template. Uploaded blank PDF is currently raw template only.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enablePrescriptionDesign}
                onChange={handleDesignToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {!formData.enablePrescriptionDesign && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Blank Prescription PDF</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".pdf"
                    ref={pdfInputRef}
                    onChange={handlePdfFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={triggerPdfInput}
                    disabled={pdfUploading}
                    className="px-4 py-2"
                  >
                    {pdfUploading ? 'Uploading...' : 'Upload PDF'}
                  </Button>
                  {formData.prescriptionBlankPdfUrl && (
                    <>
                      <p className="text-sm text-green-600 mt-1">PDF uploaded successfully</p>
                      <p className="text-sm text-gray-500 mt-1">Uploaded PDF is used as background and prescription data will be overlaid during view/print.</p>
                    </>
                  )}
                  {pdfUploadError && <p className="text-sm text-red-600 mt-1">{pdfUploadError}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Categories */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Categories</h3>
        <p className="text-gray-600 mb-6">Create categories for organizing clinic-related tasks</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddCategory())}
              />
              <Button onClick={onAddCategory} disabled={!newCategory.trim()}>
                Add Category
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {clinic?.taskCategories?.length > 0 ? (
              clinic.taskCategories.map((category: string, index: number) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-gray-900">{category}</span>
                  <button
                    onClick={() => onRemoveCategory(category)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No categories added yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// Main Settings Page Inner Content
function SettingsPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const [project, setProject] = useState<any>(null)
  const { activeTab, setActiveTab, setTabTitle, setShowSyncButton, setShowCreateButton } = useSettings()

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (!tabFromUrl) return

    const isValidTab = getSettingsTabs(project?.businessCategory).some(tab => tab.id === tabFromUrl)
    if (isValidTab && activeTab !== tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab, setActiveTab])

  // ✅ CRITICAL: Fetch accountId from auth/session
  useEffect(() => {
    const fetchAccountId = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: getHeaders()
        })
        if (response.ok) {
          const data = await response.json()
          setAccountId(data.accountId || data.account?.id)
        }
      } catch (error) {
        console.error('Error fetching account ID:', error)
      }
    }
    fetchAccountId()
  }, [])

  // Fetch project info
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`${API_URL}/projects/${projectId}`, {
          headers: getHeaders()
        })
        if (response.ok) {
          const data = await response.json()
          setProject(data.data || data)
        }
      } catch (error) {
        console.error('Error fetching project:', error)
      }
    }
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  // Update tab title and buttons when tab changes
  useEffect(() => {
    const tabs = getSettingsTabs(project?.businessCategory)
    const tab = tabs.find(t => t.id === activeTab)
    if (tab) {
      setTabTitle(tab.label)
      // Templates moved to dedicated /templates page
      setShowSyncButton(false)
      setShowCreateButton(false)
    }
  }, [activeTab, setTabTitle, setShowSyncButton, setShowCreateButton])

  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Main Content - Full Width with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Navigation */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <nav className="p-4 space-y-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Settings</div>
              {getSettingsTabs(project?.businessCategory).map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}

              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">API & Webhooks</div>
                <Link
                  href={`/projects/${projectId}/settings/api-keys`}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  <KeyRound size={20} />
                  <span>API Keys</span>
                </Link>
                <Link
                  href={`/projects/${projectId}/settings/webhooks`}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Webhook size={20} />
                  <span>Webhooks</span>
                </Link>
              </div>
            </nav>
          </div>

          {/* Right Content Area - Full Width */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-6xl">
              {activeTab === 'connect-number' && <ConnectNumberTab projectId={projectId} />}
              {activeTab === 'quick-replies' && (
                <Suspense fallback={<TabLoadingFallback />}>
                  <QuickRepliesTab />
                </Suspense>
              )}
              {activeTab === 'clinic-setup' && project?.businessCategory === 'health' && <ClinicSetupTab projectId={projectId} />}
              {activeTab === 'billing' && (
                <Suspense fallback={<TabLoadingFallback />}>
                  <BillingTab projectId={projectId} accountId={accountId} />
                </Suspense>
              )}
              {activeTab === 'analytics' && (
                <Suspense fallback={<TabLoadingFallback />}>
                  <AnalyticsTab projectId={projectId} />
                </Suspense>
              )}
              {activeTab === 'agents' && (
                <Suspense fallback={<TabLoadingFallback />}>
                  <AgentsTab projectId={projectId} />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  )
}

export default function SettingsPage() {
  return <SettingsPageContent />
}
