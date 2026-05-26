"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { apiGet, apiPut } from "@/lib/api-client"

type LabSettings = {
  name: string
  labType: string
  phone: string
  email: string
  address: string
}

export default function PathologyLabSetupPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [form, setForm] = useState<LabSettings>({
    name: "",
    labType: "standalone",
    phone: "",
    email: "",
    address: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const payload = await apiGet<{ data?: { lab?: LabSettings } }>(
        `/pathology/lab/${encodeURIComponent(projectId)}`
      )
      const lab = payload?.data?.lab
      if (lab) {
        setForm({
          name: lab.name || "",
          labType: lab.labType || "standalone",
          phone: lab.phone || "",
          email: lab.email || "",
          address: lab.address || "",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      setMessage("")
      await apiPut(`/pathology/lab/${encodeURIComponent(projectId)}`, {
        projectId,
        ...form,
      })
      setMessage("Lab settings saved")
      window.dispatchEvent(new Event("lab-modules-updated"))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading lab setup…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Lab setup</h1>
        <p className="text-sm text-slate-600">Branding and operations for this pathology project.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Lab name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Lab type</label>
          <select
            value={form.labType}
            onChange={(e) => setForm((c) => ({ ...c, labType: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm capitalize"
          >
            <option value="standalone">Standalone</option>
            <option value="hospital_attached">Hospital attached</option>
            <option value="collection_center">Collection center</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
            className="h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  )
}
