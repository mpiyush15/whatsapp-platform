"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react"
import { apiGet, apiPut, apiPost } from "@/lib/api-client"
import DataTable from "@/components/DataTable"
import { useHealthcareListLoader } from "@/lib/hooks/useHealthcareListLoader"

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

interface AvailabilitySlot {
  dayOfWeek: string
  startTime: string
  endTime: string
  location?: string | null
}

interface DoctorRecord {
  doctorId: string
  fullName: string
  specialization?: string | null
  department?: string | null
  phoneNumber?: string | null
  email?: string | null
  status?: string
  availability?: AvailabilitySlot[]
}

interface DoctorsResponse {
  success: boolean
  data?: {
    doctors: DoctorRecord[]
  }
}

interface DoctorUpdateResponse {
  success: boolean
  data?: {
    doctor: DoctorRecord
  }
}

export default function HealthcareDoctorsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [doctors, setDoctors] = useState<DoctorRecord[]>([])
  const { initialLoading, refreshing, run: runListLoad } = useHealthcareListLoader()
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [scheduleDoctor, setScheduleDoctor] = useState<DoctorRecord | null>(null)
  const [scheduleSlots, setScheduleSlots] = useState<AvailabilitySlot[]>([])
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [addingDoctor, setAddingDoctor] = useState(false)
  const [addDoctorForm, setAddDoctorForm] = useState({
    fullName: "",
    specialization: "",
    department: "",
    phoneNumber: "",
    email: "",
    availability: [{ dayOfWeek: "monday", startTime: "09:00", endTime: "17:00", location: "" }] as AvailabilitySlot[]
  })

  const loadDoctors = useCallback(async (query = "") => {
    try {
      const result = await runListLoad(async () => {
        setError("")
        const payload = await apiGet<DoctorsResponse>(
          `/healthcare/doctors?projectId=${encodeURIComponent(projectId)}&limit=200${query ? `&q=${encodeURIComponent(query)}` : ""}`
        )
        return payload?.data?.doctors || []
      })

      if (result) {
        setDoctors(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctors")
    }
  }, [projectId, runListLoad])

  useEffect(() => {
    void loadDoctors("")
  }, [projectId])

  const openScheduleModal = (doctor: DoctorRecord) => {
    setScheduleDoctor(doctor)
    setScheduleSlots(
      doctor.availability?.length
        ? doctor.availability
        : [{ dayOfWeek: "monday", startTime: "09:00", endTime: "17:00", location: "" }]
    )
  }

  const updateSlot = (index: number, patch: Partial<AvailabilitySlot>) => {
    setScheduleSlots((current) => current.map((slot, idx) => idx === index ? { ...slot, ...patch } : slot))
  }

  const saveSchedule = async () => {
    if (!scheduleDoctor) return

    try {
      setSavingSchedule(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPut<DoctorUpdateResponse>(
        `/healthcare/doctors/${encodeURIComponent(scheduleDoctor.doctorId)}?projectId=${encodeURIComponent(projectId)}`,
        {
          ...scheduleDoctor,
          availability: scheduleSlots.filter((slot) => slot.dayOfWeek && slot.startTime && slot.endTime),
        }
      )

      const updatedDoctor = payload?.data?.doctor
      if (updatedDoctor) {
        setDoctors((current) => current.map((doctor) => doctor.doctorId === updatedDoctor.doctorId ? updatedDoctor : doctor))
      } else {
        await loadDoctors(search)
      }

      setSuccessMessage("Doctor schedule updated")
      setScheduleDoctor(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule")
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setAddingDoctor(true)
      setError("")
      setSuccessMessage("")

      const payload = await apiPost<{ success: boolean; data?: { doctor: DoctorRecord } }>(
        `/healthcare/doctors?projectId=${encodeURIComponent(projectId)}`,
        addDoctorForm
      )

      if (payload?.data?.doctor) {
        setSuccessMessage("Doctor added successfully")
        setShowAddDoctor(false)
        setAddDoctorForm({
          fullName: "",
          specialization: "",
          department: "",
          phoneNumber: "",
          email: "",
          availability: [{ dayOfWeek: "monday", startTime: "09:00", endTime: "17:00", location: "" }]
        })
        void loadDoctors(search)
      } else {
        throw new Error("Failed to add doctor")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add doctor")
    } finally {
      setAddingDoctor(false)
    }
  }

  const columns = useMemo(() => [
    {
      key: "fullName",
      label: "Name",
      render: (_: any, row: DoctorRecord) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.doctorId}</p>
        </div>
      )
    },
    {
      key: "specialization",
      label: "Specialization",
      render: (_: any, row: DoctorRecord) => row.specialization || "—"
    },
    {
      key: "department",
      label: "Department",
      render: (_: any, row: DoctorRecord) => row.department || "—"
    },
    {
      key: "contact",
      label: "Contact",
      render: (_: any, row: DoctorRecord) => row.phoneNumber || row.email || "—"
    },
    {
      key: "schedule",
      label: "Schedule",
      render: (_: any, row: DoctorRecord) => row.availability?.length ? (
        <div className="space-y-1">
          {row.availability.slice(0, 2).map((slot, index) => (
            <p key={`${row.doctorId}-${index}`} className="text-xs capitalize">
              {slot.dayOfWeek}: {slot.startTime}-{slot.endTime}
            </p>
          ))}
          {row.availability.length > 2 ? <p className="text-xs text-slate-500">+{row.availability.length - 2} more</p> : null}
        </div>
      ) : "No schedule"
    },
    {
      key: "status",
      label: "Status",
      render: (_: any, row: DoctorRecord) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">{row.status || "active"}</span>
    }
  ], [])

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Doctors</h2>
            <p className="text-sm text-slate-600">
              Doctor registry for appointment and prescription assignment. Note: Add doctors to Staff &amp; logins to grant system access.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search doctor, specialization"
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button type="button" onClick={() => void loadDoctors(search)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Search</button>
            <button type="button" onClick={() => void loadDoctors(search)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
            <button
              type="button"
              onClick={() => setShowAddDoctor(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              Add doctor
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={doctors}
            loading={initialLoading || refreshing}
            emptyMessage="No doctors found."
            actions={[
              {
                label: "Edit schedule",
                variant: "primary",
                onClick: openScheduleModal
              }
            ]}
          />
        </div>
      </div>
    </motion.div>

      <AnimatePresence>
      {scheduleDoctor ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Doctor schedule</h3>
                <p className="text-sm text-slate-600">{scheduleDoctor.fullName}</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleDoctor(null)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {scheduleSlots.map((slot, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_1.3fr_auto]">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(event) => updateSlot(index, { dayOfWeek: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm capitalize text-slate-900"
                  >
                    {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(event) => updateSlot(index, { startTime: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(event) => updateSlot(index, { endTime: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    value={slot.location || ""}
                    onChange={(event) => updateSlot(index, { location: event.target.value })}
                    placeholder="Room / location"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setScheduleSlots((current) => current.filter((_, idx) => idx !== index))}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setScheduleSlots((current) => [...current, { dayOfWeek: "monday", startTime: "09:00", endTime: "17:00", location: "" }])}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add slot
              </button>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleDoctor(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={savingSchedule}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save schedule
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      {showAddDoctor ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add new doctor</h3>
                <p className="text-sm text-slate-600">Enter their details and set initial availability</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDoctor(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full name <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={addDoctorForm.fullName}
                    onChange={(e) => setAddDoctorForm(c => ({ ...c, fullName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Dr. John Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Specialization</label>
                  <input
                    value={addDoctorForm.specialization}
                    onChange={(e) => setAddDoctorForm(c => ({ ...c, specialization: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="e.g. Cardiology"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                  <input
                    value={addDoctorForm.department}
                    onChange={(e) => setAddDoctorForm(c => ({ ...c, department: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="e.g. Outpatient"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone number</label>
                  <input
                    value={addDoctorForm.phoneNumber}
                    onChange={(e) => setAddDoctorForm(c => ({ ...c, phoneNumber: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="+91..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email address</label>
                  <input
                    type="email"
                    value={addDoctorForm.email}
                    onChange={(e) => setAddDoctorForm(c => ({ ...c, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="doctor@clinic.com"
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-900">Initial Schedule</h4>
                <div className="space-y-3">
                  {addDoctorForm.availability.map((slot, index) => (
                    <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_1.3fr_auto]">
                      <select
                        value={slot.dayOfWeek}
                        onChange={(event) => setAddDoctorForm(c => {
                          const newAv = [...c.availability];
                          newAv[index].dayOfWeek = event.target.value;
                          return { ...c, availability: newAv };
                        })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm capitalize text-slate-900"
                      >
                        {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                      </select>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) => setAddDoctorForm(c => {
                          const newAv = [...c.availability];
                          newAv[index].startTime = event.target.value;
                          return { ...c, availability: newAv };
                        })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) => setAddDoctorForm(c => {
                          const newAv = [...c.availability];
                          newAv[index].endTime = event.target.value;
                          return { ...c, availability: newAv };
                        })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                      <input
                        value={slot.location || ""}
                        onChange={(event) => setAddDoctorForm(c => {
                          const newAv = [...c.availability];
                          newAv[index].location = event.target.value;
                          return { ...c, availability: newAv };
                        })}
                        placeholder="Room / location"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setAddDoctorForm(c => ({
                          ...c,
                          availability: c.availability.filter((_, idx) => idx !== index)
                        }))}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setAddDoctorForm(c => ({
                      ...c,
                      availability: [...c.availability, { dayOfWeek: "monday", startTime: "09:00", endTime: "17:00", location: "" }]
                    }))}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add slot
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDoctor}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {addingDoctor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create Doctor
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
