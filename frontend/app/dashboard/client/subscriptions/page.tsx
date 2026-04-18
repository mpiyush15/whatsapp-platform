'use client'

import { useState, useEffect } from 'react'
import { Loader, Check, AlertCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

interface Subscription {
  _id: string
  planId?: { name: string }
  planName?: string
  status: string
  startDate: string
  endDate: string
  billingCycle: string
  amount?: number
  renewalDate?: string
  accountId: string
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('token')
      console.log('📝 Fetching subscriptions...')
      console.log('🔑 Token:', token ? '✓ Present' : '❌ Missing')
      
      const res = await fetch(`${API_URL}/subscriptions/my-subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 Response status:', res.status, res.statusText)
      
      const data = await res.json()
      console.log('📦 Response data:', JSON.stringify(data, null, 2))
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch subscriptions')

      const subs = data.data?.subscriptions || data.subscriptions || []
      console.log('✅ Subscriptions fetched:', subs.length)
      console.log('📋 Subscriptions:', subs)
      setSubscriptions(subs)
    } catch (err) {
      console.error('❌ Error:', err)
      setError(err instanceof Error ? err.message : 'Error fetching subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'paused':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const formatDate = (date: string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
          <h1 className="text-4xl font-bold text-gray-900">My Subscriptions</h1>
          <p className="text-gray-600 mt-2">Manage your active subscriptions</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* No Subscriptions */}
        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Subscriptions Yet</h2>
            <p className="text-gray-600 mb-6">You don't have any active subscriptions</p>
            <a
              href="/pricing"
              className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              Browse Plans
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((sub) => (
              <div
                key={sub._id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow p-6"
              >
                {/* Plan Name */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {sub.planId?.name || sub.planName || 'Unknown Plan'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 capitalize">
                      {sub.billingCycle || 'monthly'} billing
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      sub.status
                    )}`}
                  >
                    {sub.status?.charAt(0).toUpperCase() + sub.status?.slice(1) || 'Active'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-6 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold text-gray-900">
                      ₹{sub.amount?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Started</span>
                    <span className="font-semibold text-gray-900">{formatDate(sub.startDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Renewal Date</span>
                    <span className="font-semibold text-gray-900">
                      {formatDate(sub.renewalDate || sub.endDate)}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                {sub.status?.toLowerCase() === 'active' && (
                  <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-semibold bg-green-50 py-2 rounded">
                    <Check className="h-4 w-4" />
                    Active & Running
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
