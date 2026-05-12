"use client"

import { useEffect, useState } from "react"
import { API_URL } from "@/lib/config/api"

type AuditLog = {
  _id: string
  actor: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [actor, setActor] = useState("")
  const [action, setAction] = useState("")
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (actor.trim()) params.set("actor", actor.trim())
      if (action.trim()) params.set("action", action.trim())
      params.set("limit", "100")

      const res = await fetch(`${API_URL}/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        setLogs(Array.isArray(data.data) ? data.data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log Explorer</h1>
        <p className="text-gray-600 mt-1">Step 9 governance foundation for sensitive superadmin operations.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Filter by actor email"
          />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Filter by action"
          />
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-black"
          >
            {loading ? "Loading..." : "Apply Filters"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-600">No audit logs found.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log._id} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Actor: {log.actor || "unknown"} • Entity: {log.entityType || "n/a"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
