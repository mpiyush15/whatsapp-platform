'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Loader, ArrowRight, Check } from 'lucide-react'
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar'
import { API_URL } from '@/lib/config/api'
import {
  formatInr,
  normalizeCheckoutCycle,
  parsePublicPlansResponse,
  planCheckoutDisplay,
  planCheckoutTotal,
  type BillingCycle,
  type PublicPricingPlan,
} from '@/lib/pricing/publicPlans'

function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const planName = searchParams.get('plan') || 'starter'
  const cycleParam = searchParams.get('cycle')

  const [selectedPlan, setSelectedPlan] = useState<PublicPricingPlan | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(() =>
    normalizeCheckoutCycle(cycleParam)
  )
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
        const plans = parsePublicPlansResponse(data)
        const plan = plans.find((p) => p.name.toLowerCase() === planName.toLowerCase())
        if (plan) setSelectedPlan(plan)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [planName])

  useEffect(() => {
    setBillingCycle(normalizeCheckoutCycle(cycleParam))
  }, [cycleParam])

  const checkoutDisplay = selectedPlan ? planCheckoutDisplay(selectedPlan, billingCycle) : null
  const totalAmount = selectedPlan ? planCheckoutTotal(selectedPlan, billingCycle) : 0

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
      
      // Payment completed - redirect to dashboard
      if (result?.paymentDetails) {
        console.log('💳 Payment successful:', result.paymentDetails)
        setError('')
        setProcessing(false)
        // Wait 2 seconds then redirect to dashboard
        setTimeout(() => {
          router.push('/projects?setup=1')
        }, 1500)
      } else {
        // Modal closed without payment
        console.log('⚠️ Checkout modal closed')
      }
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
    <div className="min-h-screen bg-[#fafafa] pt-20 sm:pt-24">
      <MarketingNavbar />
      <div className="border-b border-black/[0.06] bg-white px-4 py-3 sm:px-6">
        <Link href="/pricing" className="text-sm font-semibold text-[#52525b] transition hover:text-[#111111]">
          ← Back to pricing
        </Link>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">Checkout</p>
        <h1 className="marketing-hero-title mt-2 text-2xl text-[#111111] sm:text-3xl">Complete your subscription</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Auth */}
            <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-[#111111] mb-6">Step 1: Login</h2>

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
                        className="marketing-cta-primary w-full rounded-xl p-4 text-sm font-semibold"
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
                              ? 'bg-[#111111] text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthMode('signup')}
                          className={`flex-1 py-2 font-semibold rounded-lg ${
                            authMode === 'signup'
                              ? 'bg-[#111111] text-white'
                              : 'bg-gray-100 text-gray-900'
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
                        className="marketing-cta-primary w-full rounded-xl p-3 text-sm font-semibold disabled:opacity-50"
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
              <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-bold text-[#111111] mb-6">Step 2: Your Plan</h2>
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-6">
                  <h3 className="text-2xl font-bold text-[#111111]">{selectedPlan.name}</h3>
                  <p className="text-[#6d6c6b] mt-2 mb-4">{selectedPlan.description}</p>
                  {checkoutDisplay ? (
                    <p className="text-3xl font-bold tabular-nums text-[#128c7e]">
                      {checkoutDisplay.amountLabel}
                      <span className="ml-2 text-base font-semibold text-[#6d6c6b]">
                        {checkoutDisplay.periodLabel}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Step 3: Billing */}
            {isAuthenticated && (
              <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-bold text-[#111111] mb-6">Step 3: Billing Period</h2>
                <div className="grid grid-cols-2 gap-4">
                  {(['monthly', 'annual'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBillingCycle(c)}
                      className={`p-4 rounded-lg border-2 font-semibold ${
                        billingCycle === c
                          ? 'border-[#128c7e] bg-emerald-50 text-[#128c7e]'
                          : 'border-black/[0.08] bg-white text-[#3f3f46] hover:border-black/[0.12]'
                      }`}
                    >
                      {c === 'monthly' ? 'Monthly' : 'Annual'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_12px_40px_rgba(17,17,17,0.08)] sm:p-8">
              <h2 className="text-lg font-bold text-[#111111] mb-6">Order Summary</h2>

              {selectedPlan ? (
                <>
                  <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">Plan</p>
                      <p className="font-semibold text-gray-900">{selectedPlan.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Period</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                      </p>
                    </div>

                    {checkoutDisplay ? (
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-600">
                          {billingCycle === 'annual' ? 'Annual price' : 'Monthly price'}
                        </p>
                        <p className="font-semibold">{checkoutDisplay.amountLabel}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-4xl font-bold tabular-nums text-[#128c7e]">{formatInr(totalAmount)}</p>
                  </div>

                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="marketing-cta-primary flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm font-bold disabled:opacity-50"
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
