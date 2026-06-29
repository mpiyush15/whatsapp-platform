'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, DollarSign, XCircle } from 'lucide-react'
import { API_URL } from '@/lib/config/api'

interface PendingTransaction {
  transactionId: string
  orderId: string
  status: string
  createdAt: string
  planDetails: {
    planName: string
    selectedCycle: string
    monthlyPrice: number
    setupFee: number
    discountApplied: number
    discountReason: string
  }
  amount: number
  finalAmount: number
  currency: string
  paymentGateway: string
  paymentSessionId: string
}

interface PendingTransactionsCardProps {
  showForSuperadmin?: boolean
}

export function PendingTransactionsCard({ showForSuperadmin = false }: PendingTransactionsCardProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPendingTransactions = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('token')
        
        // Fetch pending transactions
        const endpoint = showForSuperadmin 
          ? '/subscriptions/all-pending-transactions'
          : '/subscriptions/pending-transactions'
        
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch pending transactions')
        }

        if (data.data && data.data.length > 0) {
          setTransactions(data.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pending transactions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingTransactions()
  }, [showForSuperadmin])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <p className="text-gray-500">Loading pending transactions...</p>
      </div>
    )
  }

  if (error || transactions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <div
          key={transaction.transactionId}
          className="bg-white rounded-lg border-l-4 border-orange-500 p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment Pending
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Order ID: <span className="font-mono">{transaction.orderId}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">
                ₹{transaction.finalAmount?.toLocaleString('en-IN') || transaction.amount?.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(transaction.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Plan Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium uppercase">Plan</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {transaction.planDetails?.planName}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium uppercase">Billing Cycle</p>
              <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">
                {transaction.planDetails?.selectedCycle}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium uppercase">Monthly Price</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                ₹{transaction.planDetails?.monthlyPrice?.toLocaleString('en-IN')}
              </p>
            </div>

            {transaction.planDetails?.setupFee > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium uppercase">Setup Fee</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  ₹{transaction.planDetails?.setupFee?.toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>

          {/* Discount Info */}
          {transaction.planDetails?.discountApplied > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800">
                <span className="font-semibold">{transaction.planDetails?.discountApplied}% Discount Applied</span> - {transaction.planDetails?.discountReason}
              </p>
            </div>
          )}

          {/* Pricing Snapshot Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800">
              🔒 <span className="font-semibold">Pricing Locked:</span> This amount is exactly what was shown at checkout. It will not change even if plan prices update.
            </p>
          </div>

          {/* Client Info (for superadmin view) */}
          {showForSuperadmin && transaction.client && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-600 font-medium uppercase">Client</p>
              <p className="text-sm font-semibold text-gray-900">
                {transaction.client.name}
              </p>
              <p className="text-xs text-gray-600">
                {transaction.client.email}
              </p>
              {transaction.client.company && (
                <p className="text-xs text-gray-600">
                  {transaction.client.company}
                </p>
              )}
              {transaction.daysPending && (
                <p className="text-xs text-orange-600 font-semibold mt-2">
                  Pending for {transaction.daysPending} day{transaction.daysPending !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <a
              href={`/dashboard/billing?orderId=${transaction.orderId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              <DollarSign size={16} />
              Complete Payment
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
