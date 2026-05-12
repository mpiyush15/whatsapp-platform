'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { API_URL } from '@/lib/config/api'
import { getDomainHeaders } from '@/lib/domain'

type TicketRow = {
  ticketId: string
  conversationId?: string | null
  subject: string
  status: string
  priority: string
  assigneeName?: string | null
  updatedAt?: string
}

export default function SupportTicketsPage() {
  const params = useSearchParams()
  const prefilledConversationId = params.get('conversationId') || ''

  const [rows, setRows] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    conversationId: prefilledConversationId,
    assigneeName: '',
  })

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const res = await fetch(`${API_URL}/support/tickets?limit=100`, {
        headers: { Authorization: `Bearer ${token}`, ...getDomainHeaders() },
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load tickets')
      }
      setRows(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const createTicket = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const res = await fetch(`${API_URL}/support/tickets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...getDomainHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          conversationId: form.conversationId || null,
          assigneeName: form.assigneeName || null,
          source: form.conversationId ? 'inbox' : 'manual',
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to create ticket')
      }
      setSuccess('Ticket created successfully')
      setForm({ subject: '', description: '', priority: 'medium', conversationId: prefilledConversationId, assigneeName: '' })
      await fetchTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 xl:col-span-1">
          <h1 className="text-lg font-bold text-gray-900">Create Support Ticket</h1>
          <p className="mt-1 text-sm text-gray-600">Base ticket workflow for support.domain.</p>

          <form onSubmit={createTicket} className="mt-4 space-y-3">
            <input
              value={form.subject}
              onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Subject"
              required
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Description"
            />
            <input
              value={form.conversationId}
              onChange={(e) => setForm((s) => ({ ...s, conversationId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Conversation ID (optional)"
            />
            <input
              value={form.assigneeName}
              onChange={(e) => setForm((s) => ({ ...s, assigneeName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Assignee name (optional)"
            />
            <select
              value={form.priority}
              onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Create Ticket'}
            </button>
          </form>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Tickets</h2>
            <button
              type="button"
              onClick={fetchTickets}
              className="text-sm font-medium text-green-700 hover:underline"
            >
              Refresh
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No support tickets yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.ticketId}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/support/tickets/${row.ticketId}`} className="font-medium text-gray-900 hover:text-green-700">
                        {row.subject}
                      </Link>
                      <p className="text-xs text-gray-500">{row.ticketId}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{row.priority}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">{row.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.assigneeName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
