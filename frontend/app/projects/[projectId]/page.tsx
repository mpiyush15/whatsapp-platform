'use client'

import { useProject } from '@/lib/context/ProjectContext'
import { Loader2, Phone, CheckCircle, Plus, RefreshCw, CreditCard, MessageSquare, Users, Settings, BarChart3, ArrowRight, Zap, Activity, AlertTriangle, Building2 } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [activeTab, setActiveTab] = useState<'business' | 'overview' | 'whatsapp' | 'tools'>('business')

  const [campaigns, setCampaigns] = useState<any[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'all' | 'weekly' | 'monthly' | 'quarterly' | 'annually'>('all')

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

  const fetchBusinessStats = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    try {
      if (!silent) setCampaignsLoading(true)
      const res = await fetch(`${API_URL}/campaigns?projectId=${projectId}`, { headers: getHeaders() })
      if (!res.ok) return
      const payload = await res.json()
      const list = payload?.data?.campaigns || payload?.campaigns || (Array.isArray(payload) ? payload : [])
      setCampaigns(list)
    } catch (err) {
      console.error('Failed to fetch campaigns for business stats', err)
    } finally {
      setCampaignsLoading(false)
    }
  }, [projectId, getHeaders])

  const loadDashboard = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      const [phoneNumberId] = await Promise.all([
        fetchConnectedPhones({ silent }),
        fetchPlanStatus({ silent }),
        fetchBusinessStats({ silent }),
      ])
      await fetchMessagingMetrics(phoneNumberId, { silent })
    },
    [fetchConnectedPhones, fetchPlanStatus, fetchMessagingMetrics, fetchBusinessStats],
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-normal text-[#1C1E21]">
            Welcome to {project?.name}
          </h1>
          <p className="text-[#667781] mt-1 text-sm">
            Manage your WhatsApp communications, contacts, and integrations.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-gray-200 mb-8 pb-4">
          <button 
            onClick={() => setActiveTab('business')}
            className={`text-base font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'business' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-[#667781] hover:text-[#1C1E21]'}`}
          >
            My Business
          </button>
          <button 
            onClick={() => setActiveTab('overview')}
            className={`text-base font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'overview' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-[#667781] hover:text-[#1C1E21]'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('whatsapp')}
            className={`text-base font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'whatsapp' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-[#667781] hover:text-[#1C1E21]'}`}
          >
            WhatsApp Setup
          </button>
          <button 
            onClick={() => setActiveTab('tools')}
            className={`text-base font-bold pb-4 -mb-[17px] border-b-[3px] transition-colors ${activeTab === 'tools' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-[#667781] hover:text-[#1C1E21]'}`}
          >
            Tools
          </button>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {activeTab === 'business' && (
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Business ROI & Performance</h2>
                    <p className="text-xs text-slate-500 mt-1">Aggregated across WhatsApp campaigns</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      className="text-sm border-slate-200 rounded-lg text-slate-600 focus:ring-green-500 focus:border-green-500 py-1.5 pl-3 pr-8"
                    >
                      <option value="all">All Time</option>
                      <option value="weekly">Last 7 Days</option>
                      <option value="monthly">Last 30 Days</option>
                      <option value="quarterly">Last 90 Days</option>
                      <option value="annually">Last 365 Days</option>
                    </select>
                    <button 
                      onClick={() => fetchBusinessStats()} 
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-lg text-sm transition-colors"
                    >
                      <RefreshCw size={14} className={campaignsLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                {campaignsLoading && campaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300 mb-2" />
                    <p className="text-xs">Calculating ROI metrics...</p>
                  </div>
                ) : (
                  (() => {
                    const now = Date.now()
                    let filteredCampaigns = campaigns
                    if (timeFilter !== 'all') {
                      const days = timeFilter === 'weekly' ? 7 : timeFilter === 'monthly' ? 30 : timeFilter === 'quarterly' ? 90 : 365
                      const cutoff = now - (days * 24 * 60 * 60 * 1000)
                      filteredCampaigns = campaigns.filter(c => {
                        const date = c.createdAt ? new Date(c.createdAt).getTime() : 0
                        return date >= cutoff
                      })
                    }

                    const COST_PER_MESSAGE = 0.80
                    
                    const totalSent = filteredCampaigns.reduce((acc, c) => acc + (c.recipients?.sent || c.stats?.totalSent || 0), 0)
                    const totalDelivered = filteredCampaigns.reduce((acc, c) => acc + (c.stats?.totalDelivered || 0), 0)
                    const totalReplies = filteredCampaigns.reduce((acc, c) => acc + (c.stats?.totalReplied || 0), 0)
                    const totalQualified = filteredCampaigns.reduce((acc, c) => acc + (c.stats?.totalQualified || 0), 0)
                    
                    const totalSpend = totalSent * COST_PER_MESSAGE
                    const costPerLead = totalQualified > 0 ? totalSpend / totalQualified : 0
                    const costPerReply = totalReplies > 0 ? totalSpend / totalReplies : 0
                    const replyRate = totalDelivered > 0 ? (totalReplies / totalDelivered) * 100 : 0

                    return (
                      <>
                        <div className="mb-8">
                          <h3 className="text-sm font-semibold text-slate-700 mb-4">Financial Overview</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-xs font-medium text-slate-500 mb-1">Total Campaign Spend</p>
                              <p className="text-2xl font-semibold text-slate-800">₹{totalSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                              <p className="text-[10px] text-slate-400 mt-1">Based on ₹0.80 avg msg cost</p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-xs font-medium text-slate-500 mb-1">Cost Per Lead (CPL)</p>
                              <p className="text-2xl font-semibold text-slate-800">₹{costPerLead.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                              <p className="text-[10px] text-slate-400 mt-1">Total Spend / Qualified Leads</p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-xs font-medium text-slate-500 mb-1">Cost Per Reply (CPR)</p>
                              <p className="text-2xl font-semibold text-slate-800">₹{costPerReply.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                              <p className="text-[10px] text-slate-400 mt-1">Total Spend / Total Replies</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-slate-700 mb-4">Audience Engagement</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 border border-slate-100 rounded-xl">
                              <p className="text-xs font-medium text-slate-500 mb-1">Total Replies</p>
                              <p className="text-xl font-semibold text-slate-800">{totalReplies.toLocaleString()}</p>
                            </div>
                            <div className="p-5 border border-slate-100 rounded-xl">
                              <p className="text-xs font-medium text-slate-500 mb-1">Reply Rate</p>
                              <p className="text-xl font-semibold text-slate-800">{replyRate.toFixed(1)}%</p>
                              <p className="text-[10px] text-slate-400 mt-1">Replies / Delivered</p>
                            </div>
                            <div className="p-5 border border-slate-100 rounded-xl">
                              <p className="text-xs font-medium text-slate-500 mb-1">Total Qualified Leads</p>
                              <p className="text-xl font-semibold text-green-600">{totalQualified.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'overview' && (
            <motion.div variants={itemVariants} className="space-y-6">
              
              {/* COMBINED OVERVIEW CONTAINER */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                
                {/* PLAN STATUS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">
                      <Activity size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Current Plan</p>
                      <h2 className="text-lg font-semibold text-slate-800">
                        {planInitialLoading ? 'Checking...' : planName}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`relative flex h-2 w-2`}>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${planStatus === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        </span>
                        <span className={`text-xs ${planStatus === 'active' ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                          {planInitialLoading ? 'Loading...' :
                           planStatus === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchPlanStatus({ silent: true })}
                    disabled={planRefreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw size={14} className={planRefreshing ? 'animate-spin' : ''} />
                    {planRefreshing ? 'Updating…' : 'Refresh'}
                  </button>
                </div>

                {/* WHATSAPP QUOTA */}
                <div className="pt-6">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Messaging Quota</h2>
                      <p className="text-xs text-slate-500 mt-0.5">24-hour rolling window metrics</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchMessagingMetrics(connectedPhones?.[0]?.phoneNumberId, { silent: true })}
                      disabled={metricsRefreshing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <RefreshCw size={14} className={metricsRefreshing ? 'animate-spin' : ''} />
                      {metricsRefreshing ? 'Syncing…' : 'Sync Meta Data'}
                    </button>
                  </div>
                  
                  {metricsInitialLoading && !messagingMetrics ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-300 mb-2" />
                      <p className="text-xs">Retrieving live metrics...</p>
                    </div>
                  ) : messagingMetrics ? (
                    <div className={`transition-opacity duration-300 ${metricsRefreshing ? 'opacity-50' : 'opacity-100'}`}>
                      <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-50 rounded-lg p-6">
                        
                        {/* Circular Progress */}
                        <div className="relative flex-shrink-0 w-24 h-24">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
                              strokeDasharray={`${2 * Math.PI * 40}`} 
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - (messagingMetrics.usagePercentage || 0) / 100)}`} 
                              className="transition-all duration-1000 ease-out text-green-500" 
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-semibold text-slate-700">{messagingMetrics.usagePercentage || 0}%</span>
                            <span className="text-[9px] uppercase font-medium text-slate-400">Used</span>
                          </div>
                        </div>
                        
                        {/* Metrics Grid (No Cards) */}
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Messages Sent</p>
                            <p className="text-xl font-semibold text-slate-800">{messagingMetrics.messageCount || 0}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">/ {messagingMetrics.tierLimit} limit</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Remaining</p>
                            <p className="text-xl font-semibold text-slate-800">{messagingMetrics.remainingMessages || 0}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Until next reset</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Current Tier</p>
                            <p className="text-xl font-semibold text-slate-800">{messagingMetrics.tier || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Phone Quality</p>
                            <p className="text-xl font-semibold text-green-600">{messagingMetrics.quality || 'UNKNOWN'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-6 text-center">
                      <Phone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <h3 className="text-sm font-medium text-slate-700">No Metrics Available</h3>
                      <p className="text-xs text-slate-500 mt-1">Connect a WhatsApp number to enable tracking.</p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'whatsapp' && (
            <motion.div variants={itemVariants} className="max-w-2xl">
              <div className="bg-[#FFFFFF] rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-[#F0F2F5] text-[#008069] rounded-xl">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1E21]">WhatsApp Setup</h3>
                </div>

                {showPhonesSpinner ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#008069] mb-4" />
                    <p className="text-sm font-medium text-[#667781]">Checking connections...</p>
                  </div>
                ) : connectedPhones.length === 0 ? (
                  <div className="space-y-6">
                    <div className="bg-[#F0F2F5] rounded-xl p-5 border border-gray-200">
                      <h4 className="font-bold text-[#1C1E21] mb-4">Integration Steps</h4>
                      <ul className="space-y-4">
                        <li className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FFFFFF] text-[#008069] border border-gray-200 font-bold flex items-center justify-center text-xs">1</span>
                          <span className="text-[#1C1E21] font-medium pt-0.5">Click "Connect WhatsApp"</span>
                        </li>
                        <li className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FFFFFF] text-[#008069] border border-gray-200 font-bold flex items-center justify-center text-xs">2</span>
                          <span className="text-[#1C1E21] font-medium pt-0.5">Authenticate with your Facebook Business account</span>
                        </li>
                      </ul>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connecting || !canConnectWhatsApp || planInitialLoading}
                      className="w-full px-4 py-3 bg-[#008069] text-[#FFFFFF] font-bold rounded-full disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#006653]"
                    >
                      {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      {connecting ? 'Connecting...' : 'Connect WhatsApp'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {connectedPhones.map((phone) => (
                      <div key={phone.phoneNumberId} className="bg-[#FFFFFF] border border-gray-200 rounded-xl p-4">
                        <div className="font-mono text-lg font-bold text-[#1C1E21] mb-3">
                          {phone.displayPhone || phone.display_phone_number || 'N/A'}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-[#F0F2F5] p-2 rounded-lg">
                            <span className="text-[#667781] font-medium">Name</span>
                            <span className="font-bold text-[#1C1E21]">{phone.displayName || phone.display_name || 'WhatsApp'}</span>
                          </div>
                          <div className="flex justify-between items-center bg-[#F0F2F5] p-2 rounded-lg">
                            <span className="text-[#667781] font-medium">Status</span>
                            <span className="font-bold text-[#008069]">{phone.verificationStatus || 'VERIFIED'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connecting || !canConnectWhatsApp || planInitialLoading}
                      className="w-full px-4 py-3 bg-[#FFFFFF] border border-gray-200 text-[#008069] font-bold rounded-full disabled:opacity-50 hover:bg-gray-50"
                    >
                      Add Another Number
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'tools' && (
            <motion.div variants={itemVariants}>
              <div className="bg-[#FFFFFF] rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-xl font-bold text-[#1C1E21] mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href={`/projects/${projectId}/live-chat-v2`} className="group p-5 rounded-xl border border-gray-200 bg-[#FFFFFF] flex items-start gap-4 hover:border-[#008069] transition-colors">
                    <div className="p-3 bg-[#F0F2F5] text-[#008069] rounded-lg group-hover:bg-[#008069] group-hover:text-white transition-colors">
                      <MessageSquare size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[#1C1E21]">Live Chat</h3>
                      <p className="text-sm text-[#667781] mt-1">Respond to customer messages.</p>
                    </div>
                  </Link>
                  <Link href={`/projects/${projectId}/contacts`} className="group p-5 rounded-xl border border-gray-200 bg-[#FFFFFF] flex items-start gap-4 hover:border-[#008069] transition-colors">
                    <div className="p-3 bg-[#F0F2F5] text-[#008069] rounded-lg group-hover:bg-[#008069] group-hover:text-white transition-colors">
                      <Users size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[#1C1E21]">Contacts</h3>
                      <p className="text-sm text-[#667781] mt-1">Manage and segment audience.</p>
                    </div>
                  </Link>
                  <Link href={`/projects/${projectId}/analytics`} className="group p-5 rounded-xl border border-gray-200 bg-[#FFFFFF] flex items-start gap-4 hover:border-[#008069] transition-colors">
                    <div className="p-3 bg-[#F0F2F5] text-[#008069] rounded-lg group-hover:bg-[#008069] group-hover:text-white transition-colors">
                      <BarChart3 size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[#1C1E21]">Analytics</h3>
                      <p className="text-sm text-[#667781] mt-1">View campaign performance.</p>
                    </div>
                  </Link>
                  <Link href={`/projects/${projectId}/settings`} className="group p-5 rounded-xl border border-gray-200 bg-[#FFFFFF] flex items-start gap-4 hover:border-[#008069] transition-colors">
                    <div className="p-3 bg-[#F0F2F5] text-[#008069] rounded-lg group-hover:bg-[#008069] group-hover:text-white transition-colors">
                      <Settings size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[#1C1E21]">Settings</h3>
                      <p className="text-sm text-[#667781] mt-1">Configure project details.</p>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  )
}
