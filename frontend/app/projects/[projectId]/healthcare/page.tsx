"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  ArrowUpRight,
  Bot,
  CalendarCheck2,
  ClipboardList,
  ConciergeBell,
  GitBranch,
  Loader2,
  Package,
  Pill,
  Receipt,
  Settings2,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { apiGet } from "@/lib/api-client"
import { authService } from "@/lib/auth"
import {
  isHealthcareStaffSession,
  staffRouteKeyAllowed,
  staffRoutesForProject,
} from "@/lib/healthcareStaffRoutes"
import { clinicTypeForSelector, type ClinicTypeId } from "@/lib/healthcareClinicTypes"

const FALLBACK_MODULES = ["patients", "appointments", "doctors", "prescriptions", "whatsapp"]

type ClinicPayload = {
  name?: string
  clinicType?: ClinicTypeId
  enabledModules?: string[]
}

type RouteRow = {
  key: string
  moduleId: string | null
  routeKey: string
  title: string
  description: string
  path: string
  icon: LucideIcon
}

const MODULE_CARDS: RouteRow[] = [
  {
    key: "patients",
    moduleId: "patients",
    routeKey: "healthcare/patients",
    title: "Patients",
    description: "Registry, charts, and visit history",
    path: "/healthcare/patients",
    icon: UsersRound,
  },
  {
    key: "appointments",
    moduleId: "appointments",
    routeKey: "healthcare/appointments",
    title: "Appointments",
    description: "Scheduling, status, and reminders",
    path: "/healthcare/appointments",
    icon: CalendarCheck2,
  },
  {
    key: "frontdesk",
    moduleId: "frontdesk",
    routeKey: "healthcare/frontdesk",
    title: "Front desk",
    description: "Queue, tokens, and check-in",
    path: "/healthcare/frontdesk",
    icon: ConciergeBell,
  },
  {
    key: "doctors",
    moduleId: "doctors",
    routeKey: "healthcare/doctors",
    title: "Doctors",
    description: "Profiles and assignment",
    path: "/healthcare/doctors",
    icon: Stethoscope,
  },
  {
    key: "staff",
    moduleId: "doctors",
    routeKey: "healthcare/staff",
    title: "Staff & logins",
    description: "Invites, roles, and access",
    path: "/healthcare/staff",
    icon: UserPlus,
  },
  {
    key: "nurses",
    moduleId: "nurses",
    routeKey: "healthcare/nurses",
    title: "Nurses",
    description: "Nursing tasks and handoffs",
    path: "/healthcare/nurses",
    icon: UsersRound,
  },
  {
    key: "prescriptions",
    moduleId: "prescriptions",
    routeKey: "healthcare/prescriptions",
    title: "Prescriptions",
    description: "Clinical Rx and instructions",
    path: "/healthcare/prescriptions",
    icon: ClipboardList,
  },
  {
    key: "pharmacy",
    moduleId: "pharmacy",
    routeKey: "healthcare/pharmacy",
    title: "Medicine master",
    description: "Catalog for prescribing",
    path: "/healthcare/pharmacy",
    icon: Pill,
  },
  {
    key: "inventory",
    moduleId: "inventory",
    routeKey: "healthcare/inventory",
    title: "Inventory",
    description: "Stock, pricing, and expiry",
    path: "/healthcare/inventory",
    icon: Package,
  },
  {
    key: "billing",
    moduleId: "billing",
    routeKey: "healthcare/billing",
    title: "Billing",
    description: "Invoices, dues, and payments",
    path: "/healthcare/billing",
    icon: Receipt,
  },
  {
    key: "compliance",
    moduleId: "compliance",
    routeKey: "healthcare/compliance",
    title: "Compliance",
    description: "Consent and audit readiness",
    path: "/healthcare/compliance",
    icon: ShieldCheck,
  },
  {
    key: "flow",
    moduleId: "flow-builder",
    routeKey: "flow",
    title: "Flow builder",
    description: "Automate WhatsApp journeys",
    path: "/flow",
    icon: GitBranch,
  },
  {
    key: "chatbot",
    moduleId: "whatsapp",
    routeKey: "chatbot",
    title: "Chatbot",
    description: "AI replies and routing",
    path: "/chatbot",
    icon: Bot,
  },
]

