'use client'

import { useParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { API_URL } from '@/lib/config/api'
import { getDomainHeaders } from '@/lib/domain'

type MessageItem = {
  direction?: string
  messageType?: string
  content?: { text?: string; caption?: string }
  createdAt?: string
}

type InternalNote = {
  note: string
  createdBy: string
  createdAt: string
}

type TicketDetail = {
  ticketId: string
  subject: string
  description?: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigneeName?: string | null
  escalated?: boolean
  slaDueAt?: string | null
  conversationMessages?: MessageItem[]
  internalNotes?: InternalNote[]
}

export default function SupportTicketDetailPage() {
  const params = useParams<{ ticketId: string }>()
  const ticketId = params?.ticketId

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const fetchTicket = async () => {
    if (!ticketId) return
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const res = await fetch(`${API_URL}/support/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}`, ...getDomainHeaders() },
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load ticket')
      }
      setTicket(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [ticketId])

  const updateTicket = async (patch: Partial<TicketDetail>) => {
    if (!ticketId) return
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const res = await fetch(`${API_URL}/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          ...getDomainHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to update ticket')
      }
      await fetchTicket()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket')
    }
  }

  const addNote = async (e: FormEvent) => {
    e.preventDefault()
    if (!note.trim() || !ticketId) return

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const res = await fetch(`${API_URL}/support/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...getDomainHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to add note')
      }
      setNote('')
      await fetchTicket()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ticket {ticket?.ticketId || ticketId}</h1>
            <p className="text-sm text-gray-600">Support base workflow: status, SLA, notes, linked chat timeline.</p>
          </div>
          <button
            type="button"
            onClick={fetchTicket}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 xl:col-span-1">
            <h2 className="text-sm font-semibold text-gray-900">Ticket controls</h2>
            <p className="text-sm text-gray-700">{ticket?.subject || '-'}</p>
            <p className="text-xs text-gray-500">{ticket?.description || 'No description'}</p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
              <select
                value={ticket?.status || 'open'}
                onChange={(e) => updateTicket({ status: e.target.value as TicketDetail['status'] })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Priority</label>
              <select
                value={ticket?.priority || 'medium'}
                onChange={(e) => updateTicket({ priority: e.target.value as TicketDetail['priority'] })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              <p><span className="font-semibold">Assignee:</span> {ticket?.assigneeName || 'Unassigned'}</p>
              <p><span className="font-semibold">Escalated:</span> {ticket?.escalated ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">SLA Due:</span> {ticket?.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString() : '-'}</p>
            </div>

            <form onSubmit={addNote} className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Internal note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Add note for support team"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Add note
              </button>
            </form>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white xl:col-span-2">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Linked conversation timeline</h2>
            </div>
            <div className="space-y-3 p-4">
              {(ticket?.conversationMessages || []).length === 0 ? (
                <p className="text-sm text-gray-500">No linked conversation messages.</p>
              ) : (
                ticket?.conversationMessages?.map((msg, idx) => (
                  <div key={`${msg.createdAt}-${idx}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span className="capitalize">{msg.direction || 'message'}</span>
                      <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '-'}</span>
                    </div>
                    <p className="text-sm text-gray-800">{msg.content?.text || msg.content?.caption || '-'}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Internal notes</h3>
              <div className="mt-3 space-y-2">
                {(ticket?.internalNotes || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No notes added yet.</p>
                ) : (
                  ticket?.internalNotes?.map((entry, idx) => (
                    <div key={`${entry.createdAt}-${idx}`} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-sm text-gray-800">{entry.note}</p>
                      <p className="mt-1 text-xs text-gray-500">{entry.createdBy} • {new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
