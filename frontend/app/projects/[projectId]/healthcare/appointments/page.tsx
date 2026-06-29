"use client"

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2, MessageSquare, Plus, RefreshCw, Search, X } from "lucide-react"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import DataTable from "@/components/DataTable"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"
import { motion, AnimatePresence } from "framer-motion"

interface PatientRecord {
  patientId: string
  fullName: string
}

interface AvailabilitySlot {
  dayOfWeek: string
  startTime: string
  endTime: string
}

interface DoctorRecord {
  doctorId: string
  fullName: string
  specialization?: string | null
  availability?: AvailabilitySlot[]
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
  const [filters, setFilters] = useState({
    status: "",
    doctorId: "",
    visitType: "",
    channel: "",
    billingStatus: "",
  })
  const [sort, setSort] = useState({ by: "scheduledAt", order: "desc" })

  const [patientSearch, setPatientSearch] = useState("")
  const [patientSearchResults, setPatientSearchResults] = useState<PatientRecord[]>([])
  const [isPatientSearchLoading, setPatientSearchLoading] = useState(false)
  const [selectedPatientName, setSelectedPatientName] = useState("")

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
        const filterQuery = Object.entries(filters)
          .filter(([, value]) => value)
          .map(([key, value]) => `&${key}=${encodeURIComponent(value)}`)
          .join("")
        const sortQuery = `&sortBy=${sort.by}&sortOrder=${sort.order}`
        const payload = await apiGet<AppointmentsResponse>(
          `/healthcare/appointments?projectId=${encodeURIComponent(projectId)}&page=${pageNum}&limit=${limit}${query ? `&q=${encodeURIComponent(query)}` : ""}${filterQuery}${sortQuery}`
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
  }, [projectId, limit, runListLoad, filters, sort])

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
  }, [loadAppointments, search, page])

  useEffect(() => {
    void loadReferenceData()
  }, [loadReferenceData])

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

  useEffect(() => {
    const searchPatients = async () => {
      if (patientSearch.trim().length < 2) {
        setPatientSearchResults([])
        return
      }

      try {
        setPatientSearchLoading(true)
        const payload = await apiGet<PatientsResponse>(
          `/healthcare/patients?projectId=${encodeURIComponent(projectId)}&limit=10&q=${encodeURIComponent(patientSearch)}`
        )
        setPatientSearchResults(payload?.data?.patients || [])
      } catch (err) {
        // Silently fail
      } finally {
        setPatientSearchLoading(false)
      }
    }

    const timer = setTimeout(() => {
      void searchPatients()
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [patientSearch, projectId])

  const selectedDoctor = useMemo(() => {
    if (!form.doctorId) return null
    return doctors.find(d => d.doctorId === form.doctorId) || null
  }, [form.doctorId, doctors])

  const doctorScheduleByDay = useMemo(() => {
    if (!selectedDoctor?.availability) return {}
    return selectedDoctor.availability.reduce((acc, slot) => {
      const day = slot.dayOfWeek
      if (!acc[day]) {
        acc[day] = []
      }
      acc[day].push(`${slot.startTime} - ${slot.endTime}`)
      return acc
    }, {} as Record<string, string[]>)
  }, [selectedDoctor])

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
        setAppointments((current) => [payload.data.appointment, ...current.filter(a => a.appointmentId !== payload.data.appointment.appointmentId)])
        setTotal((current) => current + 1)
      }

      setForm(initialForm)
      setSuccessMessage("Appointment created successfully")
      setShowCreateModal(false)
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

      const payload = await apiPut<{ data?: { appointment: AppointmentRecord } }>(`/healthcare/appointments/${encodeURIComponent(editForm.appointmentId)}?projectId=${encodeURIComponent(projectId)}`, {
        patientId: editForm.patientId,
        doctorId: editForm.doctorId || null,
        scheduledAt: new Date(editForm.scheduledAt).toISOString(),
        durationMinutes: Number(editForm.durationMinutes || 30),
        visitType: editForm.visitType,
        channel: editForm.channel,
        status: editForm.status,
        reason: editForm.reason,
      })

      if (payload?.data?.appointment) {
        setAppointments((current) => current.map(a => a.appointmentId === payload.data.appointment.appointmentId ? payload.data.appointment : a))
      }

      setSuccessMessage("Appointment updated successfully")
      setShowViewModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment")
    } finally {
      setUpdating(false)
    }
  }

  const columns = useMemo(() => [
    {
      key: "patient",
      label: "Patient",
      minWidth: "220px",
      render: (_: any, row: AppointmentRecord) => (
        <div>
          <p className="font-semibold text-slate-900">{row.patientSnapshot?.fullName || row.patientId}</p>
          <p className="text-xs text-slate-500">{row.appointmentId}</p>
        </div>
      )
    },
    {
      key: "doctor",
      label: "Doctor",
      minWidth: "180px",
      render: (_: any, row: AppointmentRecord) => row.doctorSnapshot?.fullName || "Unassigned"
    },
    {
      key: "schedule",
      label: "Schedule",
      minWidth: "200px",
      render: (_: any, row: AppointmentRecord) => (
        <div>
          <p>{new Date(row.scheduledAt).toLocaleString()}</p>
          <p className="text-xs text-slate-500">{row.durationMinutes || 30} min • {row.channel || "clinic"}</p>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      minWidth: "120px",
      render: (_: any, row: AppointmentRecord) => {
        const status = String(row.status || "scheduled").toLowerCase()
        const statusClass = statusClassMap[status] || "bg-slate-100 text-slate-700"
        return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass}`}>{status}</span>
      }
    },
    {
      key: "source",
      label: "Source",
      minWidth: "130px",
      render: (_: any, row: AppointmentRecord) => <span className="capitalize">{row.bookingSource === "whatsapp_bot" ? "WhatsApp bot" : "Manual"}</span>
    },
    {
      key: "queue",
      label: "Queue",
      minWidth: "100px",
      render: (_: any, row: AppointmentRecord) => row.queueStatus === "queued" ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase text-amber-800">Queued</span>
      ) : (
        <span className="text-xs text-slate-500">—</span>
      )
    },
    {
      key: "visit",
      label: "Visit",
      minWidth: "140px",
      render: (_: any, row: AppointmentRecord) => <span className="capitalize">{row.visitType || "consultation"}</span>
    },
    {
      key: "billing",
      label: "Billing",
      minWidth: "120px",
      render: (_: any, row: AppointmentRecord) => <span className="capitalize">{row.billingStatus || "pending"}</span>
    }
  ], [])

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-6 p-6"
      >
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

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border border-slate-200 bg-slate-50/80 p-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 sm:w-auto"
            >
              <option value="">Any Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked-in</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-show</option>
            </select>

            <select
              value={filters.doctorId}
              onChange={(e) => setFilters((prev) => ({ ...prev, doctorId: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 sm:w-auto"
            >
              <option value="">Any Doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.doctorId} value={doctor.doctorId}>
                  {doctor.fullName}
                </option>
              ))}
            </select>

            <select
              value={filters.visitType}
              onChange={(e) => setFilters((prev) => ({ ...prev, visitType: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 sm:w-auto"
            >
              <option value="">Any Visit Type</option>
              <option value="consultation">Consultation</option>
              <option value="follow-up">Follow-up</option>
              <option value="procedure">Procedure</option>
              <option value="lab">Lab</option>
            </select>

            <select
              value={sort.by}
              onChange={(e) => setSort((prev) => ({ ...prev, by: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 sm:w-auto"
            >
              <option value="scheduledAt">Sort by Schedule</option>
              <option value="durationMinutes">Sort by Duration</option>
              <option value="createdAt">Sort by Creation</option>
            </select>

            <select
              value={sort.order}
              onChange={(e) => setSort((prev) => ({ ...prev, order: e.target.value }))}
              className="w-full rounded-xl border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 sm:w-auto"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <DataTable
            containerClassName="border-b border-slate-200"
            columns={columns}
            data={appointments}
            loading={initialLoading || refreshing}
            wide={true}
            emptyMessage="No appointments found for this project yet."
            actions={[
              {
                label: "View / Edit",
                onClick: openAppointmentModal
              },
              {
                label: "Send WA",
                icon: <MessageSquare className="h-3.5 w-3.5" />,
                onClick: (row) => window.location.href = `/projects/${projectId}/templates`
              }
            ]}
          />
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
      </motion.div>

      <AnimatePresence>
      {showCreateModal ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
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
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
                  <input
                    required
                    type="text"
                    value={selectedPatientName || patientSearch}
                    onChange={(event) => {
                      setPatientSearch(event.target.value)
                      setSelectedPatientName("")
                      setForm(current => ({ ...current, patientId: "" }))
                    }}
                    placeholder="Search by name, ID, or phone"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                  />
                  {isPatientSearchLoading ? <div className="absolute right-3 top-9"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div> : null}

                  {patientSearch.trim().length > 0 && !isPatientSearchLoading && patientSearchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                      <ul className="max-h-60 overflow-y-auto py-1">
                        {patientSearchResults.map((patient) => (
                          <li
                            key={patient.patientId}
                            onClick={() => {
                              setForm((current) => ({ ...current, patientId: patient.patientId }))
                              setSelectedPatientName(patient.fullName)
                              setPatientSearch("")
                              setPatientSearchResults([])
                            }}
                            className="cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            {patient.fullName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                  {selectedDoctor?.availability ? (
                    <div className="mt-2 space-y-2 rounded-lg bg-slate-50/80 p-3 text-xs text-slate-700">
                      <p className="font-semibold">Doctor&apos;s weekly schedule:</p>
                      {Object.keys(doctorScheduleByDay).length > 0 ? (
                        <div className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1">
                          {Object.entries(doctorScheduleByDay).map(([day, slots]) => (
                            <React.Fragment key={day}>
                              <div className="font-medium capitalize">{day}:</div>
                              <div>{slots.join(", ")}</div>
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500">No schedule set for this doctor.</p>
                      )}
                    </div>
                  ) : null}
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
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>

      <AnimatePresence>
      {showViewModal ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
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
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  )
}