type Shortcut = {
  id: string
  label: string
  hint: string
  moduleId: string | null
  routeKey: string
  path: string
  icon: LucideIcon
}

/** High-signal entry points; filtered by module + staff like modules */
const SHORTCUTS: Shortcut[] = [
  {
    id: "sc-patients",
    label: "Patient directory",
    hint: "Find or add from the list",
    moduleId: "patients",
    routeKey: "healthcare/patients",
    path: "/healthcare/patients",
    icon: UsersRound,
  },
  {
    id: "sc-appts",
    label: "Today's schedule",
    hint: "Appointments board",
    moduleId: "appointments",
    routeKey: "healthcare/appointments",
    path: "/healthcare/appointments",
    icon: CalendarCheck2,
  },
  {
    id: "sc-front",
    label: "Check-in queue",
    hint: "Front desk",
    moduleId: "frontdesk",
    routeKey: "healthcare/frontdesk",
    path: "/healthcare/frontdesk",
    icon: ConciergeBell,
  },
  {
    id: "sc-rx",
    label: "Prescriptions",
    hint: "Open Rx workspace",
    moduleId: "prescriptions",
    routeKey: "healthcare/prescriptions",
    path: "/healthcare/prescriptions",
    icon: ClipboardList,
  },
  {
    id: "sc-bill",
    label: "Invoices",
    hint: "Billing & dues",
    moduleId: "billing",
    routeKey: "healthcare/billing",
    path: "/healthcare/billing",
    icon: Receipt,
  },
  {
    id: "sc-meds",
    label: "Medicine search",
    hint: "Master catalog",
    moduleId: "pharmacy",
    routeKey: "healthcare/pharmacy",
    path: "/healthcare/pharmacy",
    icon: Pill,
  },
  {
    id: "sc-stock",
    label: "Stock desk",
    hint: "Inventory snapshot",
    moduleId: "inventory",
    routeKey: "healthcare/inventory",
    path: "/healthcare/inventory",
    icon: Package,
  },
  {
    id: "sc-setup",
    label: "Clinic setup",
    hint: "Branding & modules",
    moduleId: null,
    routeKey: "healthcare/clinic-setup",
    path: "/healthcare/clinic-setup",
    icon: Settings2,
  },
]

function workflowBadge(clinicType: ClinicTypeId | undefined): { label: string; detail: string } {
  if (!clinicType) {
    return { label: "Workflow", detail: "Configure in Clinic setup" }
  }
  const mode = clinicTypeForSelector(clinicType)
  if (clinicType === "hospital") {
    return {
      label: "Legacy hospital",
      detail: "Matches integrated in setup — save to modernize",
    }
  }
  if (mode === "consultation") {
    return {
      label: "Consultation",
      detail: "Visits & Rx first — dispensary optional",
    }
  }
  return {
    label: "Dispensary",
    detail: "Inventory + pharmacy billing in-app",
  }
}

function useAccessFilter(enabledModules: string[], projectId: string) {
  return useMemo(() => {
    const user = authService.getCurrentUser()
    const staffList =
      Boolean(user) && isHealthcareStaffSession(user!) && projectId
        ? staffRoutesForProject(user!, projectId)
        : null
    const restrict = Array.isArray(staffList) && staffList.length > 0

    const visible = (row: { moduleId: string | null; routeKey: string }) => {
      if (row.moduleId && !enabledModules.includes(row.moduleId)) return false
      if (!row.moduleId) {
        if (!restrict) return true
        return staffRouteKeyAllowed(row.routeKey, staffList!)
      }
      if (!restrict) return true
      return staffRouteKeyAllowed(row.routeKey, staffList!)
    }

    return { visible, restrict }
  }, [enabledModules, projectId])
}

