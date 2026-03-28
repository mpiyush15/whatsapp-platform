// User roles
export enum UserRole {
  SUPERADMIN = "superadmin",  // Platform owner - your team
  ADMIN = "admin",             // Organization owner - client
  MANAGER = "manager",         // Team lead - client's manager
  AGENT = "agent",             // Customer support - client's agent
  USER = "user",               // Read-only viewer
}

// User type
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  type?: string // Account type: 'internal', 'client', 'agency' (see AccountType enum in enums.ts)
  phoneNumber?: string
  company?: string
  accountId?: string
  status?: string // 'active' or 'pending' (payment pending)
  plan?: string // 'free', 'starter', 'pro', 'enterprise'
  billingCycle?: string // 'monthly', 'quarterly', 'annual'
  isDemoAccount?: boolean // Demo account flag
  demoLabel?: string | null // 'demo', 'test', 'staging', null
  demoNote?: string // Demo account description
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

// Real authentication with backend API
export const authService = {
  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("isAuthenticated") === "true"
  },

  // Get current user
  getCurrentUser: (): User | null => {
    if (typeof window === "undefined") return null
    const userStr = localStorage.getItem("user")
    if (!userStr) return null
    return JSON.parse(userStr)
  },

  // Login - Real API call
  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      const token = data.data?.token || data.token
      console.log('🔐 Login response:', { status: response.status, success: data.success, hasToken: !!token });

      if (response.ok && data.success && token) {
        const user: User = {
          id: data.data.user.accountId || '1',
          email: data.data.user.email,
          name: data.data.user.name,
          role: data.data.user.role === 'superadmin' ? UserRole.SUPERADMIN : 
                data.data.user.role === 'admin' ? UserRole.ADMIN : 
                data.data.user.role === 'manager' ? UserRole.MANAGER : 
                data.data.user.role === 'agent' ? UserRole.AGENT : UserRole.USER,
          accountId: data.data.user.accountId,
          status: data.data.user.status,
          plan: data.data.user.plan,
          billingCycle: data.data.user.billingCycle,
          isDemoAccount: data.data.user.isDemoAccount || false,
          demoLabel: data.data.user.demoLabel || null,
          demoNote: data.data.user.demoNote || null
        }

        // Store JWT token instead of session
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("user", JSON.stringify(user))
        localStorage.setItem("token", token)
        
        console.log('✅ Token stored:', {
          isAuthenticated: localStorage.getItem("isAuthenticated"),
          hasToken: !!localStorage.getItem("token"),
          tokenLength: token.length,
          isDemoAccount: user.isDemoAccount
        });

        return { success: true, user }
      } else {
        console.log('❌ Login failed:', data.message);
        return { success: false, error: data.message || "Login failed" }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: "Login failed. Please try again." }
    }
  },

  // Signup/Register
  signup: async (name: string, email: string, password: string, company?: string, phone?: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, company, phone })
      })

      const data = await response.json()
      console.log('📝 Signup response:', { status: response.status, success: data.success, hasToken: !!data.token });

      if (response.ok && data.success && data.token) {
        const user: User = {
          id: data.user.accountId || '1',
          email: data.user.email,
          name: data.user.name,
          role: data.user.role === 'superadmin' ? UserRole.SUPERADMIN : 
                data.user.role === 'admin' ? UserRole.ADMIN : 
                data.user.role === 'manager' ? UserRole.MANAGER : 
                data.user.role === 'agent' ? UserRole.AGENT : UserRole.USER,
          accountId: data.user.accountId,
          status: data.user.status,
          plan: data.user.plan,
          billingCycle: data.user.billingCycle,
          isDemoAccount: data.user.isDemoAccount || false,
          demoLabel: data.user.demoLabel || null,
          demoNote: data.user.demoNote || null
        }

        // Store JWT token instead of session
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("user", JSON.stringify(user))
        localStorage.setItem("token", data.token)
        
        console.log('✅ Account created and logged in');

        return { success: true, user, token: data.token }
      } else {
        console.log('❌ Signup failed:', data.message);
        return { success: false, error: data.message || "Signup failed" }
      }
    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, error: "Signup failed. Please try again." }
    }
  },

  // Get JWT token
  getToken: (): string | null => {
    if (typeof window === "undefined") return null
    const token = localStorage.getItem("token")
    console.log('🔑 Getting token:', { hasToken: !!token, tokenLength: token?.length || 0 });
    return token
  },

  // Logout
  logout: async () => {
    try {
      const token = localStorage.getItem("token")
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      if (typeof window !== "undefined") {
        // Clear session lock and activity tracking
        localStorage.removeItem("isAuthenticated")
        localStorage.removeItem("user")
        localStorage.removeItem("token")
        localStorage.removeItem("replysys_session_lock")
        localStorage.removeItem("replysys_last_activity")
        console.log('✅ All sessions cleared');
      }
    }
  },

  // Check inactivity timeout (5 minutes)
  checkInactivityTimeout: () => {
    if (typeof window === "undefined") return false
    const lastActivity = localStorage.getItem("replysys_last_activity")
    if (!lastActivity) return false
    
    const lastActivityTime = parseInt(lastActivity, 10)
    const currentTime = Date.now()
    const inactivityTime = currentTime - lastActivityTime
    const INACTIVITY_LIMIT = 5 * 60 * 1000 // 5 minutes
    
    if (inactivityTime > INACTIVITY_LIMIT) {
      console.log('⏰ Session timeout due to inactivity');
      authService.logout();
      return true
    }
    return false
  },

  // Update last activity time
  updateActivity: () => {
    if (typeof window !== "undefined" && localStorage.getItem("isAuthenticated") === "true") {
      localStorage.setItem("replysys_last_activity", Date.now().toString())
    }
  },

  // Check if user has required role
  hasRole: (user: User | null, allowedRoles: UserRole[]): boolean => {
    if (!user) return false
    return allowedRoles.includes(user.role)
  },
}

// Get JWT token from localStorage
export const getJWT = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

// Standalone login function for easy import
export const login = async (email: string, password: string) => {
  return authService.login(email, password)
}

// Standalone signup function
export const signup = async (name: string, email: string, password: string, company?: string, phone?: string) => {
  return authService.signup(name, email, password, company, phone)
}

// Role-based permissions
export const permissions = {
  // Pages accessible by role (SuperAdmin has access to everything)
  canAccessBroadcasts: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
  canAccessContacts: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
  canAccessTemplates: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  canAccessChatbot: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  canAccessChat: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
  canAccessAnalytics: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  canAccessCampaigns: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  canAccessSettings: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  
  // SuperAdmin exclusive features
  canAccessPlatformSettings: [UserRole.SUPERADMIN],
  canManageOrganizations: [UserRole.SUPERADMIN],
  canViewAllClients: [UserRole.SUPERADMIN],
  canManageBilling: [UserRole.SUPERADMIN, UserRole.ADMIN],
  canManageTeam: [UserRole.SUPERADMIN, UserRole.ADMIN],
  canDeleteCampaigns: [UserRole.SUPERADMIN, UserRole.ADMIN],
  canExportData: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
}
