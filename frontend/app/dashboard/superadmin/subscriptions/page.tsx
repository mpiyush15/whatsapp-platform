'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Eye, Loader, AlertCircle } from 'lucide-react'
import { ErrorToast } from '@/components/ErrorToast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

interface Subscription {
  _id: string
  organizationId: string
  organizationName: string
  planName: string
  billingCycle: string
  startDate: string
  endDate: string
  status: 'active' | 'cancelled' | 'paused'
  amount: number
  totalTransactions: number
  totalAmount: number
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('token')
      
      // Use the subscription controller endpoint that shows ALL subscriptions for admins
      const res = await fetch(`${API_URL}/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch subscriptions')

      const subsData = data.data || data.subscriptions || []
      setSubscriptions(Array.isArray(subsData) ? subsData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleViewTransactions = async (subscription: Subscription) => {
    try {
      setSelectedSubscription(subscription)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/subscriptions/${subscription._id}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch transactions')

      const transData = data.data || data.transactions || []
      setTransactions(Array.isArray(transData) ? transData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-blue-600" />
            All Subscriptions
          </h1>
          <p className="text-gray-600 mt-2">Manage and monitor all organization subscriptions</p>
        </div>

        {/* Error Toast */}
        {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

        {/* Stats */}
        {subscriptions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Total Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900">{subscriptions.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-3xl font-bold text-green-600">{subscriptions.filter(s => s.status === 'active').length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Total Subscriptions Value</p>
              <p className="text-3xl font-bold text-blue-600">₹{subscriptions.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-3xl font-bold text-purple-600">{subscriptions.reduce((sum, s) => sum + s.totalTransactions, 0)}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No subscriptions yet</p>
            <p className="text-gray-500">Active subscriptions will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Organization</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Billing</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Start Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Transactions</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Value</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription) => (
                    <tr key={subscription._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{subscription.organizationName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{subscription.planName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{subscription.billingCycle}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(subscription.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          subscription.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : subscription.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subscription.status === 'active' ? '✓ Active' : subscription.status === 'paused' ? '⏸ Paused' : '✕ Cancelled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">₹{subscription.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">{subscription.totalTransactions}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">₹{subscription.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewTransactions(subscription)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                          title="View Transactions"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Modal */}
        {selectedSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedSubscription.organizationName}</h2>
                  <p className="text-sm text-gray-600">{selectedSubscription.planName} - {selectedSubscription.billingCycle}</p>
                </div>
                <button
                  onClick={() => setSelectedSubscription(null)}
                  className="text-gray-500 hover:text-gray-700 font-bold text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Transactions */}
              <div className="p-6">
                {transactions.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No transactions</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{transaction.orderId}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">₹{transaction.amount.toLocaleString()}</p>
                          <p className={`text-xs font-semibold ${transaction.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {transaction.status === 'completed' ? '✓ Paid' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
