/**
 * Mirrors backend/src/constants/healthcareStaffRoutes.js for UI + legacy session handling.
 */

export const STAFF_ROUTE_KEYS = [
  "staff",
  "home",
  "healthcare",
  "healthcare/clinic-setup",
  "healthcare/patients",
  "healthcare/doctors",
  "healthcare/staff",
  "healthcare/nurses",
  "healthcare/appointments",
  "healthcare/frontdesk",
  "healthcare/prescriptions",
  "healthcare/pharmacy",
  "healthcare/inventory",
  "healthcare/billing",
  "healthcare/compliance",
  "leads",
  "contacts",
  "live-chat-v2",
  "chatbot",
  "flow",
  "templates",
  "broadcasts",
  "campaigns",
  "analytics",
  "account",
  "billing",
  "settings",
] as const

export type StaffRouteKey = (typeof STAFF_ROUTE_KEYS)[number]

export const MODULE_TO_ROUTES: Record<string, string[]> = {
  patients: ["healthcare/patients"],
  appointments: ["healthcare/appointments"],
  frontdesk: ["healthcare/frontdesk"],
  doctors: ["healthcare/doctors", "healthcare/staff"],
  nurses: ["healthcare/nurses"],
  prescriptions: ["healthcare/prescriptions"],
  pharmacy: ["healthcare/pharmacy"],
  inventory: ["healthcare/inventory"],
  billing: ["healthcare/billing"],
  compliance: ["healthcare/compliance"],
  whatsapp: ["chatbot", "flow", "templates", "live-chat-v2", "broadcasts"],
  "flow-builder": ["flow"],
}

export function modulesToRoutes(modules: string[]): string[] {
  const set = new Set<string>(["staff", "home", "healthcare"])
  for (const m of modules || []) {
    const routes = MODULE_TO_ROUTES[m]
    if (routes) routes.forEach((r) => set.add(r))
  }
  return [...set].filter((r) => STAFF_ROUTE_KEYS.includes(r as StaffRouteKey))
}

export const ROLE_ROUTE_PRESETS: Record<string, string[]> = {
  doctor: ["staff", "healthcare", "healthcare/patients", "healthcare/appointments", "healthcare/doctors", "healthcare/prescriptions"],
  head_doctor: [
    "staff",
    "home",
    "healthcare",
    "healthcare/clinic-setup",
    "healthcare/patients",
    "healthcare/doctors",
    "healthcare/staff",
    "healthcare/nurses",
    "healthcare/appointments",
    "healthcare/frontdesk",
    "healthcare/prescriptions",
    "healthcare/pharmacy",
    "healthcare/inventory",
    "healthcare/billing",
    "healthcare/compliance",
  ],
  nurse: ["staff", "healthcare", "healthcare/patients", "healthcare/appointments", "healthcare/nurses", "healthcare/prescriptions"],
  receptionist: ["staff", "healthcare", "healthcare/patients", "healthcare/appointments", "healthcare/frontdesk"],
  billing: ["staff", "healthcare", "healthcare/patients", "healthcare/appointments", "healthcare/billing"],
  admin: [...STAFF_ROUTE_KEYS],
}

export const STAFF_ROUTE_LABELS: Record<string, string> = {
  staff: "Staff home (welcome)",
  home: "Project dashboard",
  healthcare: "Healthcare overview",
  "healthcare/clinic-setup": "Clinic setup",
  "healthcare/patients": "Patients",
  "healthcare/doctors": "Doctors",
  "healthcare/staff": "Staff & logins",
  "healthcare/nurses": "Nurses",
  "healthcare/appointments": "Appointments",
  "healthcare/frontdesk": "Front desk",
  "healthcare/prescriptions": "Prescriptions",
  "healthcare/pharmacy": "Medicine master",
  "healthcare/inventory": "Inventory",
  "healthcare/billing": "Patient billing",
  "healthcare/compliance": "Compliance",
  leads: "Leads",
  contacts: "Contacts",
  "live-chat-v2": "Live chat",
  chatbot: "Chatbot",
  flow: "Flow builder",
  templates: "Templates",
  broadcasts: "Broadcasts",
  campaigns: "Campaigns",
  analytics: "Analytics",
  account: "Account",
  billing: "Org billing",
  settings: "Settings",
}