export default function HealthcareHomePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [clinic, setClinic] = useState<ClinicPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const payload = await apiGet<{ success?: boolean; data?: ClinicPayload | null }>(
          `/healthcare/clinic/${encodeURIComponent(projectId)}`
        )
        if (!cancelled) setClinic(payload?.data ?? null)
      } catch {
        if (!cancelled) setClinic(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (projectId) void load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const enabledModules = useMemo(() => {
    const raw = clinic?.enabledModules
    if (Array.isArray(raw) && raw.length) return raw
    return FALLBACK_MODULES
  }, [clinic?.enabledModules])

  const { visible } = useAccessFilter(enabledModules, projectId)

  const moduleRows = useMemo(() => MODULE_CARDS.filter((m) => visible(m)), [visible])
  const shortcutRows = useMemo(() => SHORTCUTS.filter((s) => visible(s)), [visible])

  const clinicName = clinic?.name?.trim() || "Your clinic"
  const badge = workflowBadge(clinic?.clinicType)
  const base = `/projects/${projectId}`

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6 md:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Hero + side card */}
        <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10 md:p-8 lg:col-span-3">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-teal-400/10 blur-2xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                  Healthcare hub
                </span>
                {loading ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing…
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{clinicName}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                Cards below match your enabled modules. Use{" "}
                <span className="font-medium text-white">quick actions</span> for the fastest daily paths.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100 ring-1 ring-emerald-400/30">
                  {badge.label}
                </span>
                <span className="text-xs text-slate-400">{badge.detail}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`${base}/healthcare/clinic-setup`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                  <Settings2 className="h-4 w-4" />
                  Clinic setup
                </Link>
                {visible({ moduleId: "patients", routeKey: "healthcare/patients" }) ? (
                  <Link
                    href={`${base}/healthcare/patients`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10"
                  >
                    Open patients
                    <ArrowUpRight className="h-4 w-4 opacity-80" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 lg:col-span-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Session snapshot</h2>
              <p className="mt-1 text-xs text-slate-500">What this screen is showing</p>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Active modules</dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {loading ? "—" : moduleRows.length}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Quick shortcuts</dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {loading ? "—" : shortcutRows.length}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Project</dt>
                <dd className="max-w-[12rem] truncate font-mono text-xs text-slate-700" title={projectId}>
                  {projectId}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Quick actions */}
        <section aria-labelledby="quick-actions-heading">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 id="quick-actions-heading" className="text-base font-semibold text-slate-900">
                Quick actions
              </h2>
              <p className="text-xs text-slate-500">Fewer clicks for routine work</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/50 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading shortcuts…
            </div>
          ) : shortcutRows.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shortcutRows.map((s) => {
                const Icon = s.icon
                return (
                  <Link
                    key={s.id}
                    href={`${base}${s.path}`}
                    className="group relative flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300/80 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-emerald-600" />
                    </div>
                    <span className="mt-3 text-sm font-semibold text-slate-900">{s.label}</span>
                    <span className="mt-0.5 text-xs text-slate-500">{s.hint}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No shortcuts for your access. Ask an admin to enable healthcare routes or open{" "}
              <Link href={`${base}/healthcare/clinic-setup`} className="font-medium underline">
                Clinic setup
              </Link>
              .
            </p>
          )}
        </section>

        {/* All modules */}
        <section aria-labelledby="modules-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="modules-heading" className="text-base font-semibold text-slate-900">
                All modules
              </h2>
              <p className="text-xs text-slate-500">Everything enabled for this clinic</p>
            </div>
          </div>

          {!loading && moduleRows.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No modules visible. Use{" "}
              <Link href={`${base}/healthcare/clinic-setup`} className="font-medium underline">
                Clinic setup
              </Link>{" "}
              to turn areas on.
            </p>
          ) : null}

          {!loading && moduleRows.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {moduleRows.map((m) => {
                const Icon = m.icon
                return (
                  <Link
                    key={m.key}
                    href={`${base}${m.path}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-800 ring-1 ring-slate-200/80 transition group-hover:from-emerald-50 group-hover:to-teal-50/80 group-hover:text-emerald-800 group-hover:ring-emerald-200/60">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-emerald-600" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">{m.title}</h3>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{m.description}</p>
                    <span className="mt-4 text-xs font-medium text-emerald-700 opacity-0 transition group-hover:opacity-100">
                      Open module →
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
