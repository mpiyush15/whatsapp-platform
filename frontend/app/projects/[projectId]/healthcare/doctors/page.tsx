"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, RefreshCw, Search } from "lucide-react"
import { apiGet } from "@/lib/api-client"

interface DoctorRecord {
  doctorId: string
  fullName: string
  specialization?: string | null
  department?: string | null
  phoneNumber?: string | null
  email?: string | null
  status?: string
}

interface DoctorsResponse {
  success: boolean
  data?: {
    doctors: DoctorRecord[]
  }
}

export default function HealthcareDoctorsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [doctors, setDoctors] = useState<DoctorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  const loadDoctors = useCallback(async (query = "") => {
    try {
      setLoading(true)
      setError("")
      const payload = await apiGet<DoctorsResponse>(`/healthcare/doctors?projectId=${encodeURIComponent(projectId)}&limit=200${query ? `&q=${encodeURIComponent(query)}` : ""}`)
      setDoctors(payload?.data?.doctors || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctors")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadDoctors("")
  }, [loadDoctors])

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
            <button type="button" onClick={() => loadDoctors(search)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Search</button>
            <button type="button" onClick={() => loadDoctors(search)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Refresh</button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading doctors...</div>
          ) : doctors.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No doctors found.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {doctors.map((doctor) => (
                  <tr key={doctor.doctorId} className="hover:bg-cyan-50/40">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{doctor.fullName}</p><p className="text-xs text-slate-500">{doctor.doctorId}</p></td>
                    <td className="px-4 py-3 text-slate-700">{doctor.specialization || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{doctor.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{doctor.phoneNumber || doctor.email || "—"}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">{doctor.status || "active"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
