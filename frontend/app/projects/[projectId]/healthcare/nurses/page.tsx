"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus, RefreshCw, Search, X } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"

interface NurseRecord {
  nurseId: string
  fullName: string
  department?: string | null
  shift?: string
  phoneNumber?: string | null
  email?: string | null
  status?: string
}

interface NursesResponse {
  success: boolean
  data?: {
    nurses: NurseRecord[]
  }
}

const initialForm = {
  fullName: "",
  department: "",
  shift: "rotational",
  phoneNumber: "",
  email: "",
  status: "active",
}

export default function HealthcareNursesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [nurses, setNurses] = useState<NurseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState(initialForm)

  const loadNurses = useCallback(async (query = "") => {
    try {
      setLoading(true)
      setError("")
      const payload = await apiGet<NursesResponse>(`/healthcare/staff/nurses?projectId=${encodeURIComponent(projectId)}&limit=200${query ? `&q=${encodeURIComponent(query)}` : ""}`)
      setNurses(payload?.data?.nurses || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load nurses")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadNurses("")
  }, [loadNurses])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setError("")
      setSuccess("")

      const payload = await apiPost<{ data?: { nurse: NurseRecord } }>("/healthcare/staff/nurses", {
        ...form,
        projectId,
      })

      if (payload?.data?.nurse) {
        setNurses((current) => [payload.data!.nurse, ...current])
      }
      setSuccess("Nurse created")
      setForm(initialForm)
      setShowModal(false)
      loadNurses(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create nurse")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nurses</h2>
            <p className="text-sm text-slate-600">Nursing staff roster for front desk and clinical operations.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search nurse, department"
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button type="button" onClick={() => loadNurses(search)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Search</button>
            <button type="button" onClick={() => loadNurses(search)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Refresh</button>
            <button type="button" onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"><Plus className="h-4 w-4" />Add nurse</button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading nurses...</div>
          ) : nurses.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No nurses found.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {nurses.map((nurse) => (
                  <tr key={nurse.nurseId} className="hover:bg-violet-50/40">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{nurse.fullName}</p><p className="text-xs text-slate-500">{nurse.nurseId}</p></td>
                    <td className="px-4 py-3 text-slate-700">{nurse.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 capitalize">{(nurse.shift || "rotational").replace("-", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">{nurse.phoneNumber || nurse.email || "—"}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">{nurse.status || "active"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add nurse</h3>
                <p className="text-sm text-slate-600">Create nurse profile for care workflow.</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                <input required value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                  <input value={form.department} onChange={(e) => setForm((c) => ({ ...c, department: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Shift</label>
                  <select value={form.shift} onChange={(e) => setForm((c) => ({ ...c, shift: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400">
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="rotational">Rotational</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                  <input value={form.phoneNumber} onChange={(e) => setForm((c) => ({ ...c, phoneNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-70">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Creating..." : "Create nurse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
