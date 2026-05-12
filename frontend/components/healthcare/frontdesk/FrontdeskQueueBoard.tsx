"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Loader2, RefreshCw, Search, Send, UserRoundCheck, UserRoundX, XCircle } from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/lib/api-client"

interface QueueRow {
  appointmentId: string
  patientId: string
  doctorId?: string | null
  scheduledAt: string
  status?: string
  reason?: string
  channel?: string
  patientSnapshot?: {
    fullName?: string | null
    phoneNumber?: string | null
  }
  doctorSnapshot?: {
    fullName?: string | null
    specialization?: string | null
  } | null
  tokenNumber: number
  waitMinutes: number
  queueStage?: string
  frontdesk?: {
    checkedInAt?: string | null
    completedAt?: string | null
    cancelledAt?: string | null
    noShowAt?: string | null
    lastStatusChangedAt?: string | null
    lastStatusChangedBy?: string | null
  }
}

interface QueueResponse {
  success: boolean
  data?: {
    date: string
    queue: QueueRow[]
    metrics: {
      total: number
      waiting: number
      inClinic: number
      completed: number
      noShow: number
      cancelled: number
    }
  }
}

interface UpdateStatusResponse {
  success: boolean
  data?: {
    trigger?: {
      attempted: boolean
      sent: boolean
      reason?: string | null
      templateName?: string | null
    }
  }
}

function QueueMetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function ActionButton({ label, onClick, className, disabled }: { label: string; onClick: () => void; className: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  )
}

const statusClassMap: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-cyan-100 text-cyan-700",
  "checked-in": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  "no-show": "bg-amber-100 text-amber-700",
}

