'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Loader, ArrowRight, Check } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const planName = searchParams.get('plan') || 'starter'
  const cycle = (searchParams.get('cycle') as 'monthly' | 'quarterly' | 'annual') || 'monthly'

  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>(cycle)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  // Auth form state
  const [showLogin, setShowLogin] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) setIsAuthenticated(true)

        const res = await fetch(`${API_URL}/pricing/plans/public`)
        const data = await res.json()
        const plans = data.data?.data || data.data || []
        const plan = plans.find((p: any) => p.name.toLowerCase() === planName.toLowerCase())
        if (plan) setSelectedPlan(plan)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [planName])

  const calculatePrice = () => {
    if (!selectedPlan) return 0
    const monthly = selectedPlan.monthlyPrice || 0
    const multiplier = billingCycle === 'monthly' ? 1 : billingCycle === 'quarterly' ? 3 : 12
    return monthly * multiplier
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup'
      const body = authMode === 'login'
        ? { email: formData.email, password: formData.password }
        : { 
            name: formData.name, 
            email: formData.email, 
            password: formData.password,
            selectedPlan: selectedPlan?.name,
            billingCycle
          }

      console.log('📝 Auth request:', { endpoint, body })
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await res.json()
      console.log('📦 Auth response:', result)
      
      if (!res.ok) throw new Error(result.message || 'Auth failed')

      localStorage.setItem('token', result.data?.token || result.token)
      setIsAuthenticated(true)
      setShowLogin(false)
      setFormData({ name: '', email: '', password: '' })
    } catch (err) {
      console.error('❌ Auth error:', err)
      setAuthError(err instanceof Error ? err.message : 'Error')
    } finally {
      setAuthLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!isAuthenticated) {
      setError('Please login first')
      return
    }

    setError('')
    setProcessing(true)

    try {
      const token = localStorage.getItem('token')
      console.log('📝 Creating order with plan:', selectedPlan.name, 'cycle:', billingCycle)
      
      const res = await fetch(`${API_URL}/subscriptions/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan.name,
          billingCycle
        })
      })

      const orderData = await res.json()
      console.log('📦 Order response:', orderData)
      
      if (!res.ok) throw new Error(orderData.message || 'Order failed')

      if (!orderData.data?.paymentSessionId) {
        throw new Error('No payment session ID in response: ' + JSON.stringify(orderData))
      }

      // Load Cashfree SDK
      console.log('⏳ Loading Cashfree SDK...')
      if (!(window as any).Cashfree) {
        const script = document.createElement('script')
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
        script.onerror = () => {
          throw new Error('Failed to load Cashfree SDK')
        }
        document.body.appendChild(script)
        
        // Wait for SDK to load
        await new Promise((resolve, reject) => {
          const checkCashfree = () => {
            if ((window as any).Cashfree) {
              console.log('✅ Cashfree SDK loaded')
              resolve(true)
            } else {
              setTimeout(checkCashfree, 100)
            }
          }
          checkCashfree()
          setTimeout(() => reject(new Error('Cashfree SDK timeout')), 5000)
        })
      }

      console.log('🔄 Opening Cashfree checkout with sessionId:', orderData.data.paymentSessionId)
      const mode = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      console.log('🎯 Using Cashfree mode:', mode)
      const cashfree = await (window as any).Cashfree({ mode })
      const result = await cashfree.checkout({
        paymentSessionId: orderData.data.paymentSessionId,
        redirectTarget: '_modal'
      })
      console.log('✅ Cashfree checkout result:', result)
    } catch (err) {
      console.error('❌ Payment error:', err)
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => router.push('/pricing')}
          className="text-gray-600 hover:text-gray-900 font-semibold"
        >
          ← Back to Pricing
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-12">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Auth */}
            <div className="border border-gray-300 rounded-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Step 1: Login</h2>

              {isAuthenticated ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <p className="text-green-700 font-semibold">Logged in ✓</p>
                </div>
              ) : (
                <>
                  {!showLogin ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => { setAuthMode('login'); setShowLogin(true) }}
                        className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 font-semibold text-gray-900"
                      >
                        Login to existing account
                      </button>
                      <button
                        onClick={() => { setAuthMode('signup'); setShowLogin(true) }}
                        className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                      >
                        Create new account
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {/* Tabs */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className={`flex-1 py-2 font-semibold rounded-lg ${
                            authMode === 'login'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthMode('signup')}
                          className={`flex-1 py-2 font-semibold rounded-lg ${
                            authMode === 'signup'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          Sign Up
                        </button>
                      </div>

                      {/* Form Fields */}
                      {authMode === 'signup' && (
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          required
                        />
                      )}

                      <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />

                      <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      />

                      {authError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {authError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:bg-gray-400"
                      >
                        {authLoading ? 'Processing...' : authMode === 'login' ? 'Login' : 'Sign Up'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowLogin(false)}
                        className="w-full p-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300"
                      >
                        Back
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>

            {/* Step 2: Plan */}
            {selectedPlan && (
              <div className="border border-gray-300 rounded-lg p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Step 2: Your Plan</h2>
                <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedPlan.name}</h3>
                  <p className="text-gray-600 mt-2 mb-4">{selectedPlan.description}</p>
                  <p className="text-3xl font-bold text-blue-600">₹{selectedPlan.monthlyPrice}/month</p>
                </div>
              </div>
            )}

            {/* Step 3: Billing */}
            {isAuthenticated && (
              <div className="border border-gray-300 rounded-lg p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Step 3: Billing Period</h2>
                <div className="grid grid-cols-3 gap-4">
                  {(['monthly', 'quarterly', 'annual'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setBillingCycle(c)}
                      className={`p-4 rounded-lg border-2 font-semibold ${
                        billingCycle === c
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                      }`}
                    >
                      {c === 'monthly' && '1 Month'}
                      {c === 'quarterly' && '3 Months'}
                      {c === 'annual' && '12 Months'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="border border-gray-300 rounded-lg p-8 sticky top-4 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              {selectedPlan ? (
                <>
                  <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">Plan</p>
                      <p className="font-semibold text-gray-900">{selectedPlan.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Period</p>
                      <p className="font-semibold text-gray-900">
                        {billingCycle === 'monthly' ? '1 Month' : billingCycle === 'quarterly' ? '3 Months' : '12 Months'}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Price/month</p>
                      <p className="font-semibold">₹{selectedPlan.monthlyPrice}</p>
                    </div>

                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Multiplier</p>
                      <p className="font-semibold">×{billingCycle === 'monthly' ? 1 : billingCycle === 'quarterly' ? 3 : 12}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-4xl font-bold text-blue-600">₹{calculatePrice()}</p>
                  </div>

                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                      >
                        {processing ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Pay Now
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <p className="text-xs text-gray-500 text-center mt-3">🔒 Secured by Cashfree</p>
                    </>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 text-center font-semibold">
                      Login first to proceed
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 text-center py-8">Loading...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutV2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader className="h-8 w-8 animate-spin" /></div>}>
      <CheckoutPage />
    </Suspense>
  )
}
