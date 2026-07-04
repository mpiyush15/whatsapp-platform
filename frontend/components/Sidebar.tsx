'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, MessageSquare, Users, Megaphone, FileText, Bot, Target, 
  BarChart3, Users2, CreditCard, Settings, LogOut, Lock, User,
  Building2, BookOpen, Activity, DollarSign, Receipt, Sliders, GitBranch,
  ChevronLeft, ChevronRight, X, Calendar, Package, Archive, ShieldCheck, UserPlus, Image as ImageIcon
} from 'lucide-react'
import { authService, UserRole } from '@/lib/auth'
import { getSidebarItems } from '@/lib/rbac'
import { routeKeyFromDashboardHref, staffRoutesForProject, staffWelcomePath, canOpenStaffWelcomePage } from '@/lib/healthcareStaffRoutes'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'

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
  Sliders,
  GitBranch,
  Calendar,
  Package,
  Archive,
  ShieldCheck,
  UserPlus,
  ImageIcon
}

const healthcareLabelToModule: Record<string, string> = {
  Patients: 'patients',
  Appointments: 'appointments',
  'Front Desk': 'frontdesk',
  Doctors: 'doctors',
  Staff: 'doctors',
  Nurses: 'nurses',
  Prescriptions: 'prescriptions',
  'Medicine master': 'pharmacy',
  Inventory: 'inventory',
  Billing: 'billing',
  Compliance: 'compliance',
  Chatbot: 'whatsapp',
  Templates: 'whatsapp',
  Broadcasts: 'whatsapp',
  'Live Chat': 'whatsapp',
  'Flow Builder': 'flow-builder',
}

const defaultHealthcareModules = [
  'patients',
  'appointments',
  'doctors',
  'prescriptions',
  'whatsapp',
]

const pathologyLabelToModule: Record<string, string> = {
  Patients: 'patients',
  'Test catalog': 'tests',
  'Lab orders': 'orders',
  Collection: 'collection',
  Reports: 'reports',
  'Lab billing': 'billing',
  Chatbot: 'whatsapp',
  Templates: 'whatsapp',
  Broadcasts: 'whatsapp',
  'Live Chat': 'whatsapp',
  'Flow Builder': 'flow-builder',
}

const defaultPathologyModules = [
  'patients',
  'tests',
  'orders',
  'collection',
  'reports',
  'whatsapp',
]

