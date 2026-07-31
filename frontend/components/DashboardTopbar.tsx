'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const PAGE_NAMES: Record<string, string> = {
  'live-chat-v2': 'Live Chat',
  'messages': 'Messages',
  'contacts': 'Contacts',
  'broadcasts': 'Broadcasts',
  'campaigns': 'Campaigns',
  'chatbot': 'Chatbot',
  'leads': 'Leads',
  'account': 'Account',
  'settings': 'Settings',
  'templates': 'Templates',
  'billing': 'Billing',
  'analytics': 'Analytics',
}

export default function DashboardTopbar() {
  const pathname = usePathname()

  // Extract page name from pathname
  const getPageName = () => {
    const parts = pathname.split('/')
    const projectIdIndex = parts.indexOf('[projectId]') || parts.findIndex(p => p.match(/proj_\d+/))
    
    if (projectIdIndex >= 0 && projectIdIndex < parts.length - 1) {
      const pagePart = parts[projectIdIndex + 1]
      return PAGE_NAMES[pagePart] || pagePart?.charAt(0).toUpperCase() + pagePart?.slice(1) || 'Dashboard'
    }
    
    return 'Dashboard'
  }

  const pageName = getPageName()

  return (
    <div className="fixed top-0 left-64 right-0 h-12 bg-white border-b border-gray-200 flex items-center px-8 z-40">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Project</span>
        <ChevronRight size={16} className="text-gray-400" />
        <span className="text-lg font-semibold text-gray-900">{pageName}</span>
      </div>
    </div>
  )
}
