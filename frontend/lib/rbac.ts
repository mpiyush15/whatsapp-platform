/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines permissions for each user role
 */

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  USER = 'user'
}

/**
 * Route access configuration
 * Defines which roles can access which routes
 */
export const routeAccess = {
  // Dashboard
  '/dashboard': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  '/dashboard/home': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  
  // Broadcasts - Allow USER role for clients
  '/dashboard/broadcasts': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  '/dashboard/broadcasts/new': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  '/dashboard/broadcasts/schedule': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  '/dashboard/broadcasts/create': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  
  // Contacts - Allow USER role for clients
  '/dashboard/contacts': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  '/dashboard/contacts/import': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  
  // Messages
  '/dashboard/messages': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
  
  // Templates - Allow USER role for clients
  '/dashboard/templates': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  
  // Chatbot - Allow USER role for clients
  '/dashboard/chatbot': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  '/dashboard/chatbot/builder': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  
  // Live Chat - Allow USER role for clients
  '/dashboard/live-chat-v2': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  
  // Campaigns - Allow USER role for clients
  '/dashboard/campaigns': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  '/dashboard/campaigns/new': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  '/dashboard/campaigns/create': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  
  // Leads - Allow USER role for clients
  '/dashboard/leads': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  
  // Analytics - Admin only
  '/dashboard/analytics': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  '/dashboard/reports': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  
  // Team
  '/dashboard/team': [UserRole.SUPERADMIN, UserRole.ADMIN],
  '/dashboard/team/members': [UserRole.SUPERADMIN, UserRole.ADMIN],
  '/dashboard/team/roles': [UserRole.SUPERADMIN, UserRole.ADMIN],
  
  // Agents
  '/dashboard/agents': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  '/dashboard/agents/create': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  '/dashboard/agents/onboarding': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
  
  // Billing
  '/dashboard/billing': [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  '/dashboard/billing/invoices': [UserRole.SUPERADMIN],
  '/dashboard/billing/subscriptions': [UserRole.SUPERADMIN],
  
  // Invoices - SuperAdmin only
  '/dashboard/invoices': [UserRole.SUPERADMIN],
  
  // Transactions - Allow all authenticated users to view their transactions
  '/dashboard/transactions': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  
  // Account - Org Admins only
  '/dashboard/account': [UserRole.ADMIN, UserRole.MANAGER],
  
  // Settings
  '/dashboard/settings': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  '/dashboard/settings/account': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  '/dashboard/settings/security': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER],
  '/dashboard/settings/whatsapp-setup': [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER],
  
  // SuperAdmin only routes
  '/dashboard/organizations': [UserRole.SUPERADMIN],
  '/dashboard/system-health': [UserRole.SUPERADMIN],
  '/dashboard/platform-billing': [UserRole.SUPERADMIN],
  '/dashboard/website-settings': [UserRole.SUPERADMIN],
}

/**
 * Sidebar navigation items based on user role
 */
export const getSidebarItems = (role: UserRole) => {
  const baseItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER]
    },
    {
      label: 'Messages',
      href: '/dashboard/live-chat-v2',
      icon: 'MessageSquare',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER]
    },
    {
      label: 'Contacts',
      href: '/dashboard/contacts',
      icon: 'Users',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]
    },
    {
      label: 'Broadcasts',
      href: '/dashboard/broadcasts',
      icon: 'Megaphone',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]
    },
    {
      label: 'Templates',
      href: '/dashboard/templates',
      icon: 'FileText',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER]
    },
    {
      label: 'Chatbot',
      href: '/dashboard/chatbot',
      icon: 'Bot',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]
    },
    {
      label: 'Leads',
      href: '/dashboard/leads',
      icon: 'Target',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER]
    },
    {
      label: 'Campaigns',
      href: '/dashboard/campaigns',
      icon: 'Target',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]
    },
    {
      label: 'Analytics',
      href: '/dashboard/analytics',
      icon: 'BarChart3',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]
    },
    {
      label: 'Team',
      href: '/dashboard/team',
      icon: 'Users2',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN]
    },
    {
      label: 'Agents',
      href: '/dashboard/agents',
      icon: 'Headset',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER]
    },
    {
      label: 'Billing',
      href: '/dashboard/billing',
      icon: 'CreditCard',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER]
    },
    {
      label: 'Account',
      href: '/dashboard/account',
      icon: 'User',
      roles: [UserRole.ADMIN, UserRole.MANAGER]
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: 'Settings',
      roles: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.USER]
    }
  ]

  // Filter items based on user role
  return baseItems.filter(item => item.roles.includes(role))
}

/**
 * Feature permissions based on role
 */
export const featurePermissions = {
  [UserRole.SUPERADMIN]: {
    broadcastMessages: true,
    createCampaigns: true,
    manageTeam: true,
    manageBilling: true,
    viewAnalytics: true,
    manageTemplates: true,
    createChatbot: true,
    manageSettings: true,
    viewAllData: true,
    exportData: true,
    apiAccess: true
  },
  [UserRole.ADMIN]: {
    broadcastMessages: true,
    createCampaigns: true,
    manageTeam: true,
    manageBilling: true,
    viewAnalytics: true,
    manageTemplates: true,
    createChatbot: true,
    manageSettings: true,
    viewAllData: true,
    exportData: true,
    apiAccess: true
  },
  [UserRole.MANAGER]: {
    broadcastMessages: true,
    createCampaigns: true,
    manageTeam: false,
    manageBilling: false,
    viewAnalytics: true,
    manageTemplates: true,
    createChatbot: true,
    manageSettings: true,
    viewAllData: true,
    exportData: true,
    apiAccess: false
  },
  [UserRole.AGENT]: {
    broadcastMessages: true,
    createCampaigns: false,
    manageTeam: false,
    manageBilling: false,
    viewAnalytics: false,
    manageTemplates: false,
    createChatbot: false,
    manageSettings: true,
    viewAllData: false,
    exportData: false,
    apiAccess: false
  },
  [UserRole.USER]: {
    broadcastMessages: false,
    createCampaigns: false,
    manageTeam: false,
    manageBilling: false,
    viewAnalytics: false,
    manageTemplates: false,
    createChatbot: false,
    manageSettings: true,
    viewAllData: false,
    exportData: false,
    apiAccess: false
  }
}

/**
 * Check if user has permission for a feature
 */
export const hasPermission = (role: UserRole, feature: keyof typeof featurePermissions[UserRole.SUPERADMIN]): boolean => {
  return featurePermissions[role]?.[feature] ?? false
}

/**
 * Check if user can access a route
 */
export const canAccessRoute = (role: UserRole, route: string): boolean => {
  const allowedRoles = routeAccess[route as keyof typeof routeAccess]
  return allowedRoles ? allowedRoles.includes(role) : true
}

/**
 * Role descriptions
 */
export const roleDescriptions = {
  [UserRole.SUPERADMIN]: 'Full platform access, manage all features and users',
  [UserRole.ADMIN]: 'Admin access, manage teams, billing, and campaigns',
  [UserRole.MANAGER]: 'Manager access, create campaigns and manage agents',
  [UserRole.AGENT]: 'Agent access, send messages and manage contacts',
  [UserRole.USER]: 'Limited access, can only update own settings'
}
