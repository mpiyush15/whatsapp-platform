"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, X, CreditCard, Calendar, DollarSign } from 'lucide-react'
import { ErrorToast } from '@/components/ErrorToast'

interface Subscription {
  _id: string
  subscriptionId: string
  accountId: string
  planId: {
    _id: string
    name: string
    monthlyPrice: number
    yearlyPrice: number
  }
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'pending_payment'
  billingCycle: 'monthly' | 'annual'
  pricing: {
    amount: number
    discount: number
    finalAmount: number
    currency: string
  }
  startDate: string
  endDate: string
  renewalDate: string
  createdAt: string
}

export default function SubscriptionsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/subscription/my-subscription`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setSubscription(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/subscription/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ reason: cancellationReason })
        }
      )
      const data = await response.json()
      if (data.success) {
        setShowCancelModal(false)
        fetchSubscription()
        setError(null)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription')
    }
  }

  const handlePauseSubscription = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/subscription/pause`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        fetchSubscription()
        setError(null)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause subscription')
    }
  }

  const handleResumeSubscription = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/subscription/resume`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        fetchSubscription()
        setError(null)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your subscription...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Subscription</h2>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              You don't have an active subscription yet. Choose a plan to get started and enjoy all features.
            </p>
            <a
              href="/pricing"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              View Plans
            </a>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' }
      case 'paused':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' }
      case 'cancelled':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' }
      case 'expired':
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' }
      case 'pending_payment':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' }
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' }
    }
  }

  const colors = getStatusColor(subscription.status)
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Details</h1>
          <p className="text-gray-600">Manage your active subscription and billing information</p>
        </div>

        {/* Main Card */}
        <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-8 mb-8`}>
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{subscription.planId.name} Plan</h2>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${colors.badge} capitalize`}>
                {subscription.status === 'pending_payment' ? 'Pending Payment' : subscription.status}
              </span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {subscription.pricing.currency} {subscription.pricing.finalAmount}
                <span className="text-lg text-gray-600 font-normal">/{subscription.billingCycle === 'monthly' ? 'month' : 'year'}</span>
              </div>
            </div>
          </div>

          {/* Pricing Details */}
          <div className="grid grid-cols-3 gap-4 mb-6 py-6 border-t border-b border-gray-300/30">
            <div>
              <p className="text-gray-600 text-sm mb-1">Original Price</p>
              <p className="text-xl font-bold text-gray-900">{subscription.pricing.currency} {subscription.pricing.amount}</p>
            </div>
            {subscription.pricing.discount > 0 && (
              <div>
                <p className="text-gray-600 text-sm mb-1">Discount</p>
                <p className="text-xl font-bold text-green-600">-{subscription.pricing.currency} {subscription.pricing.discount}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600 text-sm mb-1">Final Amount</p>
              <p className="text-xl font-bold text-gray-900">{subscription.pricing.currency} {subscription.pricing.finalAmount}</p>
            </div>
          </div>

          {/* Key Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start gap-4">
              <Calendar className={`w-6 h-6 ${colors.text} flex-shrink-0 mt-1`} />
              <div>
                <p className="text-gray-600 text-sm">Start Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(subscription.startDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Calendar className={`w-6 h-6 ${colors.text} flex-shrink-0 mt-1`} />
              <div>
                <p className="text-gray-600 text-sm">Renewal Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(subscription.renewalDate)}</p>
              </div>
            </div>
          </div>

          {/* Subscription ID */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-gray-600 text-sm mb-1">Subscription ID</p>
            <p className="font-mono text-gray-900 break-all">{subscription.subscriptionId}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {subscription.status === 'active' && (
              <>
                <button
                  onClick={handlePauseSubscription}
                  className="flex-1 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 font-semibold transition-colors"
                >
                  Pause Subscription
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-semibold transition-colors"
                >
                  Cancel Subscription
                </button>
              </>
            )}
            {subscription.status === 'paused' && (
              <button
                onClick={handleResumeSubscription}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                Resume Subscription
              </button>
            )}
            <a
              href="/checkout"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors text-center"
            >
              Upgrade Plan
            </a>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription?</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel your subscription? You'll lose access to all features at the end of your billing period.
              </p>
              <textarea
                placeholder="Tell us why (optional)"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold transition-colors"
                >
                  Cancel Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            Have questions about your subscription? Visit our help center or contact our support team.
          </p>
          <div className="flex gap-3">
            <a href="/contact" className="text-blue-600 hover:text-blue-700 font-semibold">
              Contact Support →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
