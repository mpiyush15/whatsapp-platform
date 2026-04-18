'use client'

import { useState, useEffect } from 'react'
import { Loader, Eye, FileText, AlertCircle } from 'lucide-react'
import { ErrorToast } from '@/components/ErrorToast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

interface Subscription {
  _id: string
  planName: string
  status: string
  startDate: string
  endDate: string
  billingCycle: string
  totalTransactions: number
  totalPaid: number
  nextBillingDate: string
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [showTransactions, setShowTransactions] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [transLoading, setTransLoading] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('token')
      
      const res = await fetch(`${API_URL}/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch subscriptions')

      const subs = data.data || data.subscriptions || []
      setSubscriptions(subs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleViewTransactions = async (sub: Subscription) => {
    try {
      setSelectedSub(sub)
      setTransLoading(true)

      const token = localStorage.getItem('token')
      
      const res = await fetch(`${API_URL}/subscriptions/${sub._id}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch transactions')

      setTransactions(data.data || data.transactions || [])
      setShowTransactions(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching transactions')
    } finally {
      setTransLoading(false)
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Subscriptions</h1>
          <p className="text-gray-600 mt-2">View all your active subscriptions and transaction history</p>
        </div>

        {/* Error Toast */}
        {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

        {/* Empty State */}
        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No subscriptions yet</p>
            <p className="text-gray-500">Your subscriptions will appear here once you make a payment</p>
          </div>
        ) : (
          <>
            {/* Subscriptions Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Start Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Next Billing</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cycle</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Transactions</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Paid</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{sub.planName}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            sub.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sub.status === 'active' ? '✓ Active' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(sub.startDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(sub.nextBillingDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{sub.billingCycle}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{sub.totalTransactions}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">₹{sub.totalPaid.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleViewTransactions(sub)}
                            disabled={transLoading}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition disabled:opacity-50"
                            title="View transactions"
                          >
                            {transLoading && selectedSub?._id === sub._id ? (
                              <Loader className="h-5 w-5 animate-spin" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-gray-900">{subscriptions.filter(s => s.status === 'active').length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{subscriptions.reduce((sum, s) => sum + s.totalTransactions, 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Paid Amount</p>
                    <p className="text-2xl font-bold text-blue-600">₹{subscriptions.reduce((sum, s) => sum + s.totalPaid, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Modal */}
            {showTransactions && selectedSub && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">{selectedSub.planName} - Transactions</h2>
                    <button
                      onClick={() => setShowTransactions(false)}
                      className="text-gray-500 hover:text-gray-900 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6">
                    {transactions.length === 0 ? (
                      <p className="text-gray-600 text-center py-8">No transactions for this subscription</p>
                    ) : (
                      <div className="space-y-4">
                        {transactions.map((trans) => (
                          <div key={trans._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-900">{trans.invoiceNumber || `INV-${trans._id.slice(0, 5)}`}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(trans.date || trans.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-blue-600">₹{trans.amount.toLocaleString()}</p>
                                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${
                                  trans.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {trans.status === 'completed' ? '✓ Paid' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{trans.billingCycle} billing cycle</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-gray-600">Total Transactions: <span className="font-bold text-gray-900">{transactions.length}</span></p>
                      <p className="text-sm text-gray-600">Total Amount: <span className="font-bold text-blue-600">₹{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}</span></p>
                    </div>
                    <button
                      onClick={() => setShowTransactions(false)}
                      className="w-full py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
