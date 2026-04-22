'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, MessageSquare, Users, Megaphone, FileText, Bot, Target, 
  BarChart3, Users2, CreditCard, Settings, LogOut, Lock, AlertCircle, User,
  Building2, BookOpen, Activity, DollarSign, Receipt, Sliders
} from 'lucide-react'
import { authService, UserRole } from '@/lib/auth'
import { getSidebarItems } from '@/lib/rbac'
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
  const [superAdminDropdownOpen, setSuperAdminDropdownOpen] = useState(false)

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

      {/* Sidebar - Compact Style */}
      <aside className="fixed md:static inset-y-0 left-0 z-40 bg-gray-900 text-white w-20 overflow-y-auto flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-800">
          <div className="h-8 w-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare size={20} className="text-white" />
          </div>
        </div>

        {/* User Avatar - Minimal */}
        <div className="border-b border-gray-800 p-2 flex justify-center">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-white" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-1.5 py-4 space-y-1 overflow-y-auto">
          {/* SuperAdmin Icon */}
          {isSuperAdmin && (
            <div className="relative group">
              <button
                onClick={() => setSuperAdminDropdownOpen(!superAdminDropdownOpen)}
                className="w-full flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                title="Admin Panel"
              >
                <Settings size={24} />
                <span className="text-xs font-semibold text-center leading-tight">Admin</span>
              </button>
              
              {/* SuperAdmin Items - Tooltip Style */}
              {superAdminDropdownOpen && (
                <div className="absolute left-full top-0 ml-2 bg-gray-800 border border-gray-700 rounded-lg space-y-1 py-2 px-1 w-40 z-50">
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
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors
                          ${isActive 
                            ? 'bg-white/10 text-white' 
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }
                        `}
                      >
                        {Icon && <Icon size={14} />}
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
            if ((item as any).superAdminOnly) return null
            
            const Icon = iconMap[item.icon as keyof typeof iconMap]
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            const lockedFeatures = ['whatsapp', 'contacts', 'broadcasts', 'campaigns', 'chatbot', 'templates']
            const isFeatureLocked = !isSuperAdmin && !isPlanActive && lockedFeatures.some(feature => item.href.includes(feature))
            
            const alwaysVisible = ['dashboard', 'billing', 'settings', 'account']
            const shouldShow = alwaysVisible.some(v => item.href.includes(v)) || isPlanActive || isSuperAdmin
            
            if (!shouldShow) return null
            
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={isFeatureLocked ? '#' : item.href}
                  onClick={(e) => {
                    if (isFeatureLocked) e.preventDefault()
                  }}
                  className={`
                    flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg transition-colors relative
                    ${isFeatureLocked
                      ? 'cursor-not-allowed opacity-50 text-gray-500'
                      : isActive 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                  title={item.label}
                >
                  {Icon && <Icon size={24} className="flex-shrink-0" />}
                  <span className="text-xs font-semibold text-center leading-tight">{item.label}</span>
                  {isFeatureLocked && <Lock size={12} className="absolute top-1 right-1 text-orange-400" />}
                </Link>
                
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
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut size={24} />
            <span className="text-xs font-semibold">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
