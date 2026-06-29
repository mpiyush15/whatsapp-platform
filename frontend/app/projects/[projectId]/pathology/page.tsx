"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { FlaskConical, Loader2, Settings2, Users, TestTube2, ClipboardList, FileText } from "lucide-react"
import { apiGet } from "@/lib/api-client"

type LabPayload = { name?: string; enabledModules?: string[] }
type OverviewPayload = {
  counts?: {
    patients?: number
    tests?: number
    orders?: number
    reports?: number
    pendingOrders?: number
  }
}

const MODULE_LINKS = [
  { key: "patients", title: "Patients", path: "/pathology/patients", icon: Users },
  { key: "tests", title: "Test catalog", path: "/pathology/tests", icon: TestTube2 },
  { key: "orders", title: "Lab orders", path: "/pathology/orders", icon: ClipboardList },
  { key: "reports", title: "Reports", path: "/pathology/reports", icon: FileText },
]

export default function PathologyHomePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const base = `/projects/${projectId}`
  const [labName, setLabName] = useState("Your lab")
  const [modules, setModules] = useState<string[]>([])
  const [counts, setCounts] = useState<OverviewPayload["counts"]>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [labRes, overviewRes] = await Promise.all([
          apiGet<{ data?: { lab?: LabPayload } }>(`/pathology/lab/${encodeURIComponent(projectId)}`),
          apiGet<{ data?: OverviewPayload }>(`/pathology/overview?projectId=${encodeURIComponent(projectId)}`),
        ])
        if (cancelled) return
        setLabName(labRes?.data?.lab?.name || "Your lab")
        setModules(labRes?.data?.lab?.enabledModules || [])
        setCounts(overviewRes?.data?.counts || {})
      } catch {
        if (!cancelled) setCounts({})
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [projectId])

  const visibleModules = MODULE_LINKS.filter((m) => !modules.length || modules.includes(m.key))

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-sky-50/80 via-white to-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Pathology vertical</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <FlaskConical className="h-7 w-7 text-sky-600" />
                {labName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Book collections and deliver reports on WhatsApp — modules below.
              </p>
            </div>
            <Link
              href={`${base}/pathology/lab-setup`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Settings2 className="h-4 w-4" />
              Lab setup
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading overview…
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Patients", value: counts.patients ?? 0 },
              { label: "Tests", value: counts.tests ?? 0 },
              { label: "Orders", value: counts.orders ?? 0 },
              { label: "Pending", value: counts.pendingOrders ?? 0 },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Modules</h2>
          <div className="flex flex-wrap gap-2">
            {visibleModules.map((m) => {
              const Icon = m.icon
              return (
                <Link
                  key={m.key}
                  href={`${base}${m.path}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-200/90 bg-sky-50/80 px-3 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100"
                >
                  <Icon className="h-4 w-4" />
                  {m.title}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
