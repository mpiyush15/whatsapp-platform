'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { API_URL } from '@/lib/config/api'
import { getDomainHeaders } from '@/lib/domain'

type InboxConversation = {
  conversationId: string
  userPhone?: string
  userName?: string
  userProfileName?: string
  lastMessageAt?: string
  lastMessagePreview?: string
  unreadCount?: number
  priority?: string
  status?: string
}

export default function SupportInboxPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<InboxConversation[]>([])

  const fetchInbox = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const res = await fetch(`${API_URL}/support/inbox`, {
        headers: { Authorization: `Bearer ${token}`, ...getDomainHeaders() },
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load inbox')
      }
      setRows(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInbox()
  }, [])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()),
    [rows]
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Inbox</h1>
            <p className="text-sm text-gray-600">Conversation stream for converting chats to tickets.</p>
          </div>
          <button
            type="button"
            onClick={fetchInbox}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Unread</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No conversations available.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.conversationId}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.userName || row.userProfileName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{row.userPhone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.lastMessagePreview || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{row.unreadCount || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.lastMessageAt ? new Date(row.lastMessageAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/support/tickets?conversationId=${encodeURIComponent(row.conversationId)}`}
                        className="text-sm font-medium text-green-700 hover:underline"
                      >
                        Create ticket
                      </Link>
                    </td>
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
