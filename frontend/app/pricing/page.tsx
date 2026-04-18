'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { API_URL } from '@/lib/config/api'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

interface Plan {
  _id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  setupFee: number
  signupCredits: number
  monthlyCredits: number
  isPopular: boolean
  isActive: boolean
  features: { included: string[] }
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        console.log('📡 Fetching public pricing plans...')
        
        const res = await fetch(`${API_URL}/pricing/plans/public`, {
          cache: 'no-store'
        })
        
        console.log('📥 Response:', res.status)
        
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`)
        }

        const data = await res.json()
        console.log('📥 Data:', data)

        // Handle nested response structure
        const plansData = data?.data?.data || data?.data || []
        console.log('✅ Plans:', plansData)
        
        if (Array.isArray(plansData)) {
          setPlans(plansData)
        }
      } catch (err) {
        console.error('❌ Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load pricing')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-gray-600 mb-8">Choose the perfect plan for your business</p>
            
            {/* Billing Period Toggle */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <span className={`text-sm font-semibold ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-300 transition-colors focus:outline-none"
                style={{
                  backgroundColor: billingPeriod === 'annual' ? '#3b82f6' : '#d1d5db'
                }}
              >
                <span
                  className="inline-block h-6 w-6 transform rounded-full bg-white transition-transform"
                  style={{
                    transform: billingPeriod === 'annual' ? 'translateX(1.75rem)' : 'translateX(0.25rem)'
                  }}
                />
              </button>
              <span className={`text-sm font-semibold ${billingPeriod === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
                Annual <span className="text-green-600 text-xs font-bold">Save 20%</span>
              </span>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">❌ {error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-gray-600 mt-2">Loading pricing plans...</p>
            </div>
          )}

          {/* Plans Grid */}
          {!loading && plans.length > 0 && (
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full max-w-6xl">
                {plans.map((plan) => (
                  <div
                    key={plan._id}
                    className={`relative rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 mx-auto w-full max-w-sm ${
                      plan.isPopular
                        ? 'ring-2 ring-blue-500 transform lg:scale-105'
                        : 'border border-gray-200'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-xs font-bold">
                        POPULAR ⭐
                      </div>
                    )}

                    <div className="p-6 bg-white h-full flex flex-col">
                      {/* Plan Name */}
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      
                      {/* Description */}
                      {plan.description && (
                        <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                      )}

                      {/* Pricing */}
                      <div className="mb-6">
                        <div className="mb-2">
                          <p className="text-4xl font-bold text-gray-900">
                            ₹{billingPeriod === 'monthly' ? plan.monthlyPrice : Math.floor(plan.yearlyPrice / 12)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {billingPeriod === 'monthly' ? '/month' : '/month (billed annually)'}
                          </p>
                        </div>
                        {billingPeriod === 'annual' && (
                          <p className="text-sm text-green-600 font-semibold">
                            Total: ₹{plan.yearlyPrice}/year
                          </p>
                        )}
                        {plan.setupFee > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Setup fee: ₹{plan.setupFee}
                          </p>
                        )}
                      </div>

                      {/* Credits */}
                      {(plan.signupCredits > 0 || plan.monthlyCredits > 0) && (
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          {plan.signupCredits > 0 && (
                            <p className="text-sm text-green-600">
                              ✓ ₹{plan.signupCredits} signup credits
                            </p>
                          )}
                          {plan.monthlyCredits > 0 && (
                            <p className="text-sm text-green-600">
                              ✓ ₹{plan.monthlyCredits}/month recurring
                            </p>
                          )}
                        </div>
                      )}

                      {/* Features */}
                      {plan.features?.included && plan.features.included.length > 0 && (
                        <div className="mb-6 flex-grow">
                          <h4 className="font-semibold text-gray-900 mb-3">Features</h4>
                          <ul className="space-y-2">
                            {plan.features.included.map((feature: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-700">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* CTA Button */}
                      <button
                        onClick={() => {
                          const token = localStorage.getItem('token')
                          // Redirect to new checkout with selected plan
                          window.location.href = `/checkout-v2?plan=${plan.name.toLowerCase()}&cycle=${billingPeriod}`
                        }}
                        className={`w-full py-3 rounded-lg font-semibold transition ${
                          plan.isPopular
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Plans State */}
          {!loading && plans.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No pricing plans available yet.</p>
              <p className="text-gray-500 text-sm">Please check back soon!</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
