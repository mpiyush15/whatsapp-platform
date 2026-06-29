'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Inbox, Ticket, RefreshCw } from 'lucide-react'
import { API_URL } from '@/lib/config/api'
import { getDomainHeaders } from '@/lib/domain'

type Overview = {
  openTickets: number
  inProgressTickets: number
  overdueTickets: number
  activeConversations: number
}

type TicketItem = {
  ticketId: string
  subject: string
  status: string
  priority: string
  updatedAt: string
}

export default function SupportOverviewPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [tickets, setTickets] = useState<TicketItem[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')

      const [overviewRes, ticketsRes] = await Promise.all([
        fetch(`${API_URL}/support/overview`, { headers: { Authorization: `Bearer ${token}`, ...getDomainHeaders() } }),
        fetch(`${API_URL}/support/tickets?limit=5`, { headers: { Authorization: `Bearer ${token}`, ...getDomainHeaders() } }),
      ])

      const [overviewJson, ticketsJson] = await Promise.all([overviewRes.json(), ticketsRes.json()])

      if (!overviewRes.ok || !overviewJson?.success) {
        throw new Error(overviewJson?.error || 'Failed to load support overview')
      }

      if (!ticketsRes.ok || !ticketsJson?.success) {
        throw new Error(ticketsJson?.error || 'Failed to load support tickets')
      }

      setOverview(overviewJson.data)
      setTickets(ticketsJson.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const cards = [
    {
      title: 'Open Tickets',
      value: overview?.openTickets ?? 0,
      icon: Ticket,
      accent: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'In Progress',
      value: overview?.inProgressTickets ?? 0,
      icon: Clock,
      accent: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Overdue',
      value: overview?.overdueTickets ?? 0,
      icon: AlertTriangle,
      accent: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      title: 'Active Conversations',
      value: overview?.activeConversations ?? 0,
      icon: Inbox,
      accent: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Operations</h1>
            <p className="text-sm text-gray-600">Step 8 foundation: inbox + ticket workflow + SLA visibility.</p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className={`rounded-xl border p-4 ${card.accent}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{card.title}</p>
                <card.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Latest tickets</h2>
            <Link href="/dashboard/support/tickets" className="text-sm font-medium text-green-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {tickets.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No tickets yet. Start from inbox or create manually.</p>
            ) : (
              tickets.map((ticket) => (
                <Link
                  key={ticket.ticketId}
                  href={`/dashboard/support/tickets/${ticket.ticketId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ticket.subject}</p>
                    <p className="text-xs text-gray-500">{ticket.ticketId} • {ticket.priority}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 capitalize">
                    {ticket.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