/** Route key from sidebar item href (/dashboard/...) */
export function routeKeyFromDashboardHref(href: string): string {
  const trimmed = href.replace(/^\/dashboard\/?/, "")
  return trimmed === "" ? "home" : trimmed
}

export function routeKeyTiedToClinicModule(routeKey: string): boolean {
  return Object.values(MODULE_TO_ROUTES).some((routes) => routes.includes(routeKey))
}

/** Hide healthcare-linked routes in the staff form when the clinic has not enabled that module. */
export function routeAllowedByClinicEnabled(routeKey: string, clinicMods: string[]): boolean {
  if (!clinicMods.length) return true
  if (routeKey === "staff" || routeKey === "home" || routeKey === "healthcare") return true
  if (!routeKeyTiedToClinicModule(routeKey)) return true
  for (const mod of clinicMods) {
    if (MODULE_TO_ROUTES[mod]?.includes(routeKey)) return true
  }
  return false
}

export function staffRoutesForProject(user: {
  healthcareRoutesByProject?: Record<string, string[]>
  healthcareAccessByProject?: Record<string, string[]>
}, projectId: string): string[] {
  const next = user.healthcareRoutesByProject?.[projectId]
  if (Array.isArray(next) && next.length > 0) return next

  const legacy = user.healthcareAccessByProject?.[projectId]
  if (!Array.isArray(legacy) || legacy.length === 0) return []

  const looksLikeModules = legacy.every((x) => typeof x === "string" && !x.includes("/"))
  if (looksLikeModules) return modulesToRoutes(legacy as string[])
  return legacy as string[]
}

/** Path under /projects/:projectId → staff route key (longest STAFF_ROUTE_KEYS prefix). */
export function routeKeyFromProjectPathname(pathname: string, projectId: string): string | null {
  const base = `/projects/${projectId}`.replace(/\/$/, "")
  const norm = pathname.replace(/\/$/, "") || "/"
  if (!norm.startsWith(base)) return null
  let suffix = norm.slice(base.length).replace(/^\//, "")
  if (!suffix) return "home"
  const keys = [...STAFF_ROUTE_KEYS].sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (suffix === key) return key
    if (suffix.startsWith(`${key}/`)) return key
  }
  return null
}

/** True if this section is allowed by prefix rules (parent route covers children). */
export function staffRouteKeyAllowed(currentKey: string | null, allowedRoutes: string[]): boolean {
  if (currentKey == null) return false
  return allowedRoutes.some((a) => currentKey === a || currentKey.startsWith(`${a}/`))
}

export function staffWelcomePath(projectId: string): string {
  return `/projects/${projectId}/staff`
}

/** Staff welcome page: explicit `staff` route, or legacy rows that only granted `home`. */
export function canOpenStaffWelcomePage(
  user: { staffRole?: string | null },
  allowedRoutes: string[]
): boolean {
  if (allowedRoutes.includes("staff")) return true
  return Boolean(user.staffRole) && allowedRoutes.includes("home")
}

/** Same idea as Sidebar: staff login or any per-project healthcare route map on the session. */
export function isHealthcareStaffSession(user: {
  staffRole?: string | null
  healthcareRoutesByProject?: Record<string, string[]>
  healthcareAccessByProject?: Record<string, string[]>
}): boolean {
  return (
    Boolean(user.staffRole) ||
    Boolean(user.healthcareRoutesByProject && Object.keys(user.healthcareRoutesByProject).length > 0) ||
    Boolean(user.healthcareAccessByProject && Object.keys(user.healthcareAccessByProject).length > 0)
  )
}
