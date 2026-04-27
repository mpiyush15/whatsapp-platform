"use client"

import { useState, useEffect, Suspense, lazy } from "react"
import { Button } from "@/components/ui/button"
import { Phone, CheckCircle, AlertCircle, Settings as SettingsIcon, CreditCard, BarChart3, Headset, Loader } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSettings } from "@/lib/context/SettingsContext"

// PHASE 5: Dynamic imports for code splitting - reduce initial bundle
const BillingTab = lazy(() => import("@/components/BillingTab"))
const AnalyticsTab = lazy(() => import("@/components/AnalyticsTab"))
const AgentsTab = lazy(() => import("@/components/AgentsTab"))

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
    launchWhatsAppSignup?: () => void
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

// Settings Tabs
const SETTINGS_TABS = [
  { id: 'connect-number', label: 'Connect Number', icon: Phone },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'agents', label: 'Agents', icon: Headset }
]

// Connect Number Tab
function ConnectNumberTab({ projectId }: { projectId: string }) {
  const [connectedPhones, setConnectedPhones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConnectedPhones()
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

  const connectWhatsAppWithData = async (wabaId: string, phoneNumberId: string) => {
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

        if (phone) {
          setConnectedPhones([phone])
          setError(null)
          alert(`✅ WhatsApp connected! Phone: ${phone.displayPhone || phone.display_phone_number || phone.phoneNumberId}`)
        } else {
          fetchConnectedPhones()
        }
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to connect WhatsApp')
      }
    } catch (err) {
      console.error('Error connecting WhatsApp:', err)
      setError('An error occurred while connecting WhatsApp')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = () => {
    setConnecting(true)
    try {
      if (typeof window !== 'undefined' && typeof window.launchWhatsAppSignup === 'function') {
        window.launchWhatsAppSignup()
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
              disabled={connecting}
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



// Main Settings Page Inner Content
function SettingsPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const { activeTab, setActiveTab, setTabTitle, setShowSyncButton, setShowCreateButton } = useSettings()

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (!tabFromUrl) return

    const isValidTab = SETTINGS_TABS.some(tab => tab.id === tabFromUrl)
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

  // Update tab title and buttons when tab changes
  useEffect(() => {
    const tab = SETTINGS_TABS.find(t => t.id === activeTab)
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
              {SETTINGS_TABS.map((tab) => {
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
            </nav>
          </div>

          {/* Right Content Area - Full Width */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-6xl">
              {activeTab === 'connect-number' && <ConnectNumberTab projectId={projectId} />}
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
