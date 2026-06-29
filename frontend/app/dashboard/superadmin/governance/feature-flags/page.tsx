"use client"

import { useEffect, useState } from "react"
import { API_URL } from "@/lib/config/api"

type FeatureFlag = {
  _id?: string
  key: string
  enabled: boolean
  description?: string
  scope?: string
  updatedAt?: string
  updatedBy?: string
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [newKey, setNewKey] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const loadFlags = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/feature-flags`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await res.json()
      if (res.ok && data?.success) setFlags(Array.isArray(data.data) ? data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFlags()
  }, [])

  const upsertFlag = async (payload: { key: string; enabled: boolean; description?: string; scope?: string }) => {
    const token = localStorage.getItem("token")
    if (!token) return

    const res = await fetch(`${API_URL}/admin/feature-flags/${encodeURIComponent(payload.key)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    if (!res.ok || !data?.success) {
      setNote(data?.message || "Failed to update feature flag")
      return
    }

    setNote("Feature flag updated")
    await loadFlags()
  }

  const addNewFlag = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newKey.trim()) {
      setNote("Flag key is required")
      return
    }

    await upsertFlag({
      key: newKey.trim(),
      enabled: false,
      description: newDescription.trim(),
      scope: "global"
    })

    setNewKey("")
    setNewDescription("")
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-gray-600 mt-1">Step 9 governance: kill-switch and controlled rollout toggles.</p>
      </div>

      <form onSubmit={addNewFlag} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Create Flag</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="flag.key"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="Description"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Create
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Flags</h2>
        {loading ? <p className="text-sm text-gray-600">Loading...</p> : null}
        {!loading && flags.length === 0 ? <p className="text-sm text-gray-600">No flags yet.</p> : null}

        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.key} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{flag.key}</p>
                  <p className="text-sm text-gray-600">{flag.description || "No description"}</p>
                  <p className="text-xs text-gray-500 mt-1">Scope: {flag.scope || "global"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => upsertFlag({
                    key: flag.key,
                    enabled: !flag.enabled,
                    description: flag.description || "",
                    scope: flag.scope || "global"
                  })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${flag.enabled ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}
                >
                  {flag.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {note ? <p className="text-sm text-gray-600">{note}</p> : null}
    </div>
  )
}
