
/**
 * Mirrors backend/src/constants/educationStaffRoutes.js for UI.
 */

export const STAFF_ROUTE_KEYS = [
  "staff",
  "home",
  "education",
  "education/enquiries",
  "education/courses",
  "education/batches",
  "education/admissions",
  "education/templates",
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
  enquiries: ["education/enquiries"],
  courses: ["education/courses"],
  batches: ["education/batches"],
  admissions: ["education/admissions"],
  templates: ["education/templates"],
  whatsapp: ["chatbot", "flow", "templates", "live-chat-v2", "broadcasts"],
  "flow-builder": ["flow"],
}

export function modulesToRoutes(modules: string[]): string[] {
  const set = new Set<string>(["staff", "home", "education"])
  for (const m of modules || []) {
    const routes = MODULE_TO_ROUTES[m]
    if (routes) routes.forEach((r) => set.add(r))
  }
  return [...set].filter((r) => STAFF_ROUTE_KEYS.includes(r as StaffRouteKey))
}

export const ROLE_ROUTE_PRESETS: Record<string, string[]> = {
  counselor: ["staff", "education", "education/enquiries", "education/admissions"],
  head_counselor: [
    "staff",
    "home",
    "education",
    "education/enquiries",
    "education/courses",
    "education/batches",
    "education/admissions",
    "education/templates",
  ],
  admin: [...STAFF_ROUTE_KEYS],
}

export const STAFF_ROUTE_LABELS: Record<string, string> = {
  staff: "Staff home (welcome)",
  home: "Project dashboard",
  education: "Education overview",
  "education/enquiries": "Enquiries",
  "education/courses": "Courses",
  "education/batches": "Batches",
  "education/admissions": "Admissions",
  "education/templates": "Templates",
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

export function routeKeyTiedToEducationModule(routeKey: string): boolean {
  return Object.values(MODULE_TO_ROUTES).some((routes) => routes.includes(routeKey))
}

/** Hide education-linked routes in the staff form when the clinic has not enabled that module. */
export function routeAllowedByEducationEnabled(routeKey: string, educationMods: string[]): boolean {
  if (!educationMods.length) return true
  if (routeKey === "staff" || routeKey === "home" || routeKey === "education") return true
  if (!routeKeyTiedToEducationModule(routeKey)) return true
  for (const mod of educationMods) {
    if (MODULE_TO_ROUTES[mod]?.includes(routeKey)) return true
  }
  return false
}

export function staffRoutesForProject(user: {
  educationRoutesByProject?: Record<string, string[]>
  educationAccessByProject?: Record<string, string[]>
}, projectId: string): string[] {
  const next = user.educationRoutesByProject?.[projectId]
  if (Array.isArray(next) && next.length > 0) return next

  const legacy = user.educationAccessByProject?.[projectId]
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

/** Same idea as Sidebar: staff login or any per-project education route map on the session. */
export function isEducationStaffSession(user: {
  staffRole?: string | null
  educationRoutesByProject?: Record<string, string[]>
  educationAccessByProject?: Record<string, string[]>
}): boolean {
  return (
    Boolean(user.staffRole) ||
    Boolean(user.educationRoutesByProject && Object.keys(user.educationRoutesByProject).length > 0) ||
    Boolean(user.educationAccessByProject && Object.keys(user.educationAccessByProject).length > 0)
  )
}