interface SidebarProps {
  projectId?: string
  vertical?: 'whatsapp' | 'healthcare' | 'ecommerce' | 'pathology' | 'education' | 'pixels'
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ projectId, mobileOpen = false, onMobileClose, vertical: verticalProp }: SidebarProps) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [enabledHealthcareModules, setEnabledHealthcareModules] = useState<string[] | null>(null)
  const [enabledPathologyModules, setEnabledPathologyModules] = useState<string[] | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const preservedScrollRef = useRef<number | null>(null)

  const projectVertical = verticalProp ?? 'whatsapp'

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!projectId || projectVertical !== 'healthcare') {
      setEnabledHealthcareModules(null)
      return
    }

    let cancelled = false

    const loadClinicModules = async () => {
      try {
        const token = authService.getToken()
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'
        const response = await fetch(`${apiUrl}/healthcare/clinic/${encodeURIComponent(projectId)}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const payload = await response.json().catch(() => null)
        const modules = payload?.data?.enabledModules
        if (!cancelled) {
          setEnabledHealthcareModules(Array.isArray(modules) && modules.length ? modules : defaultHealthcareModules)
        }
      } catch {
        if (!cancelled) setEnabledHealthcareModules(defaultHealthcareModules)
      }
    }

    loadClinicModules()
    window.addEventListener('clinic-modules-updated', loadClinicModules)
    return () => {
      cancelled = true
      window.removeEventListener('clinic-modules-updated', loadClinicModules)
    }
  }, [projectId, projectVertical])

  useEffect(() => {
    if (!projectId || projectVertical !== 'pathology') {
      setEnabledPathologyModules(null)
      return
    }

    let cancelled = false

    const loadLabModules = async () => {
      try {
        const token = authService.getToken()
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'
        const response = await fetch(`${apiUrl}/pathology/lab/${encodeURIComponent(projectId)}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const payload = await response.json().catch(() => null)
        const modules = payload?.data?.lab?.enabledModules
        if (!cancelled) {
          setEnabledPathologyModules(Array.isArray(modules) && modules.length ? modules : defaultPathologyModules)
        }
      } catch {
        if (!cancelled) setEnabledPathologyModules(defaultPathologyModules)
      }
    }

    loadLabModules()
    window.addEventListener('lab-modules-updated', loadLabModules)
    return () => {
      cancelled = true
      window.removeEventListener('lab-modules-updated', loadLabModules)
    }
  }, [projectId, projectVertical])

  const preserveScroll = () => {
    if (navRef.current) {
      preservedScrollRef.current = navRef.current.scrollTop
    }
  }

  useLayoutEffect(() => {
    if (!navRef.current) return

    if (preservedScrollRef.current !== null) {
      navRef.current.scrollTop = preservedScrollRef.current
      preservedScrollRef.current = null
    }

    const activeItem = navRef.current.querySelector('[data-active="true"]') as HTMLElement | null
    if (!activeItem) return

    const navRect = navRef.current.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()

    const isAbove = itemRect.top < navRect.top
    const isBelow = itemRect.bottom > navRect.bottom

    if (isAbove || isBelow) {
      activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }, [pathname])

  const user = authService.getCurrentUser()
  if (!user || !isClient) return null

  const basePath = projectId ? `/projects/${projectId}` : ''
  const isPlanActive = user.status === 'active' && user.plan && user.plan !== 'free'
  const isSuperAdmin = user.role === UserRole.SUPERADMIN
  const isInProject = !!projectId
  const isHealthcareStaffUser = Boolean(user.staffRole)
    || Boolean(user.healthcareRoutesByProject && Object.keys(user.healthcareRoutesByProject).length > 0)
    || Boolean(user.healthcareAccessByProject && Object.keys(user.healthcareAccessByProject).length > 0)
  const staffAllowedRoutes = projectId ? staffRoutesForProject(user, projectId) : []
  const isProjectAgentUser =
    user.role === UserRole.AGENT &&
    Boolean(user.agentProjectId)
  const agentAllowedLabels = new Set(['Live Chat', 'Leads'])

  const items = getSidebarItems(user.role as UserRole)
  const updatedItems = items
    .filter(item => {
      if (projectId && isProjectAgentUser) {
        return String(user.agentProjectId) === String(projectId) && agentAllowedLabels.has(item.label)
      }

      const routeKey = routeKeyFromDashboardHref(item.href)
      const moduleKey = healthcareLabelToModule[item.label] || pathologyLabelToModule[item.label]
      const enabledByClinic = !moduleKey || !enabledHealthcareModules || enabledHealthcareModules.includes(moduleKey)
      const enabledByLab = !moduleKey || !enabledPathologyModules || enabledPathologyModules.includes(moduleKey)

      if ((item as any).vertical === 'pixels') {
        if (projectVertical !== 'pixels') return false
        return true
      }

      if ((item as any).vertical === 'pathology') {
        if (projectVertical !== 'pathology') return false
        if (item.label === 'Overview') return true
        if (item.label === 'Lab Setup') return true
        return enabledByLab
      }

      // Healthcare items: only show when project vertical is healthcare
      if ((item as any).vertical === 'healthcare') {
        if (projectVertical !== 'healthcare') return false
        if (!isHealthcareStaffUser) {
          if (item.label === 'Overview') return true
          if (item.label === 'Clinic Setup') return true
          return enabledByClinic
        }
        return enabledByClinic && staffAllowedRoutes.includes(routeKey)
      }
      if ((item as any).vertical === 'education') {
        if (projectVertical !== 'education') return false
        return true
      }

      // Non-healthcare items: when vertical is healthcare, show only selected items
      if (projectVertical === 'pixels') {
        const alwaysShowGroups = ['⚙️ System', '📈 Analytics']
        const alwaysShowLabels = ['Dashboard', 'Contacts', 'Live Chat', 'Campaigns', 'Templates', 'Media Library', 'Chatbot', 'Flow Builder']
        return alwaysShowGroups.includes((item as any).group ?? '') || alwaysShowLabels.includes(item.label)
      }
      if (projectVertical === 'healthcare') {
        if (isHealthcareStaffUser) {
          return enabledByClinic && staffAllowedRoutes.includes(routeKey)
        }
        const alwaysShowGroups = ['⚙️ System', '📈 Analytics']
        const alwaysShowLabels = ['Dashboard', 'Live Chat', 'Campaigns', 'Templates', 'Media Library', 'Chatbot', 'Flow Builder']
        if (moduleKey && enabledHealthcareModules && !enabledHealthcareModules.includes(moduleKey)) {
          return false
        }
        return alwaysShowGroups.includes((item as any).group ?? '') || alwaysShowLabels.includes(item.label)
      }
      if (projectVertical === 'pathology') {
        const alwaysShowGroups = ['⚙️ System', '📈 Analytics']
        const alwaysShowLabels = ['Dashboard', 'Contacts', 'Live Chat', 'Campaigns', 'Templates', 'Media Library', 'Chatbot', 'Flow Builder']
        if (moduleKey && enabledPathologyModules && !enabledPathologyModules.includes(moduleKey)) {
          return false
        }
        return alwaysShowGroups.includes((item as any).group ?? '') || alwaysShowLabels.includes(item.label)
      }
      if (projectVertical === 'education') {
        const alwaysShowGroups = ['⚙️ System', '📈 Analytics']
        const alwaysShowLabels = ['Dashboard', 'Contacts', 'Live Chat', 'Campaigns', 'Templates', 'Media Library', 'Chatbot', 'Flow Builder']
        return alwaysShowGroups.includes((item as any).group ?? '') || alwaysShowLabels.includes(item.label)
      }
      return true
    })
    .map(item => {
      let href = projectId ? item.href.replace('/dashboard', basePath) : item.href
      if (projectId && isHealthcareStaffUser && item.label === 'Dashboard') {
        if (canOpenStaffWelcomePage(user, staffAllowedRoutes)) {
          href = staffWelcomePath(projectId)
        }
      }

      // Override groups for education vertical
      let group = (item as any).group;
      if (projectVertical === 'education') {
        const commsLabels = ['Live Chat', 'Chatbot', 'Flow Builder', 'Campaigns', 'Templates', 'Media Library'];
        const mgtLabels = ['Contacts', 'Analytics', 'Settings'];
        const eduLabels = ['Enquiries', 'Admissions', 'Courses', 'Batches'];
        
        if (commsLabels.includes(item.label)) group = '💬 Communication';
        if (mgtLabels.includes(item.label)) group = '⚙️ Management';
        if (eduLabels.includes(item.label)) group = '🎓 Education Management';
      }

      return { ...item, href, group }
    })

  const handleLogout = async () => {
    try {
      await authService.logout()
      setTimeout(() => { window.location.href = '/auth/login' }, 100)
    } catch {
      window.location.href = '/auth/login'
    }
  }

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-end p-2 border-b border-gray-200 flex-shrink-0">
        {isMobile ? (
          <button onClick={onMobileClose} className="text-gray-500 hover:text-gray-900 transition">
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`text-gray-500 hover:text-gray-900 transition ${collapsed ? 'mx-auto' : ''}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="flex-1 p-3 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {(() => {
          const visibleItems = updatedItems.filter((item) => {
            if ((item as any).superAdminOnly) return false
            const lockedFeatures = ['whatsapp', 'contacts', 'broadcasts', 'campaigns', 'chatbot', 'flow', 'healthcare', 'templates']
            const alwaysVisible = ['dashboard', 'billing', 'settings', 'account']
            return isInProject ||
              alwaysVisible.some(v => item.href.includes(v)) ||
              isPlanActive || isSuperAdmin
          })

          // Build ordered group list preserving item order
          const groups: string[] = []
          visibleItems.forEach((item) => {
            const g = (item as any).group ?? '__none__'
            if (!groups.includes(g)) groups.push(g)
          })

          // In healthcare projects, prioritize healthcare navigation first.
          if (projectVertical === 'pathology') {
            const pathologyGroupOrder: Record<string, number> = {
              '🧪 Pathology • Core': 0,
              '🧪 Pathology • Operations': 1,
              '🧪 Pathology • Reports': 2,
              '🧪 Pathology • Billing': 3,
              '__none__': 4,
              '💬 Conversations': 5,
              '📢 Marketing': 6,
              '📈 Analytics': 7,
              '⚙️ System': 8,
            }
            groups.sort((a, b) => {
              const aRank = pathologyGroupOrder[a] ?? 999
              const bRank = pathologyGroupOrder[b] ?? 999
              if (aRank !== bRank) return aRank - bRank
              return 0
            })
          } else if (projectVertical === 'healthcare') {
            const healthcareGroupOrder: Record<string, number> = {
              '🏥 Healthcare • Core': 0,
              '🏥 Healthcare • Front Desk': 1,
              '🏥 Healthcare • Clinical': 2,
              '🏥 Healthcare • Pharmacy': 3,
              '🏥 Healthcare • Billing': 4,
              '🏥 Healthcare • Compliance': 5,
              '__none__': 6,
              '💬 Conversations': 7,
              '📢 Marketing': 8,
              '📈 Analytics': 9,
              '⚙️ System': 10,
            }

            groups.sort((a, b) => {
              const aRank = healthcareGroupOrder[a] ?? 999
              const bRank = healthcareGroupOrder[b] ?? 999
              if (aRank !== bRank) return aRank - bRank
              return 0
            })
          } else if (projectVertical === 'education') {
            const educationGroupOrder: Record<string, number> = {
                '__none__': 0,
                '🎓 Education Management': 1,
                '💬 Communication': 2,
                '⚙️ Management': 3,
            }
            groups.sort((a, b) => {
                const aRank = educationGroupOrder[a] ?? 999
                const bRank = educationGroupOrder[b] ?? 999
                if (aRank !== bRank) return aRank - bRank
                return 0
            })
          } else if (projectVertical === 'pixels') {
            const pixelsGroupOrder: Record<string, number> = {
              '💇‍♀️ Salon Workspace': 0,
              '💇‍♀️ Salon Management': 1,
              '💇‍♀️ Salon Marketing': 2,
              '__none__': 3,
              '💬 Conversations': 4,
              '📢 Marketing': 5,
              '📈 Analytics': 6,
              '⚙️ System': 7,
            }
            groups.sort((a, b) => {
                const aRank = pixelsGroupOrder[a] ?? 999
                const bRank = pixelsGroupOrder[b] ?? 999
                if (aRank !== bRank) return aRank - bRank
                return 0
            })
          }

          return groups.map((groupKey) => {
            const groupItems = visibleItems.filter(i => ((i as any).group ?? '__none__') === groupKey)
            return (
              <div key={groupKey} className="mb-2">
                {/* Group label — hidden when collapsed */}
                {groupKey !== '__none__' && !collapsed && !isMobile && (
                  <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-widest text-gray-500 uppercase select-none">
                    {groupKey}
                  </p>
                )}
                {groupKey !== '__none__' && (collapsed || isMobile) && !isMobile && (
                  <div className="my-2 border-t border-gray-200" />
                )}
                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const Icon = iconMap[item.icon as keyof typeof iconMap]
                    const isActive = (item.label === 'Dashboard' || item.label === 'Overview' || item.label === 'Home')
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/')
                    const lockedFeatures = ['whatsapp', 'contacts', 'broadcasts', 'campaigns', 'chatbot', 'flow', 'healthcare', 'templates']
                    const isFeatureLocked = !isInProject && !isSuperAdmin && !isPlanActive &&
                      lockedFeatures.some(f => item.href.includes(f))

                    return (
                      <div key={item.href} className="relative group" data-active={isActive ? 'true' : 'false'}>
                        <Link
                          href={isFeatureLocked ? '#' : item.href}
                          prefetch={false}
                          onClick={(e) => {
                            if (isFeatureLocked) {
                              e.preventDefault()
                            } else {
                              preserveScroll()
                              if (onMobileClose) onMobileClose()
                            }
                          }}
                          title={collapsed && !isMobile ? item.label : ''}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition relative
                            ${collapsed && !isMobile ? 'justify-center' : ''}
                            ${isFeatureLocked
                              ? 'cursor-not-allowed opacity-50 text-gray-400'
                              : isActive
                              ? 'bg-[#008069] text-white'
                              : 'text-[#1C1E21] hover:bg-[#F0F2F5]'
                            }
                          `}
                        >
                          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                          {(!collapsed || isMobile) && <span>{item.label}</span>}
                          {isFeatureLocked && <Lock className="h-3 w-3 absolute top-1.5 right-1.5 text-orange-400" />}
                        </Link>

                        {/* Locked tooltip */}
                        {isFeatureLocked && (
                          <div className="invisible group-hover:visible absolute left-full top-0 ml-2 bg-orange-900 text-orange-100 text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                            Activate plan to use this feature
                          </div>
                        )}

                        {/* Collapsed label tooltip */}
                        {collapsed && !isMobile && !isFeatureLocked && (
                          <div className="invisible group-hover:visible absolute left-full top-0 ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 border border-gray-700">
                            {item.label}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        })()}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-200 space-y-1 flex-shrink-0">
        <button
          onClick={() => { handleLogout(); if (onMobileClose) onMobileClose() }}
          title={collapsed && !isMobile ? 'Logout' : ''}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#1C1E21] hover:bg-[#F0F2F5] transition
            ${collapsed && !isMobile ? 'justify-center' : ''}
          `}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col lg:hidden">
          <SidebarContent isMobile={true} />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex lg:flex-col flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent isMobile={false} />
      </div>
    </>
  )
}
