"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react"
import { apiGet, apiPut } from "@/lib/api-client"
import { HealthcareTableShell } from "@/components/healthcare/HealthcareTableShell"
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

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Doctors</h2>
            <p className="text-sm text-slate-600">
              Doctor registry for appointment and prescription assignment. Add new doctors from{" "}
              <Link href={`/projects/${encodeURIComponent(projectId)}/healthcare/staff`} className="font-medium text-cyan-700 underline">
                Staff &amp; logins
              </Link>.
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
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {successMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <HealthcareTableShell
            initialLoading={initialLoading}
            refreshing={refreshing}
            isEmpty={doctors.length === 0}
            emptyMessage="No doctors found."
          >
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {doctors.map((doctor) => (
                  <tr key={doctor.doctorId} className="hover:bg-cyan-50/40">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{doctor.fullName}</p><p className="text-xs text-slate-500">{doctor.doctorId}</p></td>
                    <td className="px-4 py-3 text-slate-700">{doctor.specialization || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{doctor.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{doctor.phoneNumber || doctor.email || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {doctor.availability?.length ? (
                        <div className="space-y-1">
                          {doctor.availability.slice(0, 2).map((slot, index) => (
                            <p key={`${doctor.doctorId}-${index}`} className="text-xs capitalize">
                              {slot.dayOfWeek}: {slot.startTime}-{slot.endTime}
                            </p>
                          ))}
                          {doctor.availability.length > 2 ? <p className="text-xs text-slate-500">+{doctor.availability.length - 2} more</p> : null}
                        </div>
                      ) : "No schedule"}
                    </td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">{doctor.status || "active"}</span></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openScheduleModal(doctor)}
                        className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-cyan-100"
                      >
                        Edit schedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HealthcareTableShell>
        </div>
      </div>

      {scheduleDoctor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
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
          </div>
        </div>
      ) : null}
    </div>
  )
}
