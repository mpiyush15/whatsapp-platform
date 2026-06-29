'use client'

import { AlertCircle, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { User } from '@/lib/auth'

interface PendingPaymentBannerProps {
  user: User
  planAmount?: number // Amount due for the plan
}

export function PendingPaymentBanner({ user, planAmount = 0 }: PendingPaymentBannerProps) {
  if (user.status !== 'pending' || !user.plan) {
    return null
  }

  const isFreeOrInternal = user.plan === 'free' || user.role === 'superadmin'
  if (isFreeOrInternal) return null

  const planDisplay = {
    starter: 'Starter Plan',
    pro: 'Pro Plan',
    enterprise: 'Enterprise Plan',
    custom: 'Custom Plan'
  }[user.plan] || user.plan

  const billingCycleDisplay = {
    monthly: 'Monthly',
    quarterly: 'Quarterly (3 months)',
    annual: 'Annual (12 months)'
  }[user.billingCycle || 'monthly'] || 'Monthly'

  return (
    <div className="w-full bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-orange-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Payment Required
          </h3>
          <p className="text-gray-700 mt-1">
            Complete your payment to activate your {planDisplay} and unlock all features
          </p>

          {/* Plan Details */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600 font-medium">Plan</p>
              <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">
                {planDisplay}
              </p>
            </div>

            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600 font-medium">Billing Cycle</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {billingCycleDisplay}
              </p>
            </div>

            {planAmount > 0 && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Amount Due</p>
                <p className="text-sm font-semibold text-orange-600 mt-1">
                  ₹{planAmount.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Payment Warning */}
          <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-300">
            <p className="text-sm text-orange-800">
              <Clock className="inline-block h-4 w-4 mr-2" />
              Your account is in pending payment status. Some features are locked.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-3">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 px-6 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              <DollarSign size={18} />
              Complete Payment
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
