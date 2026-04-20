'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, MessageSquare, Users, Megaphone, FileText, Bot, Target, 
  BarChart3, Users2, CreditCard, Settings, ChevronDown, LogOut, Menu, X, Lock, AlertCircle, User,
  Building2, BookOpen, Activity, DollarSign, Receipt, Sliders
} from 'lucide-react'
import { authService, UserRole } from '@/lib/auth'
import { getSidebarItems } from '@/lib/rbac'
import DemoBadge from './DemoBadge'
import { useState } from 'react'

const iconMap = {
  LayoutDashboard,
  MessageSquare,
  Users,
  Megaphone,
  FileText,
  Bot,
  Target,
  BarChart3,
  Users2,
  CreditCard,
  Settings,
  User,
  Building2,
  BookOpen,
  Activity,
  DollarSign,
  Receipt,
  Sliders
}

export default function Sidebar() {
  const pathname = usePathname()
  const user = authService.getCurrentUser()
  const [isOpen, setIsOpen] = useState(false)
  const [superAdminDropdownOpen, setSuperAdminDropdownOpen] = useState(false)
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false)

  if (!user) return null

  // DEBUG: Log the role for debugging
  console.log('🔍 Sidebar Debug - User role:', { 
    rawRole: user.role, 
    roleEnum: UserRole.ADMIN,
    isAdmin: user.role === UserRole.ADMIN,
    email: user.email
  })

  // Check if plan is active (not pending payment)
  const isPlanActive = user.status === 'active' && user.plan && user.plan !== 'free'
  const isPlanPending = user.status === 'pending'
  const isSuperAdmin = user.role === UserRole.SUPERADMIN

  const items = getSidebarItems(user.role as UserRole)

  // DEBUG: Log sidebar items
  console.log('📋 Sidebar Items Debug:', { 
    itemsCount: items.length,
    items: items.map(i => ({ label: i.label, href: i.href })),
    userRole: user.role
  })

  const handleLogout = async () => {
    try {
      await authService.logout()
      // Ensure clear before redirect
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 100)
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if logout fails
      window.location.href = '/auth/login'
    }
  }

  return (
    <>
      {/* Payment Pending Banner */}
      {isPlanPending && !isSuperAdmin && (
        <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white px-4 py-2 text-sm text-center z-50">
          <span className="font-semibold">⚠️ Payment Pending</span> - Complete your payment to unlock all features
          <Link href="/dashboard/billing" className="ml-2 underline font-semibold">Pay Now →</Link>
        </div>
      )}

      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white border border-gray-200 ${isPlanPending && !isSuperAdmin ? 'top-12' : ''}`}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white
        transform transition-transform duration-300 overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-800">
          <div className="h-8 w-8 bg-green-500 rounded-lg flex items-center justify-center">
            <MessageSquare size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg">PixelsWhatsApp</span>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-800">
          <div className="text-sm">
            <p className="font-semibold text-white">{user.name}</p>
            
            {/* Demo Badge */}
            {user.isDemoAccount && (
              <div className="mt-2 mb-2">
                <DemoBadge 
                  isDemoAccount={user.isDemoAccount}
                  demoLabel={user.demoLabel}
                  demoNote={user.demoNote}
                  size="sm"
                  showIcon={true}
                />
              </div>
            )}
            
            <p className="text-gray-400 text-xs capitalize mt-1">{user.role}</p>
            <p className="text-gray-500 text-xs mt-2 truncate">{user.email}</p>
            
            {/* Payment Status Badge */}
            {!isSuperAdmin && isPlanPending && (
              <div className="mt-3 bg-orange-900/30 border border-orange-600/50 rounded px-2 py-1.5 flex items-center gap-2">
                <AlertCircle size={14} className="text-orange-400 flex-shrink-0" />
                <span className="text-xs text-orange-300">Payment Pending</span>
              </div>
            )}
            
            {/* Plan Info */}
            {!isSuperAdmin && user.plan && (
              <div className="mt-2 text-xs text-gray-400">
                Plan: <span className="text-gray-200 capitalize">{user.plan}</span>
                {user.billingCycle && <span className="text-gray-500"> ({user.billingCycle})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2">
          {/* SuperAdmin Dropdown */}
          {isSuperAdmin && (
            <div className="space-y-2">
              <button
                onClick={() => setSuperAdminDropdownOpen(!superAdminDropdownOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <Settings size={20} />
                <span className="text-sm font-medium">Admin Panel</span>
                <ChevronDown 
                  size={16} 
                  className={`ml-auto transition-transform duration-300 ${superAdminDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {/* SuperAdmin Items */}
              {superAdminDropdownOpen && (
                <div className="bg-gray-800/50 rounded-lg space-y-1 py-2 px-2 border border-gray-700">
                  {[
                    { name: "Organizations", icon: "Building2" as const, href: "/dashboard/organizations" },
                    { name: "Demo Requests", icon: "BookOpen" as const, href: "/dashboard/admin/demo-requests" },
                    { name: "System Health", icon: "Activity" as const, href: "/dashboard/system-health" },
                    { name: "Platform Billing", icon: "DollarSign" as const, href: "/dashboard/platform-billing" },
                    { name: "Transactions", icon: "CreditCard" as const, href: "/dashboard/transactions" },
                    { name: "Invoices", icon: "Receipt" as const, href: "/dashboard/invoices" },
                    { name: "Plans and Offers", icon: "Sliders" as const, href: "/dashboard/superadmin/plans-and-offers" },
                  ].map((adminItem) => {
                    const Icon = iconMap[adminItem.icon as keyof typeof iconMap]
                    const isActive = pathname === adminItem.href || pathname.startsWith(adminItem.href + '/')
                    
                    return (
                      <Link
                        key={adminItem.href}
                        href={adminItem.href}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                          ${isActive 
                            ? 'bg-green-600 text-white' 
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }
                        `}
                      >
                        {Icon && <Icon size={16} />}
                        <span className="font-medium">{adminItem.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Regular Navigation Items */}
          {items.map((item) => {
            // Skip superadmin-only items since we moved them to dropdown
            if ((item as any).superAdminOnly) return null
            
            const Icon = iconMap[item.icon as keyof typeof iconMap]
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            // Lock features requiring active plan if plan is not active
            // For clients with paid plans (pro/enterprise), show all features
            const lockedFeatures = ['whatsapp', 'contacts', 'broadcasts', 'campaigns', 'chatbot', 'templates']
            const isFeatureLocked = !isSuperAdmin && !isPlanActive && lockedFeatures.some(feature => item.href.includes(feature))
            
            // Always show billing/settings/dashboard/account, even for pending plans
            // For paid plans, show all features including chatbot, leads, campaigns
            const alwaysVisible = ['dashboard', 'billing', 'settings', 'account']
            const shouldShow = alwaysVisible.some(v => item.href.includes(v)) || isPlanActive || isSuperAdmin
            
            // DEBUG: Log each item
            if (item.label === 'Account' || item.label === 'Settings') {
              console.log(`🔗 Item: ${item.label}`, { 
                href: item.href, 
                shouldShow, 
                isPlanActive,
                isSuperAdmin,
                alwaysVisibleMatch: alwaysVisible.some(v => item.href.includes(v))
              })
            }
            
            if (!shouldShow) return null
            
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={isFeatureLocked ? '#' : item.href}
                  onClick={(e) => {
                    if (isFeatureLocked) e.preventDefault()
                    setIsOpen(false)
                  }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative
                    ${isFeatureLocked
                      ? 'cursor-not-allowed opacity-50 text-gray-500'
                      : isActive 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  {Icon && <Icon size={20} />}
                  <span className="text-sm font-medium">{item.label}</span>
                  {isFeatureLocked && <Lock size={16} className="ml-auto text-orange-400" />}
                </Link>
                
                {/* Tooltip for locked features */}
                {isFeatureLocked && (
                  <div className="invisible group-hover:visible absolute left-full top-0 ml-2 bg-orange-900 text-orange-100 text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                    Activate plan to use this feature
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
