/**
 * Role to Business Permissions Mapping
 * Maps user roles to Meta API scopes and feature access
 */

/**
 * Available scopes from Meta Business Advanced Management
 * These scopes control which features an account can access
 */
export const AVAILABLE_SCOPES = {
  templates: 'templates',           // Create, edit, approve templates
  campaigns: 'campaigns',           // Create, schedule, manage campaigns
  contacts: 'contacts',             // Import, segment, manage contacts
  broadcasts: 'broadcasts',         // Send bulk messages
  analytics: 'analytics',           // View analytics & reports
  team_management: 'team_management', // Manage agents & team
  integrations: 'integrations',     // Connect third-party tools
  webhooks: 'webhooks',             // Manage webhook subscriptions
};

/**
 * Role-based permission levels and scopes
 * Defines what features each role can access
 */
export const ROLE_PERMISSIONS = {
  superadmin: {
    permissionLevel: 'full',      // Highest permission level
    scopes: Object.values(AVAILABLE_SCOPES), // All scopes
    description: 'Full access to all features',
  },
  
  admin: {
    permissionLevel: 'advanced',  // Advanced permission level
    scopes: [
      AVAILABLE_SCOPES.templates,
      AVAILABLE_SCOPES.campaigns,
      AVAILABLE_SCOPES.contacts,
      AVAILABLE_SCOPES.broadcasts,
      AVAILABLE_SCOPES.analytics,
      AVAILABLE_SCOPES.team_management,
      AVAILABLE_SCOPES.integrations,
    ],
    description: 'Admin access to templates, campaigns, and team management',
  },
  
  manager: {
    permissionLevel: 'advanced',  // Advanced permission level
    scopes: [
      AVAILABLE_SCOPES.templates,
      AVAILABLE_SCOPES.campaigns,
      AVAILABLE_SCOPES.contacts,
      AVAILABLE_SCOPES.broadcasts,
      AVAILABLE_SCOPES.analytics,
      AVAILABLE_SCOPES.team_management,
    ],
    description: 'Manager can manage templates, campaigns, contacts, and team',
  },
  
  agent: {
    permissionLevel: 'basic',     // Basic permission level
    scopes: [
      AVAILABLE_SCOPES.broadcasts, // Can only send broadcasts (limited)
      AVAILABLE_SCOPES.contacts,   // Can view contacts
    ],
    description: 'Agents can send broadcasts and view contacts',
  },
  
  user: {
    permissionLevel: 'basic',     // Basic permission level
    scopes: [
      AVAILABLE_SCOPES.contacts,   // View-only access to contacts
    ],
    description: 'Users have view-only access',
  },
};

/**
 * Permission checks for specific features
 * Used by controllers to validate if user can perform action
 */
export const FEATURE_SCOPE_MAP = {
  // Template operations
  'template:create': AVAILABLE_SCOPES.templates,
  'template:edit': AVAILABLE_SCOPES.templates,
  'template:sync': AVAILABLE_SCOPES.templates,
  'template:delete': AVAILABLE_SCOPES.templates,
  'template:approve': AVAILABLE_SCOPES.templates,
  
  // Campaign operations
  'campaign:create': AVAILABLE_SCOPES.campaigns,
  'campaign:schedule': AVAILABLE_SCOPES.campaigns,
  'campaign:edit': AVAILABLE_SCOPES.campaigns,
  'campaign:pause': AVAILABLE_SCOPES.campaigns,
  'campaign:resume': AVAILABLE_SCOPES.campaigns,
  'campaign:delete': AVAILABLE_SCOPES.campaigns,
  
  // Broadcast operations
  'broadcast:send': AVAILABLE_SCOPES.broadcasts,
  'broadcast:schedule': AVAILABLE_SCOPES.broadcasts,
  
  // Contact operations
  'contact:view': AVAILABLE_SCOPES.contacts,
  'contact:import': AVAILABLE_SCOPES.contacts,
  'contact:segment': AVAILABLE_SCOPES.contacts,
  'contact:export': AVAILABLE_SCOPES.contacts,
  
  // Team operations
  'team:manage': AVAILABLE_SCOPES.team_management,
  'agent:assign': AVAILABLE_SCOPES.team_management,
  'agent:update': AVAILABLE_SCOPES.team_management,
  
  // Analytics operations
  'analytics:view': AVAILABLE_SCOPES.analytics,
  'report:generate': AVAILABLE_SCOPES.analytics,
  
  // Integration operations
  'integration:connect': AVAILABLE_SCOPES.integrations,
  'integration:manage': AVAILABLE_SCOPES.integrations,
};

/**
 * Get scopes for a user role
 * @param {string} role - The user role
 * @returns {array} Array of scopes the role has access to
 */
export const getScopesForRole = (role) => {
  return ROLE_PERMISSIONS[role]?.scopes || ROLE_PERMISSIONS.user.scopes;
};

/**
 * Get permission level for a user role
 * @param {string} role - The user role
 * @returns {string} The permission level (basic, advanced, full)
 */
export const getPermissionLevelForRole = (role) => {
  return ROLE_PERMISSIONS[role]?.permissionLevel || 'basic';
};

/**
 * Check if a role has a specific scope
 * @param {string} role - The user role
 * @param {string} scope - The scope to check
 * @returns {boolean} True if role has the scope
 */
export const roleHasScope = (role, scope) => {
  const scopes = getScopesForRole(role);
  return scopes.includes(scope);
};

/**
 * Check if a role can perform a feature action
 * @param {string} role - The user role
 * @param {string} feature - The feature action (e.g., 'template:create')
 * @returns {boolean} True if role can perform the action
 */
export const canPerformFeature = (role, feature) => {
  const requiredScope = FEATURE_SCOPE_MAP[feature];
  if (!requiredScope) {
    return false; // Unknown feature
  }
  return roleHasScope(role, requiredScope);
};
