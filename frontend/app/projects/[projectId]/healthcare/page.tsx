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
  type LucideIcon,
} from "lucide-react"
import { apiGet } from "@/lib/api-client"
import { authService } from "@/lib/auth"
import {
  isHealthcareStaffSession,
  staffRouteKeyAllowed,
  staffRoutesForProject,
} from "@/lib/healthcareStaffRoutes"
import { HealthcareAnalyticsDashboard } from "@/components/healthcare/HealthcareAnalyticsDashboard"

const FALLBACK_MODULES = ["patients", "appointments", "doctors", "prescriptions", "whatsapp"]

type ClinicPayload = {
  name?: string
  enabledModules?: string[]
}

type RouteRow = {
  key: string
  moduleId: string | null
  routeKey: string
  title: string
  path: string
  icon: LucideIcon
}

const MODULE_LINKS: RouteRow[] = [
  { key: "patients", moduleId: "patients", routeKey: "healthcare/patients", title: "Patients", path: "/healthcare/patients", icon: UsersRound },
  { key: "appointments", moduleId: "appointments", routeKey: "healthcare/appointments", title: "Appointments", path: "/healthcare/appointments", icon: CalendarCheck2 },
  { key: "frontdesk", moduleId: "frontdesk", routeKey: "healthcare/frontdesk", title: "Front desk", path: "/healthcare/frontdesk", icon: ConciergeBell },
  { key: "doctors", moduleId: "doctors", routeKey: "healthcare/doctors", title: "Doctors", path: "/healthcare/doctors", icon: Stethoscope },
  { key: "prescriptions", moduleId: "prescriptions", routeKey: "healthcare/prescriptions", title: "Prescriptions", path: "/healthcare/prescriptions", icon: ClipboardList },
  { key: "pharmacy", moduleId: "pharmacy", routeKey: "healthcare/pharmacy", title: "Pharmacy", path: "/healthcare/pharmacy", icon: Pill },
  { key: "inventory", moduleId: "inventory", routeKey: "healthcare/inventory", title: "Inventory", path: "/healthcare/inventory", icon: Package },
  { key: "billing", moduleId: "billing", routeKey: "healthcare/billing", title: "Billing", path: "/healthcare/billing", icon: Receipt },
  { key: "compliance", moduleId: "compliance", routeKey: "healthcare/compliance", title: "Compliance", path: "/healthcare/compliance", icon: ShieldCheck },
  { key: "staff", moduleId: "doctors", routeKey: "healthcare/staff", title: "Staff", path: "/healthcare/staff", icon: UserPlus },
  { key: "flow", moduleId: "flow-builder", routeKey: "flow", title: "Flows", path: "/flow", icon: GitBranch },
  { key: "chatbot", moduleId: "whatsapp", routeKey: "chatbot", title: "Chatbot", path: "/chatbot", icon: Bot },
]

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

    return { visible }
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
  const moduleRows = useMemo(() => MODULE_LINKS.filter((m) => visible(m)), [visible])
  const clinicName = clinic?.name?.trim() || "Your clinic"
  const base = `/projects/${projectId}`

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-6 md:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <HealthcareAnalyticsDashboard projectId={projectId} clinicName={clinicName} basePath={base} />

        <section aria-labelledby="modules-strip-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="modules-strip-heading" className="text-sm font-semibold text-slate-900">
                Modules
              </h2>
              <p className="text-xs text-slate-500">Open any area of your clinic</p>
            </div>
            <Link
              href={`${base}/healthcare/clinic-setup`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Clinic setup
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading modules…
            </div>
          ) : moduleRows.length === 0 ? (
            <p className="text-sm text-amber-800">No modules visible for your role.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {moduleRows.map((m) => {
                const Icon = m.icon
                return (
                  <Link
                    key={m.key}
                    href={`${base}${m.path}`}
                    className="group inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-900"
                  >
                    <Icon className="h-4 w-4 text-slate-500 group-hover:text-emerald-700" />
                    {m.title}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
