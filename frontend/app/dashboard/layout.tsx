"use client"

import { 
  MessageSquare, LayoutDashboard, Send, Users, BarChart3, Settings, 
  Bell, Search, ChevronDown, Menu, X, Megaphone, Bot, Calendar,
  FileText, LogOut, User, ChevronLeft, ChevronRight, Building2, 
  Activity, DollarSign, Sliders, CreditCard, Receipt, BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorToast } from "@/components/ErrorToast"
import { API_URL } from "@/lib/config/api"
import AccountDrawer from "@/components/AccountDrawer"
import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { authService, User as UserType, UserRole } from "@/lib/auth"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { canAccessRoute } from "@/lib/rbac"

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<UserType | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState("")
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'inactive' | 'expired' | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [])

  // 🔐 ROUTE PROTECTION: Show error if accessing wrong tier
  useEffect(() => {
    if (!user || !pathname.startsWith('/dashboard')) return;

    const userType = user.type;
    const userRole = user.role;
    
    // Debug log
    console.log('🔐 Dashboard Access Check:', { userType, userRole, pathname });
    
    const isSuperAdminTier = pathname.startsWith('/dashboard/superadmin');
    const isClientTier = pathname.startsWith('/dashboard/client');
    const isFeaturesTier = pathname.startsWith('/dashboard/features');
    const isDashboardRoot = pathname === '/dashboard';
    
    // Skip validation for dashboard root (it's redirecting)
    if (isDashboardRoot) return;
    
    // Only check if on a tier-specific route
    if (isSuperAdminTier || isClientTier) {
      let hasAccess = false;
      
      // Superadmin access
      if (userType === 'internal' && userRole === 'superadmin' && isSuperAdminTier) {
        hasAccess = true;
      } 
      // Client & Agency access (both use /dashboard/client tier)
      else if ((userType === 'client' || userType === 'agency') && ['admin', 'manager', 'agent', 'user'].includes(userRole) && isClientTier) {
        hasAccess = true;
      }
      
      // If no access, show error
      if (!hasAccess) {
        setError(`🚫 Access Denied: You don't have permission to access this dashboard tier. Your account: ${userType}/${userRole}`)
      }
    }
  }, [user, pathname])

  // 🔐 Setup inactivity timeout and activity tracking
  useEffect(() => {
    // Check for inactivity on mount
    if (authService.checkInactivityTimeout()) {
      router.push('/login?expired=true');
      return;
    }

    // Track user activity
    const handleActivity = () => {
      authService.updateActivity();
      console.log('📍 Activity tracked at:', new Date().toLocaleTimeString());
    };

    // Listen for user activity
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Check inactivity every 30 seconds
    const inactivityCheckInterval = setInterval(() => {
      if (authService.checkInactivityTimeout()) {
        router.push('/login?expired=true');
        clearInterval(inactivityCheckInterval);
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(inactivityCheckInterval);
    };
  }, [router])

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        const response = await fetch(`${API_URL}/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.data && Array.isArray(data.data)) {
            // Find the first active subscription
            const activeSubscription = data.data.find((sub: any) => sub.status === 'active')
            const status = activeSubscription ? 'active' : 'inactive'
            setSubscriptionStatus(status)
          } else if (data.data) {
            const status = data.data.status || 'inactive'
            setSubscriptionStatus(status)
          }
        }
      } catch (error) {
        console.error("Error fetching subscription:", error)
      }
    }

    if (user?.accountId) {
      fetchSubscriptionStatus()
      // Check subscription every minute
      const interval = setInterval(fetchSubscriptionStatus, 60000)
      return () => clearInterval(interval)
    }
  }, [user?.accountId])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token")
        
        // Only fetch if token exists
        if (!token) {
          console.warn('⚠️ No token in localStorage, skipping notifications fetch');
          return;
        }
        
        const response = await fetch(
          `${API_URL}/notifications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        )
        
        if (!response.ok) {
          console.error('Notifications fetch failed:', response.status, response.statusText);
          return;
        }
        
        const data = await response.json()
        if (data.success) {
          setNotifications(data.data?.notifications || [])
          const unread = (data.data?.notifications || []).filter((n: any) => !n.read).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
      }
    }

    if (user?.accountId) {
      fetchNotifications()
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      
      return () => clearInterval(interval)
    }
  }, [user?.accountId])

  const handleLogout = async () => {
    try {
      await authService.logout()
      // Ensure clear before redirect
      setTimeout(() => {
        router.push("/auth/login")
      }, 100)
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if logout fails
      router.push("/auth/login")
    }
  }

  // Determine which tier folder they're in
  const isSuperAdminTier = pathname.startsWith('/dashboard/superadmin')
  const isClientTier = pathname.startsWith('/dashboard/client')

  // Get dashboard href based on tier
  let dashboardHref = '/dashboard'
  if (isSuperAdminTier) dashboardHref = '/dashboard/superadmin'
  if (isClientTier) dashboardHref = '/dashboard/client'

  // Create tier-specific navigation
  let navigation = []

  if (isSuperAdminTier) {
    // Superadmin navigation - ONLY superadmin pages
    navigation = [
      { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/superadmin", roles: [UserRole.SUPERADMIN] },
      { name: "Organizations", icon: Building2, href: "/dashboard/superadmin/organizations", roles: [UserRole.SUPERADMIN] },
      { name: "Demo Requests", icon: BookOpen, href: "/dashboard/superadmin/admin/demo-requests", roles: [UserRole.SUPERADMIN] },
      { name: "System Health", icon: Activity, href: "/dashboard/superadmin/system-health", roles: [UserRole.SUPERADMIN] },
      { name: "Transactions", icon: CreditCard, href: "/dashboard/superadmin/transactions", roles: [UserRole.SUPERADMIN] },
      { name: "Invoices", icon: Receipt, href: "/dashboard/superadmin/invoices", roles: [UserRole.SUPERADMIN] },
      { name: "Plans and Offers", icon: Sliders, href: "/dashboard/superadmin/plans-and-offers", roles: [UserRole.SUPERADMIN] },
      { name: "🧪 Test Data", icon: Activity, href: "/dashboard/superadmin/test-data", roles: [UserRole.SUPERADMIN] },
    ]
  } else if (isClientTier) {
    // Client tier navigation (for both client & agency account types)
    // Shows all features based on user role
    navigation = [
      { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/client", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER] },
      { name: "Live Chat", icon: MessageSquare, href: "/dashboard/features/live-chat", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER] },
      { name: "Broadcasts", icon: Megaphone, href: "/dashboard/features/broadcasts", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { name: "Contacts", icon: Users, href: "/dashboard/features/contacts", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER] },
      { name: "Templates", icon: FileText, href: "/dashboard/features/templates", roles: [UserRole.ADMIN, UserRole.MANAGER] },
      { name: "Campaigns", icon: Calendar, href: "/dashboard/features/campaigns", roles: [UserRole.ADMIN, UserRole.MANAGER] },
      { name: "Chatbot", icon: Bot, href: "/dashboard/features/chatbot", roles: [UserRole.ADMIN, UserRole.MANAGER] },
      { name: "Analytics", icon: BarChart3, href: "/dashboard/features/analytics", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER] },
      { name: "Billing", icon: CreditCard, href: "/dashboard/client/billing", roles: [UserRole.ADMIN, UserRole.MANAGER] },
    ]
  }

  // Filter navigation based on user role
  const filteredNavigation = user 
    ? navigation.filter(item => item.roles.includes(user.role))
    : navigation

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-white">Replysys</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            {/* Scrollable Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === item.href
                      ? "bg-green-600 text-white"
                      : "text-gray-100 hover:bg-gray-800"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}
            </nav>
            
            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-800 space-y-2 flex-shrink-0">
              <Link
                href={`${dashboardHref}/settings`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-100 hover:bg-gray-800 transition"
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => {
                  handleLogout()
                  setSidebarOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-100 hover:bg-gray-800 transition"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? "lg:w-20" : "lg:w-64"
      }`}>
        <div className="flex flex-col flex-1 min-h-0 bg-gray-900 border-r border-gray-800">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
            {!sidebarCollapsed && (
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-white">Replysys</span>
              </Link>
            )}
            {sidebarCollapsed && (
              <Link href="/" className="mx-auto">
                <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-white transition"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  pathname === item.href
                    ? "bg-green-600 text-white"
                    : "text-gray-100 hover:bg-gray-800"
                } ${sidebarCollapsed ? "justify-center" : ""} ${
                  (item as any).superAdminOnly ? "border-t border-gray-800 mt-2 pt-3" : ""
                }`}
                title={sidebarCollapsed ? item.name : ""}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
                {!sidebarCollapsed && (item as any).superAdminOnly && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-purple-500 text-white rounded">SA</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-800">
            {!isSuperAdminTier && (
              <Link
                href={`${dashboardHref}/settings`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-100 hover:bg-gray-800 transition mb-1 ${
                  sidebarCollapsed ? "justify-center" : ""
                }`}
                title={sidebarCollapsed ? "Settings" : ""}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>Settings</span>}
              </Link>
            )}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-100 hover:bg-gray-800 transition mb-1 ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
              title={sidebarCollapsed ? "Logout" : ""}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
      }`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600"
              >
                <Menu className="h-6 w-6" />
              </button>
              {user && (
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">Welcome, {user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              )}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative text-gray-600 hover:text-gray-900"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => {
                            setNotifications(notifications.map(n => ({ ...n, read: true })))
                            setUnreadCount(0)
                          }}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification, index) => (
                          <div 
                            key={index}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                              !notification.read ? 'bg-green-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                                !notification.read ? 'bg-green-600' : 'bg-gray-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                                <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setAccountDrawerOpen(true)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <ChevronDown className="h-4 w-4 hidden sm:block" />
              </button>
            </div>
          </div>
        </header>

        {/* ✅ Subscription Status Banner */}
        {subscriptionStatus && subscriptionStatus !== 'active' && user?.role !== UserRole.SUPERADMIN && (
          <div className={`px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 ${
            subscriptionStatus === 'inactive' ? 'bg-yellow-50 border-b border-yellow-200' :
            subscriptionStatus === 'expired' ? 'bg-red-50 border-b border-red-200' :
            'bg-gray-50 border-b border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${
                subscriptionStatus === 'inactive' ? 'bg-yellow-500' :
                subscriptionStatus === 'expired' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <div>
                <p className={`font-medium text-sm ${
                  subscriptionStatus === 'inactive' ? 'text-yellow-900' :
                  subscriptionStatus === 'expired' ? 'text-red-900' :
                  'text-gray-900'
                }`}>
                  {subscriptionStatus === 'inactive' ? '⚠️ No Active Subscription' :
                   subscriptionStatus === 'expired' ? '❌ Subscription Expired' :
                   '⏳ Subscription Status'}
                </p>
                <p className={`text-xs mt-1 ${
                  subscriptionStatus === 'inactive' ? 'text-yellow-700' :
                  subscriptionStatus === 'expired' ? 'text-red-700' :
                  'text-gray-700'
                }`}>
                  {subscriptionStatus === 'inactive' ? 'Please upgrade your subscription to use this feature.' :
                   subscriptionStatus === 'expired' ? 'Your subscription has expired. Please renew to continue.' :
                   'Check your subscription status.'}
                </p>
              </div>
            </div>
            <Link 
              href={`${dashboardHref}/account/billing`}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex-shrink-0 ${
                subscriptionStatus === 'inactive' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                subscriptionStatus === 'expired' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {subscriptionStatus === 'inactive' ? 'Upgrade' : 'Renew'}
            </Link>
          </div>
        )}

        {/* Main Content Area */}
        <main>{children}</main>
      </div>

      {/* Account Drawer */}
      <AccountDrawer 
        isOpen={accountDrawerOpen} 
        onClose={() => setAccountDrawerOpen(false)} 
      />
    </div>
  )
}

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
