"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Pencil, Plus, RefreshCw, Search, X } from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/lib/api-client"
import {
  modulesToRoutes,
  ROLE_ROUTE_PRESETS,
  routeAllowedByClinicEnabled,
  STAFF_ROUTE_KEYS,
  STAFF_ROUTE_LABELS,
} from "@/lib/healthcareStaffRoutes"

type StaffRole = "doctor" | "head_doctor" | "nurse" | "receptionist" | "billing" | "admin"

interface StaffRecord {
  staffId: string
  fullName: string
  email: string
  phone?: string | null
  role: StaffRole
  linkedDoctorId?: string | null
  linkedNurseId?: string | null
  /** Path keys under /dashboard (same under /projects/:id). */
  allowedRoutes?: string[]
  /** @deprecated legacy API */
  allowedModules?: string[]
  status?: string
}

/** Order: clinical leads first, then ops roles. Backend stores in `healthcarestaffs` (Mongo from server `.env`). */
const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "head_doctor", label: "Head doctor — leads clinical + most clinic modules" },
  { value: "doctor", label: "Doctor — patients, appointments, prescriptions" },
  { value: "nurse", label: "Nurse — patients, appointments, nursing + Rx" },
  { value: "receptionist", label: "Reception — patients, appointments, front desk" },
  { value: "billing", label: "Billing — patients, appointments, invoices" },
  { value: "admin", label: "Clinic admin — full access for this project" },
]

function presetRoutesForRole(role: StaffRole, clinicMods: string[]): string[] {
  const preset = ROLE_ROUTE_PRESETS[role] || ROLE_ROUTE_PRESETS.doctor
  return preset.filter((r) => routeAllowedByClinicEnabled(r, clinicMods))
}

function routesAvailableInForm(clinicMods: string[]): string[] {
  return STAFF_ROUTE_KEYS.filter((r) => routeAllowedByClinicEnabled(r, clinicMods))
}

function effectiveRoutesForRow(row: StaffRecord, clinicMods: string[]): string[] {
  let base: string[] = []
  if (Array.isArray(row.allowedRoutes) && row.allowedRoutes.length > 0) {
    base = row.allowedRoutes
  } else if (Array.isArray(row.allowedModules) && row.allowedModules.length > 0) {
    base = modulesToRoutes(row.allowedModules)
  } else {
    base = ROLE_ROUTE_PRESETS[row.role] || ROLE_ROUTE_PRESETS.doctor
  }
  return base.filter((r) => routeAllowedByClinicEnabled(r, clinicMods))
}

function routeToProjectPath(projectId: string, routeKey: string): string {
  if (routeKey === "home") return `/projects/${projectId}`
  return `/projects/${projectId}/${routeKey}`
}

const initialCreateForm = {
  fullName: "",
  email: "",
  phone: "",
  role: "doctor" as StaffRole,
}

