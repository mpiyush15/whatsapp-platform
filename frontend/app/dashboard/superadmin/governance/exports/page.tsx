"use client"

import { useEffect, useState } from "react"
import { API_URL } from "@/lib/config/api"

type ExportItem = {
  _id: string
  dataset: string
  status: string
  format: string
  counts?: Record<string, number>
  createdBy: string
  createdAt: string
}

const DATASETS = ["billing", "usage", "offers", "health", "audit"]

export default function ExportCenterPage() {
  const [dataset, setDataset] = useState("billing")
  const [items, setItems] = useState<ExportItem[]>([])
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState("")

  const load = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/exports`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await res.json()
      if (res.ok && data?.success) setItems(Array.isArray(data.data) ? data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createExport = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    setNote("")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/exports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dataset })
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setNote(data?.message || "Failed to create export")
        return
      }

      setItems((prev) => [data.data, ...prev])
      setNote("Export snapshot created")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Export Center</h1>
        <p className="text-gray-600 mt-1">Step 9 governance: export snapshots for billing, usage, offers, health, and audit.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <select
          value={dataset}
          onChange={(e) => setDataset(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {DATASETS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={createExport}
          disabled={loading}
          className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-50"
        >
          {loading ? "Working..." : "Create Export Snapshot"}
        </button>
      </div>

      {note ? <p className="text-sm text-gray-600">{note}</p> : null}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Exports</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No exports yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900 capitalize">{item.dataset}</p>
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 capitalize">{item.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Format: {item.format} • By: {item.createdBy} • {new Date(item.createdAt).toLocaleString()}
                </p>
                {item.counts ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(item.counts).map(([key, value]) => (
                      <span key={key} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
