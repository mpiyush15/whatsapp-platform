"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LifeBuoy, MessageSquare, Mail, ArrowRight } from "lucide-react"
import { API_URL } from "@/lib/config/api"

type Ticket = {
  _id: string
  ticketId: string
  subject: string
  description: string
  status: string
  priority: string
  createdAt: string
}

export default function ClientSupportFallbackPage() {
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [message, setMessage] = useState("")

  const loadTickets = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/client/support/tickets`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-app-domain": "app"
        }
      })

      const data = await response.json()
      if (response.ok && data?.success) {
        setTickets(Array.isArray(data.data) ? data.data : [])
      }
    } catch {
      // silent fail for lightweight fallback screen
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage("")

    if (!subject.trim()) {
      setMessage("Please enter a ticket subject.")
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      setMessage("Please login again.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/client/support/tickets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-app-domain": "app"
        },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          priority
        })
      })

      const data = await response.json()
      if (!response.ok || !data?.success) {
        setMessage(data?.message || "Could not raise ticket. Please try again.")
        return
      }

      const created = data?.data as Ticket
      setTickets((prev) => [created, ...prev])
      setSubject("")
      setDescription("")
      setPriority("medium")
      setMessage(`Ticket created: ${created.ticketId}`)
    } catch {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <LifeBuoy className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
              <p className="text-gray-600 mt-1">
                Raise a ticket directly for support, or contact us through live chat/email.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTicket} className="mt-6 space-y-4 rounded-xl border p-4 bg-slate-50">
            <h2 className="font-semibold text-gray-900">Raise a Ticket</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Issue summary"
                maxLength={140}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us what happened"
                  maxLength={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Raise Ticket"}
            </button>

            {message ? <p className="text-sm text-gray-700">{message}</p> : null}
          </form>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              href="/dashboard/features/live-chat"
              className="rounded-xl border p-4 hover:shadow-sm transition bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Use Live Chat</p>
                    <p className="text-sm text-gray-600">Fastest way to reach our team</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500" />
              </div>
            </Link>

            <a
              href="mailto:support@replysys.ai?subject=Support%20Request"
              className="rounded-xl border p-4 hover:shadow-sm transition bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Email Support</p>
                    <p className="text-sm text-gray-600">support@replysys.ai</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500" />
              </div>
            </a>
          </div>

          <div className="mt-6 rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Recent Tickets</h3>
            {tickets.length === 0 ? (
              <p className="text-sm text-gray-600">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 5).map((ticket) => (
                  <div key={ticket._id} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">{ticket.subject}</p>
                      <span className="text-xs text-gray-500">{ticket.ticketId}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                      <span className="capitalize">{ticket.status}</span>
                      <span>•</span>
                      <span className="capitalize">{ticket.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
