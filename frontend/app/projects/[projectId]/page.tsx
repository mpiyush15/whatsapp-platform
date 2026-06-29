'use client'

import { useProject } from '@/lib/context/ProjectContext'
import { Loader2, Phone, CheckCircle, Plus, RefreshCw, CreditCard, MessageSquare, Users, Settings, BarChart3, ArrowRight, Zap, Activity, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
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
  const canConnectWhatsApp = planStatus === 'active'

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

        const response = await fetch(`${API_URL}/integrations/whatsapp/phones?projectId=${projectId}`, {
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
    if (!canConnectWhatsApp) {
      alert('Active plan required. Please upgrade or complete payment before connecting WhatsApp.')
      connectRequested.current = false
      return
    }
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
    if (!canConnectWhatsApp) {
      alert('Active plan required. Please upgrade or complete payment before connecting WhatsApp.')
      return
    }
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
    <div className="p-8 min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-4 uppercase tracking-wider">
              <Zap size={14} className="text-blue-500" />
              {project?.businessCategory || 'Project'} Category
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">{project?.name}</span>
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Manage your WhatsApp communications, contacts, and integrations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            
            {/* PLAN STATUS CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                <CreditCard size={120} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-xl ${
                    planStatus === 'active' ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20' :
                    planStatus === 'expired' ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20' :
                    'bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg shadow-slate-500/20'
                  }`}>
                    <Activity size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Current Plan</p>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {planInitialLoading ? 'Checking...' : planName}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`relative flex h-2.5 w-2.5`}>
                        {planStatus === 'active' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          planStatus === 'active' ? 'bg-green-500' :
                          planStatus === 'expired' ? 'bg-red-500' :
                          planStatus === 'inactive' ? 'bg-yellow-500' : 'bg-slate-400'
                        }`}></span>
                      </span>
                      <span className={`text-sm font-medium ${
                          planStatus === 'active' ? 'text-green-700' :
                          planStatus === 'expired' ? 'text-red-700' :
                          planStatus === 'inactive' ? 'text-yellow-700' : 'text-slate-600'
                      }`}>
                        {planInitialLoading ? 'Loading subscription status...' :
                         planStatus === 'active' ? 'Active Subscription' :
                         planStatus === 'expired' ? 'Subscription Expired' :
                         planStatus === 'inactive' ? 'No Active Subscription' : 'Unknown Status'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fetchPlanStatus({ silent: true })}
                  disabled={planRefreshing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
                >
                  <RefreshCw size={16} className={planRefreshing ? 'animate-spin text-green-600' : ''} />
                  {planRefreshing ? 'Updating…' : 'Refresh Status'}
                </button>
              </div>
            </div>

            {/* WHATSAPP MESSAGING QUOTA */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">WhatsApp Messaging Quota</h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    24-hour rolling window metrics & quality
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchMessagingMetrics(connectedPhones?.[0]?.phoneNumberId, { silent: true })}
                  disabled={metricsRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition-all active:scale-95 shadow-sm shadow-green-600/20"
                >
                  <RefreshCw size={16} className={metricsRefreshing ? 'animate-spin' : ''} />
                  {metricsRefreshing ? 'Syncing…' : 'Sync Meta Data'}
                </button>
              </div>

              {metricsInitialLoading && !messagingMetrics ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-3" />
                  <p className="text-sm font-medium">Retrieving live metrics from Meta...</p>
                </div>
              ) : messagingMetrics ? (
                <div className={`transition-opacity duration-300 ${metricsRefreshing ? 'opacity-50' : 'opacity-100'}`}>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-center mb-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    {/* SVG Circular Progress */}
                    <div className="relative flex-shrink-0 w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                        <circle 
                          cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                          strokeDasharray={`${2 * Math.PI * 40}`} 
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - (messagingMetrics.usagePercentage || 0) / 100)}`} 
                          className={`transition-all duration-1000 ease-out ${
                            (messagingMetrics.usagePercentage || 0) < 50 ? 'text-green-500' :
                            (messagingMetrics.usagePercentage || 0) < 80 ? 'text-amber-500' : 'text-red-500'
                          }`} 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900">{messagingMetrics.usagePercentage || 0}%</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Used</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                       <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                          <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Messages Sent</p>
                          <p className="text-2xl font-black text-slate-900">{messagingMetrics.messageCount || 0}</p>
                          <p className="text-xs font-medium text-slate-400 mt-1">/ {messagingMetrics.tierLimit} limit</p>
                       </div>
                       <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                          <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Remaining</p>
                          <p className="text-2xl font-black text-slate-900">{messagingMetrics.remainingMessages || 0}</p>
                          <p className="text-xs font-medium text-slate-400 mt-1">Until next reset</p>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-green-300 hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase font-bold tracking-wider text-slate-500">Current Tier</p>
                          <p className="text-xl font-bold text-slate-900 mt-1">{messagingMetrics.tier || 'Unknown'}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                          <Zap size={20} className="text-slate-400 group-hover:text-green-600 transition-colors" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3 font-medium">{messagingMetrics.metaTier || 'Meta Tier Unavailable'}</p>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-green-300 hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase font-bold tracking-wider text-slate-500">Phone Quality</p>
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              messagingMetrics.quality === 'GREEN' ? 'bg-green-100 text-green-700 border border-green-200' : 
                              messagingMetrics.quality === 'YELLOW' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                              messagingMetrics.quality === 'RED' ? 'bg-red-100 text-red-700 border border-red-200' : 
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {messagingMetrics.quality === 'GREEN' && <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>}
                              {messagingMetrics.quality || 'UNKNOWN'}
                            </span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                          <Activity size={20} className="text-slate-400 group-hover:text-green-600 transition-colors" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3 font-medium">Meta verified health status</p>
                    </div>
                  </div>

                  {messagingMetrics.status === 'fallback_db_only' && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm font-medium">
                      <AlertTriangle size={16} />
                      Meta API is temporarily unavailable. Showing cached database metrics.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed p-8 text-center">
                  <Phone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-900">No Metrics Available</h3>
                  <p className="text-sm text-slate-500 mt-1">Connect a WhatsApp number to enable real-time quota tracking.</p>
                </div>
              )}
            </div>

            {/* QUICK ACTIONS / GETTING STARTED */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 hover:shadow-md transition-shadow duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href={`/projects/${projectId}/live-chat-v2`} className="group p-5 rounded-xl border border-slate-200 hover:border-green-500 hover:shadow-md hover:shadow-green-500/10 transition-all bg-white flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <MessageSquare size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                      Live Chat <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Respond to customer messages in real-time.</p>
                  </div>
                </Link>
                
                <Link href={`/projects/${projectId}/contacts`} className="group p-5 rounded-xl border border-slate-200 hover:border-green-500 hover:shadow-md hover:shadow-green-500/10 transition-all bg-white flex items-start gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <Users size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                      Contacts <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Manage and segment your audience.</p>
                  </div>
                </Link>

                <Link href={`/projects/${projectId}/analytics`} className="group p-5 rounded-xl border border-slate-200 hover:border-green-500 hover:shadow-md hover:shadow-green-500/10 transition-all bg-white flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <BarChart3 size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                      Analytics <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">View campaign performance and delivery rates.</p>
                  </div>
                </Link>

                <Link href={`/projects/${projectId}/settings`} className="group p-5 rounded-xl border border-slate-200 hover:border-green-500 hover:shadow-md hover:shadow-green-500/10 transition-all bg-white flex items-start gap-4">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <Settings size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                      Settings <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Configure integrations and project details.</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            {/* WHATSAPP SETUP PANEL */}
            <div className={`bg-gradient-to-b from-white to-slate-50 rounded-2xl shadow-sm border border-slate-200/60 p-6 sticky top-8 transition-opacity duration-300 ${phonesRefreshing ? 'opacity-70' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 text-green-600 rounded-xl">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">WhatsApp Setup</h3>
                </div>
                {phonesRefreshing && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
              </div>

              {showPhonesSpinner ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-4" />
                  <p className="text-sm font-medium text-slate-500">Checking connections...</p>
                </div>
              ) : connectedPhones.length === 0 ? (
                <div className="space-y-6">
                  {!canConnectWhatsApp && !planInitialLoading && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-medium flex gap-3 shadow-inner">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      An active subscription is required to connect to the Meta WhatsApp API.
                    </div>
                  )}
                  
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <h4 className="font-bold text-slate-900 mb-4 relative z-10">Integration Steps</h4>
                    <ul className="space-y-4 relative z-10">
                      <li className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-xs">1</span>
                        <span className="text-slate-700 font-medium pt-0.5">Click &quot;Connect WhatsApp&quot;</span>
                      </li>
                      <li className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-xs">2</span>
                        <span className="text-slate-700 font-medium pt-0.5">Authenticate with your Facebook Business account</span>
                      </li>
                      <li className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-xs">3</span>
                        <span className="text-slate-700 font-medium pt-0.5">Select or create a WABA profile</span>
                      </li>
                    </ul>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting || !canConnectWhatsApp || planInitialLoading}
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 active:scale-95"
                  >
                    {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {connecting ? 'Connecting...' : 'Connect WhatsApp'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-green-800">Connected</span>
                      </div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                        {connectedPhones.length} active numbers
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {connectedPhones.map((phone) => (
                      <div key={phone.phoneNumberId} className="bg-white border border-slate-200 hover:border-green-300 rounded-xl p-4 shadow-sm transition-colors group">
                        <div className="font-mono text-lg font-bold text-slate-900 mb-3 tracking-tight">
                          {phone.displayPhone || phone.display_phone_number || 'N/A'}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg">
                            <span className="text-slate-500 font-medium ml-1">Name</span>
                            <span className="font-bold text-slate-900 mr-1 truncate max-w-[140px]">
                              {phone.displayName || phone.display_name || 'WhatsApp'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg">
                            <span className="text-slate-500 font-medium ml-1">Quality</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white ${
                                phone.qualityRating === 'GREEN' ? 'bg-green-500' :
                                phone.qualityRating === 'YELLOW' ? 'bg-amber-500' : 'bg-red-500'
                            }`}>
                              {phone.qualityRating || 'UNKNOWN'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg">
                            <span className="text-slate-500 font-medium ml-1">Status</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white ${
                                phone.verificationStatus === 'VERIFIED' ? 'bg-blue-500' : 'bg-slate-400'
                            }`}>
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
                    disabled={connecting || !canConnectWhatsApp || planInitialLoading}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 hover:border-green-600 text-slate-700 hover:text-green-700 font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-sm"
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