export default function HealthcareStaffPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [members, setMembers] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [syncingDoctors, setSyncingDoctors] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState<StaffRecord | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    status: "active",
    allowedRoutes: [] as string[],
  })
  const [search, setSearch] = useState("")
  const [clinicEnabledModules, setClinicEnabledModules] = useState<string[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [createForm, setCreateForm] = useState(initialCreateForm)

  const loadMembers = useCallback(async (query = "") => {
    try {
      setLoading(true)
      setError("")
      const payload = await apiGet<{
        success?: boolean
        error?: string
        data?: { members?: StaffRecord[] }
      }>(
        `/healthcare/staff/members?projectId=${encodeURIComponent(projectId)}&limit=200${query ? `&q=${encodeURIComponent(query)}` : ""}`
      )
      if (payload && payload.success === false) {
        throw new Error(payload.error || "Failed to load staff")
      }
      setMembers(payload?.data?.members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadMembers("")
  }, [loadMembers])

  useEffect(() => {
    const loadClinicModules = async () => {
      try {
        const payload = await apiGet<{ data?: { enabledModules?: string[] } }>(
          `/healthcare/clinic/${encodeURIComponent(projectId)}`
        )
        const modules = Array.isArray(payload?.data?.enabledModules) ? payload.data!.enabledModules! : []
        setClinicEnabledModules(modules)
      } catch {
        setClinicEnabledModules([])
      }
    }
    loadClinicModules()
  }, [projectId])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setError("")
      setSuccess("")

      // Omit allowedRoutes — backend uses ROLE_ROUTE_PRESETS for the selected role.
      const body = {
        projectId,
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        role: createForm.role,
      }

      const payload = await apiPost<{
        success?: boolean
        error?: string
        data?: {
          staff?: StaffRecord
          emailSent?: boolean
          emailSkipped?: boolean
          existing?: boolean
        }
      }>("/healthcare/staff/members", body)

      if (payload && payload.success === false) {
        throw new Error(payload.error || "Request failed")
      }

      if (payload?.data?.staff) {
        const s = payload.data.staff
        setMembers((current) => {
          const idx = current.findIndex((m) => m.staffId === s.staffId)
          if (idx >= 0) {
            const next = [...current]
            next[idx] = s
            return next
          }
          return [s, ...current]
        })
      }
      let msg = "Staff member created. Login details were emailed when email is enabled."
      if (payload?.data?.existing) {
        msg =
          "Staff updated — this email was already on the list for this project. Roles and details were refreshed."
      } else if (payload?.data?.emailSkipped) {
        msg =
          "Staff member saved. No welcome email (existing login or email disabled) — share access another way if needed."
      }
      setSuccess(msg)
      setCreateForm(initialCreateForm)
      setShowModal(false)
      loadMembers(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff")
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (row: StaffRecord) => {
    setEditRow(row)
    setEditForm({
      fullName: row.fullName,
      phone: row.phone || "",
      status: row.status || "active",
      allowedRoutes: effectiveRoutesForRow(row, clinicEnabledModules),
    })
    setError("")
    setSuccess("")
  }

  const closeEdit = () => {
    setEditRow(null)
    setEditSubmitting(false)
  }

  const toggleEditRoute = (routeKey: string) => {
    setEditForm((current) => {
      const exists = current.allowedRoutes.includes(routeKey)
      return {
        ...current,
        allowedRoutes: exists
          ? current.allowedRoutes.filter((id) => id !== routeKey)
          : [...current.allowedRoutes, routeKey],
      }
    })
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editRow) return
    try {
      setEditSubmitting(true)
      setError("")
      setSuccess("")
      const payload = await apiPatch<{
        success?: boolean
        error?: string
        data?: { staff?: StaffRecord }
      }>(`/healthcare/staff/members/${encodeURIComponent(editRow.staffId)}`, {
        projectId,
        fullName: editForm.fullName,
        phone: editForm.phone || undefined,
        status: editForm.status,
        allowedRoutes: editForm.allowedRoutes,
      })
      if (payload && payload.success === false) {
        throw new Error(payload.error || "Update failed")
      }
      setSuccess("Staff updated. They may need to log out and back in to refresh the sidebar.")
      closeEdit()
      await loadMembers(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleSyncDoctors = async () => {
    try {
      setSyncingDoctors(true)
      setError("")
      setSuccess("")
      const payload = await apiPost<{
        success?: boolean
        error?: string
        data?: { synced?: number; skippedWithoutEmail?: number; totalDoctors?: number }
      }>("/healthcare/staff/members/sync-doctors", { projectId })

      if (payload && payload.success === false) {
        throw new Error(payload.error || "Failed to sync doctors")
      }

      const synced = payload?.data?.synced || 0
      const skipped = payload?.data?.skippedWithoutEmail || 0
      const total = payload?.data?.totalDoctors || 0
      setSuccess(`Doctors synced: ${synced}/${total}. Skipped without email: ${skipped}.`)
      await loadMembers(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync doctors")
    } finally {
      setSyncingDoctors(false)
    }
  }

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Staff &amp; logins</h2>
            <p className="text-sm text-slate-600">
              Add people by role; each row is saved to your clinic staff list and they get a login when email is enabled. Fine-tune route access anytime with Edit.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => loadMembers(search)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => loadMembers(search)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSyncDoctors}
              disabled={syncingDoctors}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"
            >
              {syncingDoctors ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sync current doctors
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateForm(initialCreateForm)
                setShowModal(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              Add staff
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading staff...
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No staff yet. Add someone to send them login details.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Links</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {members.map((row) => (
                  <tr key={row.staffId} className="hover:bg-cyan-50/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.fullName}</p>
                      <p className="text-xs text-slate-500">{row.staffId}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{row.role}</td>
                    <td className="px-4 py-3 text-slate-700">{row.email}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.linkedDoctorId ? <span className="mr-2 rounded bg-slate-100 px-2 py-0.5">Dr {row.linkedDoctorId}</span> : null}
                      {row.linkedNurseId ? <span className="rounded bg-slate-100 px-2 py-0.5">Nr {row.linkedNurseId}</span> : null}
                      {!row.linkedDoctorId && !row.linkedNurseId ? "—" : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {(() => {
                        const n = effectiveRoutesForRow(row, clinicEnabledModules).length
                        return `${n} route${n === 1 ? "" : "s"}`
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                        {row.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>

      <AnimatePresence>
      {showModal ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">New staff</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Pick a role, then name and email. Access follows that role&apos;s default; use Edit to adjust later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((c) => ({ ...c, role: e.target.value as StaffRole }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
                <input
                  required
                  autoComplete="name"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((c) => ({ ...c, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g. Dr. Ananya Rao"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email (login)</label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="name@clinic.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Phone (optional)</label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((c) => ({ ...c, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="+91 …"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? "Saving…" : "Add staff"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>

      <AnimatePresence>
      {editRow ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit staff</h3>
                <p className="text-sm text-slate-600">
                  {editRow.email} · <span className="capitalize">{editRow.role}</span> · {editRow.staffId}
                </p>
              </div>
              <button type="button" onClick={closeEdit} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Route access</label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((c) => ({
                        ...c,
                        allowedRoutes: presetRoutesForRole(editRow.role, clinicEnabledModules),
                      }))
                    }
                    className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                  >
                    Reset to role preset
                  </button>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {routesAvailableInForm(clinicEnabledModules).map((routeKey) => (
                    <label key={routeKey} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={editForm.allowedRoutes.includes(routeKey)}
                        onChange={() => toggleEditRoute(routeKey)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>
                        <span className="font-medium">{STAFF_ROUTE_LABELS[routeKey] || routeKey}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{routeToProjectPath(projectId, routeKey)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((c) => ({ ...c, fullName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((c) => ({ ...c, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={closeEdit} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-70"
                >
                  {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  {editSubmitting ? "Saving..." : "Save changes"}
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
