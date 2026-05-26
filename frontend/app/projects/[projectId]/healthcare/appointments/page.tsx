"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2, MessageSquare, Plus, RefreshCw, Search, X } from "lucide-react"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import { HealthcareTableShell } from "@/components/healthcare/HealthcareTableShell"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"

interface PatientRecord {
  patientId: string
  fullName: string
}

interface DoctorRecord {
  doctorId: string
  fullName: string
  specialization?: string | null
}

interface AppointmentRecord {
  appointmentId: string
  patientId: string
  doctorId?: string | null
  scheduledAt: string
  endAt?: string | null
  durationMinutes?: number
  status?: string
  visitType?: string
  channel?: string
  bookingSource?: string
  queueStatus?: string
  reason?: string
  billingStatus?: string
  patientSnapshot?: {
    fullName?: string | null
    phoneNumber?: string | null
  }
  doctorSnapshot?: {
    fullName?: string | null
    specialization?: string | null
  } | null
}

interface PatientsResponse {
  success: boolean
  data?: {
    patients: PatientRecord[]
  }
}

interface DoctorsResponse {
  success: boolean
  data?: {
    doctors: DoctorRecord[]
  }
}

interface AppointmentsResponse {
  success: boolean
  data?: {
    appointments: AppointmentRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

const initialForm = {
  patientId: "",
  doctorId: "",
  scheduledAt: "",
  durationMinutes: "30",
  visitType: "consultation",
  channel: "clinic",
  reason: "",
}

const initialEditForm = {
  appointmentId: "",
  patientId: "",
  doctorId: "",
  scheduledAt: "",
  durationMinutes: "30",
  visitType: "consultation",
  channel: "clinic",
  status: "scheduled",
  reason: "",
}

const statusClassMap: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-cyan-100 text-cyan-700",
  "checked-in": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  "no-show": "bg-amber-100 text-amber-700",
}

export default function HealthcareAppointmentsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const patientIdFromQuery = searchParams.get("patientId")
  const openNewFromQuery = searchParams.get("new") === "1"
  const visitTypeFromQuery = searchParams.get("visitType")

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [doctors, setDoctors] = useState<DoctorRecord[]>([])
  const { initialLoading, refreshing, run: runListLoad } = useHealthcareListLoader()
  const [referenceLoading, setReferenceLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(initialForm)
  const [editForm, setEditForm] = useState(initialEditForm)
  const [showViewModal, setShowViewModal] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit] = useState(20)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const toDateTimeLocal = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    const tzOffset = date.getTimezoneOffset() * 60 * 1000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
  }

  const loadAppointments = useCallback(async (query = "", pageNum = page) => {
    try {
      const result = await runListLoad(async () => {
        setError("")
        const payload = await apiGet<AppointmentsResponse>(
          `/healthcare/appointments?projectId=${encodeURIComponent(projectId)}&page=${pageNum}&limit=${limit}${query ? `&q=${encodeURIComponent(query)}` : ""}`
        )
        const list = payload?.data?.appointments || []
        const pagination = payload?.data?.pagination
        return { list, pagination, pageNum }
      })

      if (!result) return

      setAppointments(result.list)
      setTotal(result.pagination?.total || result.list.length)
      setTotalPages(result.pagination?.totalPages || 1)
      if (result.pagination?.page) {
        setPage(result.pagination.page)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments")
    }
  }, [projectId, limit, runListLoad])

  const loadReferenceData = useCallback(async () => {
    if (patients.length > 0 && doctors.length > 0) return
    try {
      setReferenceLoading(true)
      const [patientsPayload, doctorsPayload] = await Promise.all([
        apiGet<PatientsResponse>(`/healthcare/patients?projectId=${encodeURIComponent(projectId)}&limit=200`),
        apiGet<DoctorsResponse>(`/healthcare/doctors?projectId=${encodeURIComponent(projectId)}&limit=200`),
      ])

      setPatients(patientsPayload?.data?.patients || [])
      setDoctors(doctorsPayload?.data?.doctors || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reference data")
    } finally {
      setReferenceLoading(false)
    }
  }, [projectId, patients.length, doctors.length])

  useEffect(() => {
    void loadAppointments(search, page)
  }, [page, projectId])

  useEffect(() => {
    if (showCreateModal || showViewModal) {
      void loadReferenceData()
    }
  }, [showCreateModal, showViewModal, loadReferenceData])

  useEffect(() => {
    if (!patientIdFromQuery) return
    setForm((current) => ({
      ...current,
      patientId: patientIdFromQuery,
      ...(visitTypeFromQuery === "follow-up" ? { visitType: "follow-up" as const } : {}),
    }))
    if (openNewFromQuery) {
      setShowCreateModal(true)
    }
  }, [patientIdFromQuery, openNewFromQuery, visitTypeFromQuery])

  const metrics = useMemo(() => {
    const now = Date.now()

    return {
      upcoming: appointments.filter((appointment) => {
        const ts = new Date(appointment.scheduledAt).getTime()
        return ts >= now && ["scheduled", "confirmed"].includes(String(appointment.status || ""))
      }).length,
      completed: appointments.filter((appointment) => appointment.status === "completed").length,
      scheduledToday: appointments.filter((appointment) => {
        const date = new Date(appointment.scheduledAt)
        const today = new Date()
        return date.toDateString() === today.toDateString()
      }).length,
    }
  }, [appointments])

  const handleCreateAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ data?: { appointment: AppointmentRecord } }>("/healthcare/appointments", {
        projectId,
        patientId: form.patientId,
        doctorId: form.doctorId || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes || 30),
        visitType: form.visitType,
        channel: form.channel,
        reason: form.reason,
        bookingSource: "manual",
        allowQueue: true,
      })

      if (payload?.data?.appointment) {
        setAppointments((current) => [payload.data!.appointment, ...current])
        setTotal((current) => current + 1)
      }

      setForm(initialForm)
      setSuccessMessage("Appointment created successfully")
      setShowCreateModal(false)
      loadAppointments(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment")
    } finally {
      setSubmitting(false)
    }
  }

  const openAppointmentModal = (appointment: AppointmentRecord) => {
    setEditForm({
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId || "",
      scheduledAt: toDateTimeLocal(appointment.scheduledAt),
      durationMinutes: String(appointment.durationMinutes || 30),
      visitType: appointment.visitType || "consultation",
      channel: appointment.channel || "clinic",
      status: appointment.status || "scheduled",
      reason: appointment.reason || "",
    })
    setShowViewModal(true)
  }

  const handleUpdateAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setUpdating(true)
      setError("")
      setSuccessMessage("")

      await apiPut(`/healthcare/appointments/${encodeURIComponent(editForm.appointmentId)}?projectId=${encodeURIComponent(projectId)}`, {
        patientId: editForm.patientId,
        doctorId: editForm.doctorId || null,
        scheduledAt: new Date(editForm.scheduledAt).toISOString(),
        durationMinutes: Number(editForm.durationMinutes || 30),
        visitType: editForm.visitType,
        channel: editForm.channel,
        status: editForm.status,
        reason: editForm.reason,
      })

      setSuccessMessage("Appointment updated successfully")
      setShowViewModal(false)
      await loadAppointments(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total appointments</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Upcoming</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.upcoming}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Scheduled today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.scheduledToday}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{metrics.completed}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Appointments</h2>
            <p className="text-sm text-slate-600">Operational appointment table with WhatsApp action touchpoints.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient, doctor, reason"
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPage(1)
                loadAppointments(search, 1)
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => void loadAppointments(search, page)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                void loadReferenceData()
                setShowCreateModal(true)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              Schedule
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <HealthcareTableShell
            initialLoading={initialLoading}
            refreshing={refreshing}
            isEmpty={appointments.length === 0}
            emptyMessage="No appointments found for this project yet."
          >
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Queue</th>
                  <th className="px-4 py-3">Visit</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {appointments.map((appointment) => {
                  const status = String(appointment.status || "scheduled").toLowerCase()
                  const statusClass = statusClassMap[status] || "bg-slate-100 text-slate-700"
                  return (
                    <tr key={appointment.appointmentId} className="hover:bg-cyan-50/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{appointment.patientSnapshot?.fullName || appointment.patientId}</p>
                        <p className="text-xs text-slate-500">{appointment.appointmentId}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{appointment.doctorSnapshot?.fullName || "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{new Date(appointment.scheduledAt).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{appointment.durationMinutes || 30} min • {appointment.channel || "clinic"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass}`}>{status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 capitalize">
                        {appointment.bookingSource === "whatsapp_bot" ? "WhatsApp bot" : "Manual"}
                      </td>
                      <td className="px-4 py-3">
                        {appointment.queueStatus === "queued" ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase text-amber-800">Queued</span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{appointment.visitType || "consultation"}</td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{appointment.billingStatus || "pending"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href="#"
                            onClick={(event) => {
                              event.preventDefault()
                              openAppointmentModal(appointment)
                            }}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View / Edit
                          </Link>
                          <Link
                            href={`/projects/${projectId}/templates`}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Send WA
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </HealthcareTableShell>
        </div>

        {!initialLoading && total > 0 ? (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-600">
              Showing page {page} of {totalPages} ({total} appointments)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Schedule appointment</h3>
                <p className="text-sm text-slate-600">Modal workflow for faster front-desk booking.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
                  <select
                    required
                    value={form.patientId}
                    onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.patientId} value={patient.patientId}>{patient.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
                  <select
                    value={form.doctorId}
                    onChange={(event) => setForm((current) => ({ ...current, doctorId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="">Unassigned</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.doctorId} value={doctor.doctorId}>
                        {doctor.fullName}{doctor.specialization ? ` • ${doctor.specialization}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Schedule</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={form.durationMinutes}
                    onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Visit type</label>
                  <select
                    value={form.visitType}
                    onChange={(event) => setForm((current) => ({ ...current, visitType: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="procedure">Procedure</option>
                    <option value="lab">Lab</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Channel</label>
                  <select
                    value={form.channel}
                    onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="clinic">Clinic</option>
                    <option value="video">Video</option>
                    <option value="phone">Phone</option>
                    <option value="home-visit">Home visit</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                  className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  placeholder="Describe the consultation reason"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || referenceLoading || patients.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Creating..." : "Create appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showViewModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">View / Edit appointment</h3>
                <p className="text-sm text-slate-600">You can reschedule and update details flexibly.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAppointment} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
                  <select
                    required
                    value={editForm.patientId}
                    onChange={(event) => setEditForm((current) => ({ ...current, patientId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.patientId} value={patient.patientId}>{patient.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
                  <select
                    value={editForm.doctorId}
                    onChange={(event) => setEditForm((current) => ({ ...current, doctorId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="">Unassigned</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.doctorId} value={doctor.doctorId}>
                        {doctor.fullName}{doctor.specialization ? ` • ${doctor.specialization}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Schedule</label>
                  <input
                    required
                    type="datetime-local"
                    value={editForm.scheduledAt}
                    onChange={(event) => setEditForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={editForm.durationMinutes}
                    onChange={(event) => setEditForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Visit type</label>
                  <select
                    value={editForm.visitType}
                    onChange={(event) => setEditForm((current) => ({ ...current, visitType: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="procedure">Procedure</option>
                    <option value="lab">Lab</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Channel</label>
                  <select
                    value={editForm.channel}
                    onChange={(event) => setEditForm((current) => ({ ...current, channel: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="clinic">Clinic</option>
                    <option value="video">Video</option>
                    <option value="phone">Phone</option>
                    <option value="home-visit">Home visit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked-in">Checked-in</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No-show</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
                <textarea
                  value={editForm.reason}
                  onChange={(event) => setEditForm((current) => ({ ...current, reason: event.target.value }))}
                  className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  placeholder="Describe the consultation reason"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || patients.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {updating ? "Updating..." : "Update appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
