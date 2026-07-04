'use client'

import { useProject } from '@/lib/context/ProjectContext'
import { useLiveChat } from '@/lib/context/LiveChatContext'
import { useSettings } from '@/lib/context/SettingsContext'
import { useFlowBuilderOptional } from '@/lib/context/FlowBuilderContext'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown, LogOut, Settings, Search, RefreshCw, Plus, Menu, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import CreditBalanceTopbar from '@/components/CreditBalanceTopbar'

const BrandLogo = () => (
  <div className="hidden lg:flex items-center w-64 h-16 pl-6 -ml-6 shrink-0 relative">
    <Link href="/" prefetch={false} className="flex items-center gap-2">
      <div className="h-8 w-8 bg-[#008069] rounded-lg flex items-center justify-center flex-shrink-0">
        <MessageSquare className="h-5 w-5 text-white" />
      </div>
      <span className="font-bold text-white text-lg">Replysys</span>
    </Link>
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-white/20" />
  </div>
)

interface ProjectHeaderProps {
  projectId: string
  onMenuClick?: () => void
}

export default function ProjectHeader({ projectId, onMenuClick }: ProjectHeaderProps) {
  const { project, loading } = useProject()
  const router = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  const [contactMetrics, setContactMetrics] = useState<{
    tier: string
    metaTier: string
    tierLimit: number | string
    messageCount: number
    usagePercentage: number
    remainingMessages: number | string
    quality: string
    status: string
  } | null>(null)
  const [contactsHeaderLoading, setContactsHeaderLoading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

  const formatSegment = (segment: string) =>
    segment
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

  const getRouteHeader = () => {
    const pathOnly = pathname.split('?')[0]
    const parts = pathOnly.split('/').filter(Boolean)

    const projectIdx = parts.indexOf('projects')
    const routeParts = projectIdx >= 0 ? parts.slice(projectIdx + 2) : []

    if (routeParts.length === 0) {
      return { title: 'Dashboard', subtitle: project?.name || 'Project overview' }
    }

    const healthcareLabel = (segment: string) => {
      if (routeParts[0] === 'healthcare' && segment === 'pharmacy') return 'Medicine master'
      return formatSegment(segment)
    }

    const breadcrumb = routeParts.map(healthcareLabel).join(' / ')
    const title = healthcareLabel(routeParts[routeParts.length - 1])

    return {
      title,
      subtitle: breadcrumb,
    }
  }
  
  // Check if on dashboard page
  const isDashboardPage = pathname === `/projects/${projectId}` || pathname === `/projects/${projectId}/`
  
  // Check if on live chat page
  const isLiveChatPage = pathname.includes('/live-chat')

  // Check if on contacts page
  const isContactsPage = pathname.includes('/contacts')
  
  // Check if on settings page
  const isSettingsPage = pathname.includes('/settings')

  // Check if on templates page
  const isTemplatesPage = pathname.includes('/templates')

  // Check if on campaigns page
  const isCampaignsPage = pathname.includes('/campaigns')

  const isFlowPage = pathname.includes('/flow')
  const flowBuilder = useFlowBuilderOptional()
  const creditTopbar = <CreditBalanceTopbar projectId={projectId} />
  
  // Use context for live chat search/filter
  let search = ''
  let filter: 'all' | 'unread' | 'open' | 'closed' | 'mine' = 'all'
  let setSearch: (s: string) => void = () => {}
  let setFilter: (f: 'all' | 'unread' | 'open' | 'closed' | 'mine') => void = () => {}
  
  if (isLiveChatPage) {
    const liveChat = useLiveChat()
    search = liveChat.search
    filter = liveChat.filter
    setSearch = liveChat.setSearch
    setFilter = liveChat.setFilter
  }

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const getAuthHeaders = () => {
    const token = authService.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  const fetchContactsHeaderMetrics = async () => {
    if (!isContactsPage) return

    try {
      setContactsHeaderLoading(true)

      const convResponse = await fetch(`${API_URL}/conversations?limit=1`, {
        headers: getAuthHeaders(),
      })
      const convData = await convResponse.json()
      const conversations = convData.data?.conversations || convData.conversations || []
      const phoneNumberId = conversations?.[0]?.phoneNumberId

      if (!phoneNumberId) {
        setContactMetrics(null)
        return
      }

      const metricsResponse = await fetch(`${API_URL}/messaging-metrics/${phoneNumberId}`, {
        headers: getAuthHeaders(),
      })
      const metricsData = await metricsResponse.json()

      if (metricsData?.success && metricsData?.data) {
        setContactMetrics(metricsData.data)
      } else {
        setContactMetrics(null)
      }
    } catch (error) {
      console.error('Error loading contacts topbar metrics:', error)
      setContactMetrics(null)
    } finally {
      setContactsHeaderLoading(false)
    }
  }

  useEffect(() => {
    if (!isContactsPage) return

    fetchContactsHeaderMetrics()
    const interval = setInterval(fetchContactsHeaderMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isContactsPage, pathname])

  // Show topbar with settings tab heading for settings page
  if (isSettingsPage) {
    let settingsContext = null
    try {
      settingsContext = useSettings()
    } catch {
      // Context not available yet
    }

    if (settingsContext) {
      const { tabTitle, showSyncButton, showCreateButton, isSyncing, onSyncClick, onCreateClick } = settingsContext

      return (
        <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <BrandLogo />
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <span className="text-lg text-white/50">/</span>
            <h2 className="text-lg font-semibold text-white/90">{tabTitle}</h2>
          </div>

          <div className="flex items-center gap-2">
            {creditTopbar}
            {showSyncButton && (
              <button
                onClick={onSyncClick}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition text-sm font-medium"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
            {showCreateButton && (
              <button
                onClick={onCreateClick}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-medium"
              >
                <Plus size={16} />
                Create
              </button>
            )}
          </div>
        </header>
      )
    }

    return (
      <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <BrandLogo />
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white">Settings</h2>
        </div>
        {creditTopbar}
      </header>
    )
  }

  // Show topbar with templates heading + actions for templates page
  if (isTemplatesPage) {
    let settingsContext = null
    try {
      settingsContext = useSettings()
    } catch {
      // Context not available yet
    }

    if (settingsContext) {
      const { showSyncButton, showCreateButton, isSyncing, onSyncClick, onCreateClick } = settingsContext

      return (
        <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <BrandLogo />
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-white">Templates</h2>
          </div>

          <div className="flex items-center gap-2">
            {creditTopbar}
            {showSyncButton && (
              <button
                onClick={onSyncClick}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition text-sm font-medium"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
            {showCreateButton && (
              <button
                onClick={onCreateClick}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-medium"
              >
                <Plus size={16} />
                Create
              </button>
            )}
          </div>
        </header>
      )
    }

    return (
      <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <BrandLogo />
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white">Templates</h2>
        </div>
        {creditTopbar}
      </header>
    )
  }

  // Show topbar with campaigns heading
  if (isCampaignsPage) {
    return (
      <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <BrandLogo />
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white">Campaigns</h2>
        </div>
        {creditTopbar}
      </header>
    )
  }

  // Show topbar with search for live chat pages
  if (isLiveChatPage) {
    return (
      <div className="bg-[#115B4C] border-b border-[#115B4C]/20">
        <div className="h-16 flex items-center gap-3 px-6">
          <BrandLogo />
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-white/50" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 text-white placeholder-gray-500 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>
          {creditTopbar}
        </div>
      </div>
    )
  }

  // Show contacts topbar in the shared ProjectHeader
  if (isContactsPage) {
    return (
      <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-2">
          <BrandLogo />
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white">Contacts</h2>
        </div>

          <div className="flex items-center gap-3 text-sm text-white/90 flex-wrap justify-end">
            {creditTopbar}
            {contactsHeaderLoading ? (
              <span className="text-white/50 text-xs">Loading metrics…</span>
            ) : contactMetrics ? (
              <>
                {/* Tier */}
                <span className="hidden sm:inline">
                  <span className="text-white/70">Tier </span>
                  <span className="font-semibold text-white">{contactMetrics.tier}</span>
                </span>
                <span className="text-white/30 hidden sm:inline">|</span>

                {/* Usage */}
                <span>
                  <span className="text-white/70">Used </span>
                  <span className="font-semibold text-white">{contactMetrics.messageCount}</span>
                  <span className="text-white/50">/{contactMetrics.tierLimit}</span>
                </span>
                <span className="text-white/30">|</span>

                {/* Usage % bar */}
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        contactMetrics.usagePercentage < 50
                          ? 'bg-green-500'
                          : contactMetrics.usagePercentage < 80
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${contactMetrics.usagePercentage}%` }}
                    />
                  </div>
                  <span className={`font-semibold ${
                    contactMetrics.usagePercentage < 50 ? 'text-green-600' : contactMetrics.usagePercentage < 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>{contactMetrics.usagePercentage}%</span>
                </div>
                <span className="text-white/30">|</span>

                {/* Quality badge */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  contactMetrics.quality === 'GREEN'
                    ? 'bg-green-100 text-green-700'
                    : contactMetrics.quality === 'YELLOW'
                    ? 'bg-yellow-100 text-yellow-700'
                    : contactMetrics.quality === 'RED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-white/90'
                }`}>
                  {contactMetrics.quality === 'GREEN' ? '🟢' : contactMetrics.quality === 'YELLOW' ? '🟡' : contactMetrics.quality === 'RED' ? '🔴' : '⚪'} {contactMetrics.quality}
                </span>

                {contactMetrics.status === 'fallback_db_only' && (
                  <span className="text-xs text-white/50 italic">(offline)</span>
                )}
              </>
            ) : (
              <span className="text-white/50 text-xs">Metrics unavailable</span>
            )}
          </div>

          <button
            onClick={fetchContactsHeaderMetrics}
            disabled={contactsHeaderLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={contactsHeaderLoading ? 'animate-spin' : ''} />
            {contactsHeaderLoading ? '...' : 'Refresh'}
          </button>
      </header>
    )
  }

  // Show blank topbar for non-dashboard, non-livechat pages
  if (!isDashboardPage) {
    const routeHeader = getRouteHeader()
    const flowStatus = isFlowPage ? flowBuilder?.status : null
    return (
      <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo />
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{routeHeader.title}</h2>
            <p className="text-xs text-white/70 truncate">{routeHeader.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {creditTopbar}
          {flowStatus ? (
            <p
              className={`max-w-md truncate text-sm font-medium ${
                flowStatus.type === 'error' ? 'text-red-600' : 'text-green-700'
              }`}
              title={flowStatus.message}
            >
              {flowStatus.message}
            </p>
          ) : null}
        </div>
      </header>
    )
  }

  if (loading && !project) {
    return (
      <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="h-4 w-32 bg-white/20 rounded animate-pulse"></div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-[#115B4C] border-b border-[#115B4C]/20 h-16 flex items-center justify-between px-6">
      {/* Left: Project Info */}
      <div className="flex items-center gap-3">
        <BrandLogo />
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          {project?.name.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="font-semibold text-white">{project?.name || 'Project'}</h1>
          <p className="text-xs text-white/70">ID: {projectId}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {creditTopbar}
        <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition"
        >
          <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium">
            {authService.getCurrentUser()?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <ChevronDown size={18} className="text-white/90" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
            <button
              onClick={() => {
                router.push(`/projects/${projectId}/settings`)
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings size={16} />
              Project Settings
            </button>

            <button
              onClick={() => {
                router.push('/projects')
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              📁 Switch Project
            </button>


          </div>
        )}
        </div>
      </div>
    </header>
  )
}
