"use client"

import { useEffect, useState } from "react"
import { API_URL } from "@/lib/config/api"

type MaintenanceItem = {
  _id: string
  title: string
  message: string
  segment: string
  status: "draft" | "scheduled" | "sent" | "cancelled"
  scheduledAt: string | null
  createdBy: string
  createdAt: string
  delivery?: {
    targeted?: number
    sent?: number
    failed?: number
    acknowledged?: number
  }
}

export default function MaintenanceAnnouncementsPage() {
  const [items, setItems] = useState<MaintenanceItem[]>([])
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [segment, setSegment] = useState("all")
  const [scheduledAt, setScheduledAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const load = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/admin/maintenance-announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await res.json()
      if (res.ok && data?.success) setItems(Array.isArray(data.data) ? data.data : [])
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      setNote("Title and message are required.")
      return
    }
    if (!token) {
      setNote("Please login again.")
      return
    }

    setLoading(true)
    setNote("")
    try {
      const res = await fetch(`${API_URL}/admin/maintenance-announcements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          message,
          segment,
          scheduledAt: scheduledAt || null
        })
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setNote(data?.message || "Failed to create announcement.")
        return
      }

      setItems((prev) => [data.data, ...prev])
      setTitle("")
      setMessage("")
      setSegment("all")
      setScheduledAt("")
      setNote("Announcement created.")
    } catch {
      setNote("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const applyItemUpdate = (updatedItem: MaintenanceItem) => {
    setItems((prev) => prev.map((item) => (item._id === updatedItem._id ? updatedItem : item)))
  }

  const updateStatus = async (itemId: string, status: "draft" | "scheduled" | "sent" | "cancelled") => {
    const token = localStorage.getItem("token")
    if (!token) return
    setUpdatingId(itemId)
    setNote("")

    try {
      const res = await fetch(`${API_URL}/admin/maintenance-announcements/${itemId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setNote(data?.message || "Failed to update status")
        return
      }
      applyItemUpdate(data.data)
      setNote(`Status updated to ${status}.`)
    } finally {
      setUpdatingId(null)
    }
  }

  const sendAnnouncement = async (itemId: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setUpdatingId(itemId)
    setNote("")
    try {
      const res = await fetch(`${API_URL}/admin/maintenance-announcements/${itemId}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setNote(data?.message || "Failed to send announcement")
        return
      }
      applyItemUpdate(data.data)
      setNote("Announcement sent.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Maintenance Announcement Center</h1>
        <p className="text-gray-600 mt-1">Step 9 foundation: create and schedule client maintenance communications.</p>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Create Announcement</h2>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            maxLength={140}
            placeholder="Scheduled maintenance window"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={4}
            maxLength={2000}
            placeholder="Write communication message"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Segment</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All clients</option>
              <option value="paid">Paid clients</option>
              <option value="trial">Trial clients</option>
              <option value="internal-excluded">Exclude internal orgs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Announcement"}
        </button>

        {note ? <p className="text-sm text-gray-600">{note}</p> : null}
      </form>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Announcements</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 capitalize">{item.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Segment: {item.segment} • Created by: {item.createdBy}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Delivery — targeted: {item.delivery?.targeted || 0}, sent: {item.delivery?.sent || 0}, failed: {item.delivery?.failed || 0}, ack: {item.delivery?.acknowledged || 0}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.status !== "sent" && item.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => sendAnnouncement(item._id)}
                      disabled={updatingId === item._id}
                      className="rounded-md bg-green-600 text-white text-xs px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
                    >
                      Send Now
                    </button>
                  ) : null}

                  {item.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => updateStatus(item._id, "cancelled")}
                      disabled={updatingId === item._id}
                      className="rounded-md bg-gray-200 text-gray-800 text-xs px-3 py-1.5 hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
