'use client'

import { useProject } from '@/lib/context/ProjectContext'
import { Loader2, Phone, CheckCircle, Plus, RefreshCw, CreditCard } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

interface ConnectedPhone {
  phoneNumberId: string
  displayPhone?: string
  display_phone_number?: string
  displayName?: string
  display_name?: string
  qualityRating?: string
  verificationStatus?: string
}

interface MessagingMetrics {
  tier: string
  metaTier: string
  tierLimit: number | string
  messageCount: number
  usagePercentage: number
  remainingMessages: number | string
  quality: string
  status: string
  phoneNumber?: string
}

type PlanStatus = 'active' | 'inactive' | 'expired' | 'unknown'

function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token')
  }
  return null
}

export default function ProjectDashboard() {
  const { project, loading: projectLoading, error: projectError } = useProject()
  const params = useParams()
  const projectId = params.projectId as string

  const [connectedPhones, setConnectedPhones] = useState<ConnectedPhone[]>([])
  const [phonesInitialLoading, setPhonesInitialLoading] = useState(true)
  const [phonesRefreshing, setPhonesRefreshing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [messagingMetrics, setMessagingMetrics] = useState<MessagingMetrics | null>(null)
  const [metricsInitialLoading, setMetricsInitialLoading] = useState(true)
  const [metricsRefreshing, setMetricsRefreshing] = useState(false)
  const [planStatus, setPlanStatus] = useState<PlanStatus>('unknown')
  const [planName, setPlanName] = useState('No active plan')
  const [planInitialLoading, setPlanInitialLoading] = useState(true)
  const [planRefreshing, setPlanRefreshing] = useState(false)

  const bootstrapStarted = useRef(false)
  const connectRequested = useRef(false)

  const getHeaders = useCallback(() => {
    const token = getAuthToken()
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }, [])

  const fetchMessagingMetrics = useCallback(
    async (resolvedPhoneNumberId?: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      try {
        if (!silent) {
          if (messagingMetrics) {
            setMetricsRefreshing(true)
          } else {
            setMetricsInitialLoading(true)
          }
        }

        let phoneNumberId = resolvedPhoneNumberId

        if (!phoneNumberId) {
          const convResponse = await fetch(`${API_URL}/conversations?limit=1`, {
            headers: getHeaders(),
          })
          if (convResponse.ok) {
            const convData = await convResponse.json()
            const conversations = convData.data?.conversations || convData.conversations || []
            phoneNumberId = conversations?.[0]?.phoneNumberId
          }
        }

        if (!phoneNumberId) {
          setMessagingMetrics(null)
          return
        }

        const metricsResponse = await fetch(`${API_URL}/messaging-metrics/${phoneNumberId}`, {
          headers: getHeaders(),
        })

        if (!metricsResponse.ok) {
          setMessagingMetrics(null)
          return
        }

        const metricsData = await metricsResponse.json()
        if (metricsData?.success && metricsData?.data) {
          setMessagingMetrics(metricsData.data)
        } else {
          setMessagingMetrics(null)
        }
      } catch (err) {
        console.error('Error fetching dashboard messaging metrics:', err)
        setMessagingMetrics(null)
      } finally {
        setMetricsInitialLoading(false)
        setMetricsRefreshing(false)
      }
    },
    [getHeaders],
  )

  const fetchConnectedPhones = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      try {
        if (!silent) {
          if (connectedPhones.length > 0) {
            setPhonesRefreshing(true)
          } else {
            setPhonesInitialLoading(true)
          }
        }

        const response = await fetch(`${API_URL}/integrations/whatsapp/phones`, {
          headers: getHeaders(),
        })

        if (response.ok) {
          const result = await response.json()
          const phones =
            result.phones || result.phoneNumbers || result.data?.phones || result.data?.phoneNumbers || []
          setConnectedPhones(phones)
          return phones?.[0]?.phoneNumberId as string | undefined
        }
        return undefined
      } catch (err) {
        console.error('Error fetching phones:', err)
        return undefined
      } finally {
        setPhonesInitialLoading(false)
        setPhonesRefreshing(false)
      }
    },
    [connectedPhones.length, getHeaders],
  )

  const fetchPlanStatus = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      try {
        if (!silent) {
          if (planStatus !== 'unknown' || planName !== 'No active plan') {
            setPlanRefreshing(true)
          } else {
            setPlanInitialLoading(true)
          }
        }

        const token = getAuthToken()
        if (!token) {
          setPlanStatus('unknown')
          setPlanName('Unable to load plan')
          return
        }

        const response = await fetch(`${API_URL}/subscriptions/my-subscriptions`, {
          method: 'POST',
          headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch plan status')
        }

        const data = await response.json()
        const subscriptions = data.data?.subscriptions || data.data || []

        if (Array.isArray(subscriptions)) {
          const activeSub = subscriptions.find(
            (sub: { status?: string }) => String(sub?.status || '').toLowerCase() === 'active',
          )
          const hasExpiredSub = subscriptions.some(
            (sub: { status?: string }) => String(sub?.status || '').toLowerCase() === 'expired',
          )

          if (activeSub) {
            setPlanStatus('active')
            setPlanName(activeSub.planName || activeSub.planId?.name || 'Active Plan')
          } else if (hasExpiredSub) {
            setPlanStatus('expired')
            setPlanName('Expired plan')
          } else {
            setPlanStatus('inactive')
            setPlanName('No active plan')
          }
        } else {
          const status = String(subscriptions?.status || 'inactive').toLowerCase() as PlanStatus
          setPlanStatus(status)
          setPlanName(subscriptions?.planName || subscriptions?.planId?.name || 'Plan')
        }
      } catch (err) {
        console.error('Error fetching plan status:', err)
        setPlanStatus('unknown')
        setPlanName('Unable to load plan')
      } finally {
        setPlanInitialLoading(false)
        setPlanRefreshing(false)
      }
    },
    [getHeaders, planName, planStatus],
  )

  const loadDashboard = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      const [phoneNumberId] = await Promise.all([
        fetchConnectedPhones({ silent }),
        fetchPlanStatus({ silent }),
      ])
      await fetchMessagingMetrics(phoneNumberId, { silent })
    },
    [fetchConnectedPhones, fetchPlanStatus, fetchMessagingMetrics],
  )

  useEffect(() => {
    bootstrapStarted.current = false
    setConnectedPhones([])
    setMessagingMetrics(null)
    setPhonesInitialLoading(true)
    setMetricsInitialLoading(true)
    setPlanInitialLoading(true)
  }, [projectId])

  useEffect(() => {
    if (!projectId || bootstrapStarted.current) return
    bootstrapStarted.current = true
    void loadDashboard()
  }, [projectId, loadDashboard])

  const connectWhatsAppWithData = async (wabaId: string, phoneNumberId: string) => {
    try {
      setConnecting(true)
      const response = await fetch(
        `${API_URL}/integrations/whatsapp/connect?projectId=${projectId}`,
        {
          method: 'POST',
          headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            waba_id: wabaId,
            phone_number_id: phoneNumberId,
          }),
        },
      )

      if (response.ok) {
        await loadDashboard({ silent: true })
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to connect WhatsApp')
      }
    } catch (err) {
      console.error('Error connecting WhatsApp:', err)
      alert('An error occurred while connecting WhatsApp')
    } finally {
      setConnecting(false)
      connectRequested.current = false
    }
  }

  const handleConnect = () => {
    connectRequested.current = true
    setConnecting(true)
    try {
      if (typeof window !== 'undefined' && typeof window.launchWhatsAppSignup === 'function') {
        window.launchWhatsAppSignup()
      } else {
        setConnecting(false)
        connectRequested.current = false
      }
    } catch (err) {
      console.error('Error launching signup:', err)
      setConnecting(false)
      connectRequested.current = false
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com') return

      let parsed: { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string } } =
        event.data
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }
      }

      if (parsed?.type !== 'WA_EMBEDDED_SIGNUP' || parsed?.event !== 'FINISH') return
      if (!connectRequested.current) return

      const { waba_id, phone_number_id } = parsed.data || {}
      if (waba_id && phone_number_id) {
        connectWhatsAppWithData(waba_id, phone_number_id)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [projectId])

  if (projectLoading && !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (projectError && !project) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{projectError}</p>
        </div>
      </div>
    )
  }

  const showPhonesSpinner = phonesInitialLoading && connectedPhones.length === 0

  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to {project?.name}!</h1>
          <p className="text-gray-600 mt-2">
            Category: <span className="font-semibold capitalize">{project?.businessCategory}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Plan Status</p>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">
                    {planInitialLoading ? 'Checking...' : planName}
                  </h2>
                  <p className="text-sm mt-2 font-medium flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        planStatus === 'active'
                          ? 'bg-green-500'
                          : planStatus === 'expired'
                          ? 'bg-red-500'
                          : planStatus === 'inactive'
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    <span
                      className={
                        planStatus === 'active'
                          ? 'text-green-700'
                          : planStatus === 'expired'
                          ? 'text-red-700'
                          : planStatus === 'inactive'
                          ? 'text-yellow-700'
                          : 'text-gray-600'
                      }
                    >
                      {planInitialLoading
                        ? 'Loading subscription status'
                        : planStatus === 'active'
                        ? 'Active'
                        : planStatus === 'expired'
                        ? 'Expired'
                        : planStatus === 'inactive'
                        ? 'Inactive'
                        : 'Unknown'}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchPlanStatus({ silent: true })}
                  disabled={planRefreshing}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={14} className={planRefreshing ? 'animate-spin' : ''} />
                  {planRefreshing ? 'Updating…' : 'Refresh'}
                </button>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold">
                <CreditCard size={14} />
                Subscription
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">WhatsApp Messaging Quota</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Tier, usage and quality rating (24-hour window)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    fetchMessagingMetrics(connectedPhones?.[0]?.phoneNumberId, { silent: true })
                  }
                  disabled={metricsRefreshing}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={14} className={metricsRefreshing ? 'animate-spin' : ''} />
                  {metricsRefreshing ? 'Updating…' : 'Refresh'}
                </button>
              </div>

              {metricsInitialLoading && !messagingMetrics ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading messaging metrics…
                </div>
              ) : messagingMetrics ? (
                <div className={`space-y-5 transition-opacity ${metricsRefreshing ? 'opacity-60' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Tier</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">{messagingMetrics.tier}</p>
                      <p className="text-xs text-gray-500 mt-1">{messagingMetrics.metaTier}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Used</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {messagingMetrics.messageCount}/{messagingMetrics.tierLimit}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Unique contacts (24h)</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Remaining</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {messagingMetrics.remainingMessages}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Until next window roll</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Quality</p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          messagingMetrics.quality === 'GREEN'
                            ? 'bg-green-100 text-green-700'
                            : messagingMetrics.quality === 'YELLOW'
                            ? 'bg-yellow-100 text-yellow-700'
                            : messagingMetrics.quality === 'RED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {messagingMetrics.quality}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Usage Percentage</span>
                      <span className="font-semibold">{messagingMetrics.usagePercentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          messagingMetrics.usagePercentage < 50
                            ? 'bg-green-500'
                            : messagingMetrics.usagePercentage < 80
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${messagingMetrics.usagePercentage}%` }}
                      />
                    </div>
                  </div>
                  {messagingMetrics.status === 'fallback_db_only' && (
                    <p className="text-xs text-gray-500 italic">
                      Meta is temporarily unavailable. Showing DB-based usage.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Messaging metrics unavailable. Connect a WhatsApp number to enable quota tracking.
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
              <div className="space-y-3">
                <p className="text-gray-600">
                  📱 Go to <span className="font-semibold">Live Chat</span> to start conversations with
                  customers
                </p>
                <p className="text-gray-600">
                  👥 Visit <span className="font-semibold">Contacts</span> to manage your customer list
                </p>
                <p className="text-gray-600">
                  ⚙️ Check <span className="font-semibold">Settings</span> to configure WhatsApp integration
                </p>
                <p className="text-gray-600">
                  📊 Monitor <span className="font-semibold">Analytics</span> to track performance metrics
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div
              className={`bg-white rounded-lg border border-gray-200 p-6 sticky top-8 transition-opacity ${
                phonesRefreshing ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">WhatsApp Setup</h3>
                {phonesRefreshing && (
                  <Loader2 className="w-4 h-4 animate-spin text-green-600 ml-auto" />
                )}
              </div>

              {showPhonesSpinner ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              ) : connectedPhones.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Steps to Connect</h4>
                    <ol className="space-y-2 text-sm text-gray-700">
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">1.</span>
                        <span>Click &quot;Connect Now&quot;</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">2.</span>
                        <span>Sign in with WhatsApp Business Account</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">3.</span>
                        <span>Grant necessary permissions</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">4.</span>
                        <span>Your numbers will appear here</span>
                      </li>
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {connecting ? 'Connecting...' : 'Connect Now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">Connected</span>
                    </div>
                    <p className="text-sm text-green-600">
                      {connectedPhones.length} WhatsApp number(s) active
                    </p>
                  </div>
                  <div className="space-y-3">
                    {connectedPhones.map((phone) => (
                      <div key={phone.phoneNumberId} className="border border-gray-200 rounded-lg p-3">
                        <div className="font-mono text-sm font-semibold text-gray-900 mb-2">
                          {phone.displayPhone || phone.display_phone_number || 'N/A'}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium text-gray-900">
                              {phone.displayName || phone.display_name || 'WhatsApp'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Quality:</span>
                            <span
                              className={`px-2 py-0.5 rounded text-white text-xs font-bold ${
                                phone.qualityRating === 'GREEN'
                                  ? 'bg-green-600'
                                  : phone.qualityRating === 'YELLOW'
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                            >
                              {phone.qualityRating || 'UNKNOWN'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Verification:</span>
                            <span
                              className={`px-2 py-0.5 rounded text-white text-xs font-bold ${
                                phone.verificationStatus === 'VERIFIED' ? 'bg-blue-600' : 'bg-gray-600'
                              }`}
                            >
                              {phone.verificationStatus || 'UNKNOWN'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full px-4 py-2 border border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    Add Another Number
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
