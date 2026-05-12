/**
 * Staff access uses route keys = path under /dashboard/... without the /dashboard prefix.
 * In the app, project pages rewrite /dashboard -> /projects/:projectId (suffix stays the same).
 * Examples: "healthcare/patients", "live-chat-v2", "home" (project dashboard).
 */

export const STAFF_ROUTE_KEYS = [
  'staff',
  'home',
  'healthcare',
  'healthcare/clinic-setup',
  'healthcare/patients',
  'healthcare/doctors',
  'healthcare/staff',
  'healthcare/nurses',
  'healthcare/appointments',
  'healthcare/frontdesk',
  'healthcare/prescriptions',
  'healthcare/pharmacy',
  'healthcare/inventory',
  'healthcare/billing',
  'healthcare/compliance',
  'leads',
  'contacts',
  'live-chat-v2',
  'chatbot',
  'flow',
  'templates',
  'broadcasts',
  'campaigns',
  'analytics',
  'account',
  'billing',
  'settings',
];

/** Legacy module keys from clinic setup → equivalent route keys */
export const MODULE_TO_ROUTES = {
  patients: ['healthcare/patients'],
  appointments: ['healthcare/appointments'],
  frontdesk: ['healthcare/frontdesk'],
  doctors: ['healthcare/doctors', 'healthcare/staff'],
  nurses: ['healthcare/nurses'],
  prescriptions: ['healthcare/prescriptions'],
  pharmacy: ['healthcare/pharmacy'],
  inventory: ['healthcare/inventory'],
  billing: ['healthcare/billing'],
  compliance: ['healthcare/compliance'],
  whatsapp: ['chatbot', 'flow', 'templates', 'live-chat-v2', 'broadcasts'],
  'flow-builder': ['flow'],
};

export function modulesToRoutes(modules) {
  const set = new Set(['staff', 'home', 'healthcare']);
  for (const m of modules || []) {
    const routes = MODULE_TO_ROUTES[m];
    if (routes) routes.forEach((r) => set.add(r));
  }
  return [...set].filter((r) => STAFF_ROUTE_KEYS.includes(r));
}

export const ROLE_ROUTE_PRESETS = {
  doctor: ['staff', 'healthcare', 'healthcare/patients', 'healthcare/appointments', 'healthcare/doctors', 'healthcare/prescriptions'],
  head_doctor: [
    'staff',
    'home',
    'healthcare',
    'healthcare/clinic-setup',
    'healthcare/patients',
    'healthcare/doctors',
    'healthcare/staff',
    'healthcare/nurses',
    'healthcare/appointments',
    'healthcare/frontdesk',
    'healthcare/prescriptions',
    'healthcare/pharmacy',
    'healthcare/inventory',
    'healthcare/billing',
    'healthcare/compliance',
  ],
  nurse: ['staff', 'healthcare', 'healthcare/patients', 'healthcare/appointments', 'healthcare/nurses', 'healthcare/prescriptions'],
  receptionist: ['staff', 'healthcare', 'healthcare/patients', 'healthcare/appointments', 'healthcare/frontdesk'],
  billing: ['staff', 'healthcare', 'healthcare/patients', 'healthcare/appointments', 'healthcare/billing'],
  admin: [...STAFF_ROUTE_KEYS],
};

export function normalizeAllowedRoutes(role, incomingRoutes) {
  const preset = ROLE_ROUTE_PRESETS[role] || ROLE_ROUTE_PRESETS.doctor;
  if (!Array.isArray(incomingRoutes) || incomingRoutes.length === 0) {
    return preset;
  }
  const sanitized = [...new Set(
    incomingRoutes
      .map((r) => String(r || '').trim())
      .filter((r) => STAFF_ROUTE_KEYS.includes(r))
  )];
  return sanitized.length ? sanitized : preset;
}

export function resolveStaffRoutes(row) {
  if (Array.isArray(row.allowedRoutes) && row.allowedRoutes.length > 0) {
    return row.allowedRoutes;
  }
  if (Array.isArray(row.allowedModules) && row.allowedModules.length > 0) {
    return modulesToRoutes(row.allowedModules);
  }
  return ROLE_ROUTE_PRESETS[row.role] || ROLE_ROUTE_PRESETS.doctor;
}
