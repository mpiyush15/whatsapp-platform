'use client'

import { useState, useEffect } from 'react'
import { Mail, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import { API_URL } from '@/lib/config/api'

interface PendingClient {
  _id: string
  name: string
  email: string
  companyName: string
  status: string
  amount: number
  plan: string
}

export function PendingPaymentReminder() {
  const [pendingClients, setPendingClients] = useState<PendingClient[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch pending payment clients
  useEffect(() => {
    const fetchPendingClients = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_URL}/accounts/pending-payments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setPendingClients(data.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch pending clients:', err)
        setError('Failed to load pending clients')
      } finally {
        setLoading(false)
      }
    }

    fetchPendingClients()
  }, [])

  const sendReminderEmail = async (clientId: string, clientEmail: string, clientName: string) => {
    setSending(clientId)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/emails/send-payment-reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId,
          email: clientEmail,
          name: clientName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      setSuccess(`Email sent to ${clientEmail}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
      setTimeout(() => setError(null), 3000)
    } finally {
      setSending(null)
    }
  }

  const sendBulkReminders = async () => {
    setSending('bulk')
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/emails/send-bulk-payment-reminders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientIds: pendingClients.map(c => c._id)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send bulk emails')
      }

      const data = await response.json()
      setSuccess(`Sent ${data.data?.sent || pendingClients.length} reminder emails`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send bulk emails')
      setTimeout(() => setError(null), 3000)
    } finally {
      setSending(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (pendingClients.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Perfect! All Payments Clear</p>
              <p className="text-sm text-gray-600 mt-1">No clients with pending payments • Revenue flowing smoothly</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Next action</p>
            <p className="text-lg font-bold text-green-600 mt-1">Monitor Revenue</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Mail className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Payment Reminders</h3>
          </div>
          <p className="text-sm text-gray-600">{pendingClients.length} {pendingClients.length === 1 ? 'client' : 'clients'} with pending payments • Total Due: ₹{pendingClients.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}</p>
        </div>
        <button
          onClick={sendBulkReminders}
          disabled={sending === 'bulk'}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-lg transition flex items-center gap-2"
        >
          {sending === 'bulk' && <Loader className="h-4 w-4 animate-spin" />}
          Send All Reminders
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-900">{success}</p>
        </div>
      )}

      {/* Client List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Client Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Company</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Plan</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount Due</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingClients.map((client) => (
              <tr key={client._id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-4 px-4 text-sm font-medium text-gray-900">{client.name}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{client.email}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{client.companyName}</td>
                <td className="py-4 px-4">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 capitalize">
                    {client.plan}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm font-medium text-gray-900">
                  ₹{client.amount?.toLocaleString() || '0'}
                </td>
                <td className="py-4 px-4 text-sm">
                  <button
                    onClick={() => sendReminderEmail(client._id, client.email, client.name)}
                    disabled={sending === client._id}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded transition text-xs"
                  >
                    {sending === client._id && <Loader className="h-3 w-3 animate-spin" />}
                    {sending === client._id ? 'Sending...' : 'Send Reminder'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
