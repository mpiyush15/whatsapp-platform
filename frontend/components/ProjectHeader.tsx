'use client'

import { useProject } from '@/lib/context/ProjectContext'
import { useLiveChat } from '@/lib/context/LiveChatContext'
import { useSettings } from '@/lib/context/SettingsContext'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown, LogOut, Settings, Search, RefreshCw, Plus } from 'lucide-react'
import { useState } from 'react'
import { authService } from '@/lib/auth'

interface ProjectHeaderProps {
  projectId: string
}

export default function ProjectHeader({ projectId }: ProjectHeaderProps) {
  const { project, loading } = useProject()
  const router = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  
  // Check if on dashboard page
  const isDashboardPage = pathname === `/projects/${projectId}` || pathname === `/projects/${projectId}/`
  
  // Check if on live chat page
  const isLiveChatPage = pathname.includes('/live-chat')
  
  // Check if on settings page
  const isSettingsPage = pathname.includes('/settings')
  
  // Use context for live chat search/filter
  let search = ''
  let filter: 'all' | 'unread' | 'open' | 'closed' = 'all'
  let setSearch: (s: string) => void = () => {}
  let setFilter: (f: 'all' | 'unread' | 'open' | 'closed') => void = () => {}
  
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
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <span className="text-lg text-gray-400">/</span>
            <h2 className="text-lg font-semibold text-gray-700">{tabTitle}</h2>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {showSyncButton && (
              <button
                onClick={onSyncClick}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
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

    // Fallback if context not available
    return (
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      </header>
    )
  }

  // Show topbar with search for live chat pages
  if (isLiveChatPage) {
    return (
      <div className="bg-white border-b border-gray-200">
        <div className="h-16 flex items-center px-6">
          {/* Left: Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show blank topbar for non-dashboard, non-livechat pages
  if (!isDashboardPage) {
    return (
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
        {/* Blank topbar - will add content later */}
      </header>
    )
  }

  if (loading) {
    return (
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
      </header>
    )
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      {/* Left: Project Info */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          {project?.name.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="font-semibold text-gray-900">{project?.name || 'Project'}</h1>
          <p className="text-xs text-gray-500">ID: {projectId}</p>
        </div>
      </div>

      {/* Right: User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
            {authService.getCurrentUser()?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <ChevronDown size={18} className="text-gray-600" />
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

            <div className="border-t border-gray-200 my-2"></div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
