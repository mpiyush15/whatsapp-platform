'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, X, Loader, CheckCircle } from 'lucide-react'
import { API_URL } from '@/lib/config/api'
import { authService } from '@/lib/auth'

interface CompletePaymentCardProps {
  user: any
  subscription: any
  onPaymentComplete: () => void
}

export function CompletePaymentCard({ user, subscription, onPaymentComplete }: CompletePaymentCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [selectedTenure, setSelectedTenure] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cashfreeLoaded, setCashfreeLoaded] = useState(false)
  const [hasExistingPlan, setHasExistingPlan] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/pricing/plans/public`)
        if (response.ok) {
          const data = await response.json()
          setPlans(data.data || [])
          if (data.data && data.data.length > 0) {
            // Set to the plan they selected during registration
            const currentPlanName = subscription?.planId?.name || data.data[0].name
            setSelectedPlan(currentPlanName)
          }
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err)
        setError('Failed to load plans')
      } finally {
        setIsLoadingPlans(false)
      }
    }
    fetchPlans()

    // Check if user has existing active subscription
    if (user?.status === 'active' && user?.plan) {
      setHasExistingPlan(true)
    }
  }, [subscription, user])

  // Load Cashfree SDK when modal opens
  useEffect(() => {
    if (!showModal) return

    const script = document.createElement('script')
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    script.async = true
    script.type = 'text/javascript'

    script.onload = () => {
      const maxAttempts = 30
      let attempts = 0

      const verify = setInterval(() => {
        attempts++
        if ((window as any).Cashfree) {
          setCashfreeLoaded(true)
          clearInterval(verify)
        } else if (attempts >= maxAttempts) {
          setError('Payment gateway failed to initialize. Please refresh.')
          clearInterval(verify)
        }
      }, 100)
    }

    document.body.appendChild(script)
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [showModal])

  const selectedPlanData = plans.find(p => p.name === selectedPlan)
  const price = selectedTenure === 'monthly' 
    ? selectedPlanData?.monthlyPrice || 0
    : selectedTenure === 'quarterly'
    ? Math.floor((selectedPlanData?.monthlyPrice || 0) * 3 * 0.95)
    : Math.floor((selectedPlanData?.monthlyPrice || 0) * 12 * 0.8)

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsProcessing(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/subscriptions/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle: selectedTenure,
          replaceExisting: hasExistingPlan && replaceExisting
        })
      })

      const orderData = await response.json()
      if (!response.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to create order')
      }

      if (!(window as any).Cashfree) {
        throw new Error('Payment gateway not available')
      }

      const cashfree = await (window as any).Cashfree({ mode: 'production' })
      const result = await cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: '_modal'
      })

      if (result.error) {
        throw new Error(result.error.message || 'Payment failed')
      }

      if (result.paymentDetails) {
        // Payment successful
        setSuccess(true)
        setTimeout(() => {
          setShowModal(false)
          onPaymentComplete()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // If payment is already complete or subscription is active, don't show this card
  if (user?.status === 'active' || subscription?.status === 'active') {
    return null
  }

  return (
    <>
      {/* Card */}
      <div className="bg-white rounded-xl border-2 border-orange-200 shadow-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-orange-100 p-3 rounded-lg flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Payment to Use Platform</h3>
            <p className="text-gray-600 mb-4">
              Your account is ready! Complete the payment for your selected plan to start using all features.
            </p>
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <p className="text-gray-500">Current Plan</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {subscription?.planId?.name || 'Not selected'}
                </p>
              </div>
              <div className="text-sm ml-4">
                <p className="text-gray-500">Amount Due</p>
                <p className="font-semibold text-gray-900">
                  ₹{subscription?.amount?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              Complete Payment Now
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setError(null)
                  setSuccess(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {success ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
                  <p className="text-gray-600">Your subscription is now active. Redirecting...</p>
                </div>
              ) : (
                <>
                  {/* Error */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <p className="text-red-900 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Existing Plan Warning */}
                  {hasExistingPlan && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-900 font-semibold mb-3">
                        ⚠️ You already have an active {user?.plan} plan
                      </p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replaceExisting}
                          onChange={(e) => setReplaceExisting(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-yellow-800">
                          Replace existing plan with {selectedPlan}
                        </span>
                      </label>
                      <p className="text-xs text-yellow-700 mt-2">
                        Your current plan will be cancelled and you'll switch to the new plan.
                      </p>
                    </div>
                  )}

                  <form onSubmit={handlePayment} className="space-y-6">
                    {/* Plan Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Select Plan (Can change once)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {isLoadingPlans ? (
                          <div className="col-span-2 text-center py-4">
                            <Loader className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
                          </div>
                        ) : (
                          plans.map((plan) => (
                            <button
                              key={plan.name}
                              type="button"
                              onClick={() => setSelectedPlan(plan.name)}
                              className={`p-4 rounded-lg border-2 transition ${
                                selectedPlan === plan.name
                                  ? 'border-green-600 bg-green-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="font-bold text-gray-900">{plan.name}</div>
                              <div className="text-sm text-gray-600 mt-1">₹{plan.monthlyPrice}/month</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Tenure Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Billing Cycle
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTenure('monthly')}
                          className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                            selectedTenure === 'monthly'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-bold">Monthly</div>
                          <div className="text-xs mt-1">Full Price</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTenure('quarterly')}
                          className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                            selectedTenure === 'quarterly'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-bold">Quarterly</div>
                          <div className="text-xs mt-1">5% Off</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTenure('annual')}
                          className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                            selectedTenure === 'annual'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-bold">Annual</div>
                          <div className="text-xs mt-1">20% Off</div>
                        </button>
                      </div>
                    </div>

                    {/* Price Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Plan</span>
                        <span className="font-semibold text-gray-900 capitalize">{selectedPlan}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Billing Cycle</span>
                        <span className="font-semibold text-gray-900 capitalize">{selectedTenure}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total Amount</span>
                        <span className="text-2xl font-bold text-green-600">₹{price.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payment Button */}
                    <button
                      type="submit"
                      disabled={isProcessing || !cashfreeLoaded}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      {isProcessing && <Loader className="h-5 w-5 animate-spin" />}
                      {isProcessing ? 'Processing...' : `Pay ₹${price.toLocaleString()}`}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