export default function FrontdeskQueueBoard({ projectId }: { projectId: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [rows, setRows] = useState<QueueRow[]>([])
  const [metrics, setMetrics] = useState<QueueResponse["data"]["metrics"]>({
    total: 0,
    waiting: 0,
    inClinic: 0,
    completed: 0,
    noShow: 0,
    cancelled: 0,
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const statusQuery = statusFilter === "all" ? "" : `&status=${encodeURIComponent(statusFilter)}`
      const payload = await apiGet<QueueResponse>(`/healthcare/frontdesk/queue?projectId=${encodeURIComponent(projectId)}&date=${encodeURIComponent(date)}${statusQuery}&limit=200`)
      setRows(payload?.data?.queue || [])
      setMetrics(payload?.data?.metrics || {
        total: 0,
        waiting: 0,
        inClinic: 0,
        completed: 0,
        noShow: 0,
        cancelled: 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load front desk queue")
    } finally {
      setLoading(false)
    }
  }, [projectId, date, statusFilter])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const updateStatus = useCallback(async (appointmentId: string, status: string) => {
    try {
      setSubmittingId(appointmentId)
      setError("")
      setSuccess("")

      const payload = await apiPatch<UpdateStatusResponse>(`/healthcare/frontdesk/appointments/${encodeURIComponent(appointmentId)}/status`, {
        projectId,
        status,
        sendWhatsApp: true,
      })

      const trigger = payload?.data?.trigger
      if (trigger?.attempted && !trigger?.sent) {
        setSuccess(`Status updated. WhatsApp trigger skipped/failed: ${trigger.reason || "unknown reason"}`)
      } else if (trigger?.sent) {
        setSuccess("Status updated and WhatsApp trigger sent")
      } else {
        setSuccess("Status updated")
      }

      await loadQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update queue status")
    } finally {
      setSubmittingId(null)
    }
  }, [projectId, loadQueue])

  const sendReminder = useCallback(async (appointmentId: string) => {
    try {
      setSubmittingId(appointmentId)
      setError("")
      setSuccess("")

      const payload = await apiPost<UpdateStatusResponse>(`/healthcare/frontdesk/appointments/${encodeURIComponent(appointmentId)}/send-reminder`, {
        projectId,
      })

      const trigger = payload?.data?.trigger
      if (trigger?.sent) {
        setSuccess("Reminder trigger sent on WhatsApp")
      } else {
        setSuccess(`Reminder trigger skipped/failed: ${trigger?.reason || "unknown reason"}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reminder")
    } finally {
      setSubmittingId(null)
    }
  }, [projectId])

  const sortedRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...rows]
      .filter((row) => {
        if (!query) return true
        const haystack = [
          row.patientSnapshot?.fullName,
          row.patientSnapshot?.phoneNumber,
          row.doctorSnapshot?.fullName,
          row.reason,
          row.status,
        ].filter(Boolean).join(" ").toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [rows, search])

  const nextWaiting = useMemo(() => {
    return sortedRows.find((row) => ["scheduled", "confirmed"].includes(String(row.status || "scheduled").toLowerCase()))
  }, [sortedRows])

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-6">
        <QueueMetricCard label="Total" value={metrics.total} />
        <QueueMetricCard label="Waiting" value={metrics.waiting} />
        <QueueMetricCard label="Checked-in" value={metrics.inClinic} />
        <QueueMetricCard label="Completed" value={metrics.completed} />
        <QueueMetricCard label="No-show" value={metrics.noShow} />
        <QueueMetricCard label="Cancelled" value={metrics.cancelled} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Front Desk Queue Board</h2>
            <p className="text-sm text-slate-600">Token queue, check-in/check-out, and reminder triggers.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search queue"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-400 sm:w-52"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400"
            >
              <option value="all">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked-in</option>
              <option value="completed">Completed</option>
              <option value="no-show">No-show</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={loadQueue}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        {nextWaiting ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 text-cyan-700" />
              <div>
                <p className="font-semibold">Next token #{nextWaiting.tokenNumber}: {nextWaiting.patientSnapshot?.fullName || nextWaiting.patientId}</p>
                <p className="text-cyan-800">{nextWaiting.doctorSnapshot?.fullName || "Unassigned"} · {new Date(nextWaiting.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · waiting {nextWaiting.waitMinutes} min</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateStatus(nextWaiting.appointmentId, "checked-in")}
              disabled={submittingId === nextWaiting.appointmentId}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
            >
              Check in next
            </button>
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading queue...
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No appointments in queue for selected date.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedRows.map((row) => {
                  const status = String(row.status || "scheduled").toLowerCase()
                  const statusClass = statusClassMap[status] || "bg-slate-100 text-slate-700"
                  const disabled = submittingId === row.appointmentId

                  return (
                    <tr key={row.appointmentId} className="hover:bg-cyan-50/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">#{row.tokenNumber}</p>
                        <p className="text-xs capitalize text-slate-500">{row.queueStage || "waiting"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.patientSnapshot?.fullName || row.patientId}</p>
                        <p className="text-xs text-slate-500">{row.patientSnapshot?.phoneNumber || "No phone"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.doctorSnapshot?.fullName || "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{new Date(row.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                        <p className="text-xs text-slate-500">
                          {status === "checked-in" && row.frontdesk?.checkedInAt
                            ? `Checked in ${new Date(row.frontdesk.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : `Wait: ${row.waitMinutes} min`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass}`}>{status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.reason || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <ActionButton
                            label="Check-in"
                            onClick={() => updateStatus(row.appointmentId, "checked-in")}
                            disabled={disabled}
                            className="bg-violet-100 text-violet-700 hover:bg-violet-200"
                          />
                          <ActionButton
                            label="Check-out"
                            onClick={() => updateStatus(row.appointmentId, "completed")}
                            disabled={disabled}
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          />
                          <ActionButton
                            label="No-show"
                            onClick={() => updateStatus(row.appointmentId, "no-show")}
                            disabled={disabled}
                            className="bg-amber-100 text-amber-700 hover:bg-amber-200"
                          />
                          <ActionButton
                            label="Cancel"
                            onClick={() => updateStatus(row.appointmentId, "cancelled")}
                            disabled={disabled}
                            className="bg-rose-100 text-rose-700 hover:bg-rose-200"
                          />
                          <ActionButton
                            label="Remind"
                            onClick={() => sendReminder(row.appointmentId)}
                            disabled={disabled}
                            className="bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-800">Trigger rules in this board:</p>
        <ul className="mt-2 space-y-1">
          <li className="flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-violet-600" /> Check-in/confirm can trigger appointment reminder template.</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Check-out (completed) can trigger follow-up check-in template.</li>
          <li className="flex items-center gap-2"><Send className="h-4 w-4 text-cyan-600" /> Reminder action sends explicit WhatsApp reminder trigger.</li>
          <li className="flex items-center gap-2"><UserRoundX className="h-4 w-4 text-amber-600" /> No-show status updates queue metrics immediately.</li>
          <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-rose-600" /> Cancel status updates queue metrics immediately.</li>
        </ul>
      </div>
    </div>
  )
}
