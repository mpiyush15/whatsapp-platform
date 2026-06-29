"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Bell, CalendarClock, RefreshCw } from "lucide-react"
import { API_URL } from "@/lib/config/api"

type MonitorData = {
  generatedAt: string
  thresholds: {
    lowCreditWarningThreshold: number
    reminderDays: number[]
  }
  lowCredit: {
    total: number
    rows: Array<{
      accountId: string
      name?: string
      email?: string
      creditBalance: number
    }>
  }
  renewal: {
    total: number
    byStage: Record<string, number>
    rows: Array<{
      accountId: string
      planName?: string
      renewalDate: string
      daysToRenewal: number
      stage?: string | null
    }>
  }
  dispatch: {
    lowCredit: { sent: number; failed: number; pending: number }
    renewal: { sent: number; failed: number; pending: number }
  }
}

export default function BillingTriggersMonitorPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monitor, setMonitor] = useState<MonitorData | null>(null)

  const loadMonitor = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem("token") || localStorage.getItem("authToken")
      const response = await fetch(`${API_URL}/admin/payment-reminders/monitor`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || "Failed to load monitor")
      }

      setMonitor(payload.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitor")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonitor()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading trigger monitor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing Trigger Monitor</h1>
            <p className="text-sm text-gray-600">Low-credit and renewal reminder dispatch health snapshot.</p>
          </div>
          <button
            onClick={loadMonitor}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        {monitor ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Low-credit accounts</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{monitor.lowCredit.total}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Renewals in window</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{monitor.renewal.total}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Low-credit pending alerts</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{monitor.dispatch.lowCredit.pending}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Renewal pending alerts</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{monitor.dispatch.renewal.pending}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-semibold">Low-credit list</p>
                </div>
                <div className="space-y-2">
                  {monitor.lowCredit.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No accounts under threshold.</p>
                  ) : (
                    monitor.lowCredit.rows.map((row) => (
                      <div key={row.accountId} className="rounded-md border border-gray-200 p-3 text-sm">
                        <p className="font-semibold text-gray-900">{row.name || row.accountId}</p>
                        <p className="text-xs text-gray-500">{row.email || row.accountId}</p>
                        <p className="mt-1 text-xs text-amber-700">Balance: {row.creditBalance}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-indigo-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-indigo-700">
                  <CalendarClock className="h-4 w-4" />
                  <p className="text-sm font-semibold">Renewal reminder stages</p>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {Object.entries(monitor.renewal.byStage).map(([stage, count]) => (
                    <span key={stage} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {stage}: {count}
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  {monitor.renewal.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No upcoming renewals in configured window.</p>
                  ) : (
                    monitor.renewal.rows.map((row) => (
                      <div key={`${row.accountId}-${row.renewalDate}`} className="rounded-md border border-gray-200 p-3 text-sm">
                        <p className="font-semibold text-gray-900">{row.accountId}</p>
                        <p className="text-xs text-gray-500">{row.planName || "Plan"} · {new Date(row.renewalDate).toLocaleDateString("en-IN")}</p>
                        <p className="mt-1 text-xs text-indigo-700">{row.stage || "-"} · {row.daysToRenewal} day(s)</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" />
                Generated at: {new Date(monitor.generatedAt).toLocaleString("en-IN")}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
