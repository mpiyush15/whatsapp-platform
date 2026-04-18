'use client'

import { AlertCircle, CheckCircle, Loader, ArrowLeft, Shield, Clock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorToast } from '@/components/ErrorToast'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { API_URL } from '@/lib/config/api'
import { authService } from '@/lib/auth'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPlanId = searchParams.get('plan') || ''
  const initialCycle = (searchParams.get('cycle') as 'monthly' | 'quarterly' | 'annual') || 'monthly'

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)

  // Plan & tenure state
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId)
  const [selectedTenure, setSelectedTenure] = useState<'monthly' | 'quarterly' | 'annual'>(initialCycle)
  const [allPlans, setAllPlans] = useState<any[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

  // Form states
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
  const [registerMobileNumber, setRegisterMobileNumber] = useState('')
  const [registerCompanyName, setRegisterCompanyName] = useState('')
  const [registerWebsite, setRegisterWebsite] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)

  // Payment state
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cashfreeLoaded, setCashfreeLoaded] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const user = authService.getCurrentUser()
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!(user && token))
  }, [])

  // Fetch pricing plans
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setIsLoadingPlans(true)
        const response = await fetch(`${API_URL}/pricing/plans/public`)
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Raw API Response:', data)
          
          // Handle different response structures
          const plans = data.data || data.plans || []
          console.log('📋 Extracted Plans:', plans)
          
          if (plans.length > 0) {
            setAllPlans(plans)
            // If plan from URL exists in fetched plans, use it; otherwise use first plan
            const planFromUrl = initialPlanId || plans[0].name
            const planExists = plans.find(p => p.name.toLowerCase() === planFromUrl.toLowerCase())
            if (planExists) {
              console.log('✅ Using plan from URL:', planFromUrl)
              setSelectedPlanId(planExists.name) // Use exact name from DB
            } else {
              console.log('⚠️ Plan from URL not found, using first plan:', plans[0].name)
              setSelectedPlanId(plans[0].name)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err)
      } finally {
        setIsLoadingPlans(false)
      }
    }
    fetchPricing()
  }, [])

  // Load Cashfree SDK
  useEffect(() => {
    if (!isAuthenticated) return

    const script = document.createElement('script')
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    script.async = true
    script.type = 'text/javascript'

    script.onload = () => {
      console.log('✅ Cashfree SDK v3 script loaded, verifying availability...')
      const maxAttempts = 30
      let attempts = 0

      const verify = setInterval(() => {
        attempts++
        if ((window as any).Cashfree) {
          console.log('✅ Cashfree SDK v3 is available on window object')
          setCashfreeLoaded(true)
          clearInterval(verify)
        } else if (attempts >= maxAttempts) {
          console.error('❌ Cashfree SDK timeout')
          setError('Payment gateway failed to initialize. Please refresh.')
          clearInterval(verify)
        }
      }, 100)
    }

    script.onerror = (error) => {
      console.error('❌ Failed to load Cashfree SDK:', error)
      setError('Payment gateway unavailable. Please try again.')
    }

    document.body.appendChild(script)
  }, [isAuthenticated])

  // Get selected plan details (case-insensitive matching)
  const selectedPlan = allPlans.find((p) => {
    if (!p || !selectedPlanId) return false
    return p.name.toLowerCase() === selectedPlanId.toLowerCase()
  })

  console.log('🔍 Plan Matching:', {
    selectedPlanId,
    planNames: allPlans.map(p => p.name),
    selectedPlan: selectedPlan?.name,
    foundMatch: !!selectedPlan
  })

  // Add-ons configuration
  const ADD_ONS = [
    { id: 'api-access', name: 'API Access', price: 1499, description: 'Full API access for integrations' }
  ]

  // Calculate add-on total
  const addOnTotal = selectedAddOns.reduce((sum, addOnId) => {
    const addOn = ADD_ONS.find(a => a.id === addOnId)
    return sum + (addOn?.price || 0)
  }, 0)

  // Calculate price based on tenure
  const calculatePrice = () => {
    if (!selectedPlan) return 0

    const monthlyPrice = selectedPlan.monthlyPrice || 0
    const yearlyPrice = selectedPlan.yearlyPrice || (monthlyPrice * 12)
    let basePrice = monthlyPrice

    switch (selectedTenure) {
      case 'monthly':
        basePrice = monthlyPrice
        break
      case 'quarterly':
        basePrice = monthlyPrice * 3
        break
      case 'annual':
        basePrice = yearlyPrice
        break
    }

    const finalPrice = Math.round(basePrice)
    return finalPrice + addOnTotal
  }

  const finalAmount = calculatePrice()

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsProcessing(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('isAuthenticated', 'true')
        setIsAuthenticated(true)
        setShowLoginForm(false)
        setLoginEmail('')
        setLoginPassword('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!registerMobileNumber.trim()) {
      setError('Mobile number is required')
      return
    }

    if (!registerCompanyName.trim()) {
      setError('Company name is required')
      return
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          mobileNumber: registerMobileNumber,
          companyName: registerCompanyName,
          website: registerWebsite,
          selectedPlan: selectedPlanId,
          billingCycle: selectedTenure
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('isAuthenticated', 'true')
        setIsAuthenticated(true)
        setShowRegisterForm(false)
        setRegisterName('')
        setRegisterEmail('')
        setRegisterPassword('')
        setRegisterConfirmPassword('')
        setRegisterMobileNumber('')
        setRegisterCompanyName('')
        setRegisterWebsite('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle payment
  const handlePayment = async () => {
    if (!isAuthenticated) {
      setError('Please login or register to continue')
      return
    }

    if (!selectedPlanId) {
      setError('Please select a plan')
      return
    }

    if (!cashfreeLoaded) {
      setError('Payment gateway not ready. Please refresh the page.')
      return
    }

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
          plan: selectedPlan?.name || selectedPlanId, // Send plan name (e.g., "Starter"), not planId
          billingCycle: selectedTenure
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
      await cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: '_self'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setIsProcessing(false)
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-black mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-black mb-2">Payment Successful!</h1>
          <p className="text-gray-700 mb-6">Your subscription is now active. Redirecting...</p>
          <Loader className="h-6 w-6 text-black animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-green-600">replysys</span>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Pricing
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        {/* Limited Time Offer Banner */}
        <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-white via-orange-100 to-purple-100 text-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                <span className="text-2xl sm:text-3xl animate-bounce">🎉</span>
                <div className="min-w-0">
                    <p className="font-bold text-base sm:text-lg text-gray-900">⏰ Limited Time Offer!</p>
                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">Get up to {Math.max(selectedPlan?.quarterlyDiscount || 0, selectedPlan?.annualDiscount || 0)}% off on longer plans</p>
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <p className="text-xs font-semibold text-orange-600">Offer expires soon</p>
                <p className="text-lg sm:text-2xl font-bold">SAVE BIG</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column: Plan Selection & Tenure */}
          <div className="lg:col-span-2 w-full">
            {/* Step 1: Select Plan */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 shadow-sm hover:shadow-md transition">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-black mb-3 sm:mb-4 lg:mb-6">1. Select Your Plan</h2>

              {isLoadingPlans ? (
                <div className="text-center py-8">
                  <Loader className="h-8 w-8 text-black animate-spin mx-auto" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {allPlans.map((plan) => (
                    <button
                      key={plan.name}
                      onClick={() => setSelectedPlanId(plan.name)}
                      className={`p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border-2 text-left transition min-h-[140px] ${
                        selectedPlanId === plan.name
                          ? 'border-black bg-gray-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <h3 className="text-lg font-bold text-black">{plan.name}</h3>
                      <p className="text-sm text-gray-700 mt-1">₹{plan.monthlyPrice}/month</p>
                      <p className="text-xs text-gray-500 mt-2">{plan.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Optional Add-ons */}
            {selectedPlan && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 shadow-sm hover:shadow-md transition">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-black mb-3 sm:mb-4 lg:mb-6">2. Optional Add-ons</h2>

                <div className="space-y-3">
                  {ADD_ONS.map((addOn) => (
                    <label
                      key={addOn.id}
                      className="flex items-center p-4 border-2 border-gray-300 rounded-lg hover:border-black transition cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(addOn.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAddOns([...selectedAddOns, addOn.id])
                          } else {
                            setSelectedAddOns(selectedAddOns.filter(id => id !== addOn.id))
                          }
                        }}
                        className="w-5 h-5 accent-black rounded"
                      />
                      <div className="ml-4 flex-1">
                        <p className="font-semibold text-black">{addOn.name}</p>
                        <p className="text-sm text-gray-600">{addOn.description}</p>
                      </div>
                      <p className="font-bold text-black ml-2">+₹{addOn.price.toLocaleString()}</p>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Select Tenure */}
            {selectedPlan && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 shadow-sm hover:shadow-md transition">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-black mb-3 sm:mb-4 lg:mb-6">3. Choose Billing Period</h2>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                  {[
                    { value: 'monthly' as const, label: '1 Month', discountKey: 'monthlyDiscount' },
                    { value: 'quarterly' as const, label: '3 Months', discountKey: 'quarterlyDiscount' },
                    { value: 'annual' as const, label: '12 Months', discountKey: 'annualDiscount' }
                  ].map((option) => {
                    const discountPercent = selectedPlan?.[option.discountKey as keyof typeof selectedPlan] || 0
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedTenure(option.value)}
                        className={`pt-6 sm:pt-8 pb-3 sm:pb-4 px-2 sm:px-4 rounded-xl border-2 text-center transition relative ${
                          selectedTenure === option.value
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        {discountPercent > 0 && (
                          <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 z-10">
                            <span className="bg-red-600 text-white text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                              💰 Save {discountPercent}%
                            </span>
                          </div>
                        )}
                        <p className="text-xs sm:text-sm font-bold text-black">{option.label}</p>
                        {discountPercent > 0 && (
                          <p className="text-xs text-green-700 mt-1 font-semibold">Best Deal!</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Authentication */}
            <div className="bg-white rounded-2xl border border-gray-300 p-4 sm:p-8 shadow-sm hover:shadow-md transition">
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">3. Login or Register</h2>

              {!isAuthenticated ? (
                <div className="space-y-4">
                  {!showRegisterForm ? (
                    <>
                      <button
                        onClick={() => setShowLoginForm(!showLoginForm)}
                        className="w-full p-4 border-2 border-black text-black font-semibold rounded-lg hover:bg-gray-100 transition"
                      >
                        {showLoginForm ? '✓ Hide Login Form' : '+ Show Login Form'}
                      </button>

                      {showLoginForm && (
                        <form onSubmit={handleLogin} className="space-y-4 pt-4 border-t">
                          <input
                            type="email"
                            placeholder="Email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-base"
                            required
                          />
                          <div className="relative">
                            <input
                              type={showLoginPassword ? 'text' : 'password'}
                              placeholder="Password"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-base"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                              {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-black hover:bg-gray-900 text-white py-3 text-base font-semibold"
                          >
                            {isProcessing ? 'Logging in...' : 'Login'}
                          </Button>
                        </form>
                      )}

                      <div className="text-center text-sm text-gray-700">
                        New user?{' '}
                        <button
                          onClick={() => setShowRegisterForm(true)}
                          className="text-black font-semibold hover:underline"
                        >
                          Create account
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRegisterForm(false)}
                        className="w-full p-4 border-2 border-black text-black font-semibold rounded-lg hover:bg-gray-100 transition"
                      >
                        ✓ Hide Register Form
                      </button>

                      <form onSubmit={handleRegister} className="space-y-4 pt-4 border-t">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        <div className="relative">
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            placeholder="Password (min 6 chars)"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <input
                          type="password"
                          placeholder="Confirm Password"
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        <input
                          type="tel"
                          placeholder="Mobile Number"
                          value={registerMobileNumber}
                          onChange={(e) => setRegisterMobileNumber(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={registerCompanyName}
                          onChange={(e) => setRegisterCompanyName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        <input
                          type="url"
                          placeholder="Website (Optional)"
                          value={registerWebsite}
                          onChange={(e) => setRegisterWebsite(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        />
                        <Button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full bg-black hover:bg-gray-900 text-white"
                        >
                          {isProcessing ? 'Creating account...' : 'Register'}
                        </Button>
                      </form>

                      <div className="text-center text-sm text-gray-700">
                        Already have an account?{' '}
                        <button
                          onClick={() => setShowRegisterForm(false)}
                          className="text-black font-semibold hover:underline"
                        >
                          Login here
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-black flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-black">You're logged in</p>
                    <p className="text-sm text-gray-700">{authService.getCurrentUser()?.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky bottom-0 lg:relative lg:bottom-auto bg-white rounded-xl sm:rounded-2xl border border-gray-300 p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-black mb-6">Order Summary</h3>

              {!isLoadingPlans && selectedPlan ? (
                <>
                  <div className="space-y-4 pb-6 border-b border-gray-300">
                    <div>
                      <p className="text-sm text-gray-700">Plan</p>
                      <p className="font-semibold text-black">{selectedPlan.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-700">Billing Period</p>
                      <p className="font-semibold text-black capitalize">{selectedTenure}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-700">Monthly Price</p>
                      <p className="font-semibold text-black">₹{selectedPlan.monthlyPrice?.toLocaleString() || '0'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-700">Duration</p>
                      <p className="font-semibold text-black">
                        {selectedTenure === 'monthly' ? '1 Month' : selectedTenure === 'quarterly' ? '3 Months' : '12 Months'}
                      </p>
                    </div>

                    {selectedAddOns.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-700">Add-ons</p>
                        <div className="space-y-1">
                          {selectedAddOns.map(addOnId => {
                            const addOn = ADD_ONS.find(a => a.id === addOnId)
                            return (
                              <div key={addOnId} className="flex justify-between">
                                <p className="text-sm text-gray-600">• {addOn?.name}</p>
                                <p className="text-sm font-semibold text-black">+₹{addOn?.price.toLocaleString()}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total Amount */}
                  <div className="mb-6 py-4 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-700 font-semibold">Total Amount</span>
                      <span className="text-3xl font-bold text-black">₹{finalAmount.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Secured by Cashfree</p>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  {isLoadingPlans ? 'Loading plans...' : 'Select a plan above'}
                </div>
              )}

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={!isAuthenticated || !selectedPlanId || isProcessing || !cashfreeLoaded}
                className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3 rounded-lg text-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader className="h-5 w-5 animate-spin" />
                    Processing...
                  </div>
                ) : !isAuthenticated ? (
                  'Please Login or Register'
                ) : !cashfreeLoaded ? (
                  'Loading Payment Gateway...'
                ) : (
                  'Pay Now'
                )}
              </Button>

              {/* Error Message */}
              {error && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="h-4 sm:h-5 w-4 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Security badges */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-300 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                  <Shield className="h-4 w-4 text-black flex-shrink-0" />
                  <span>SSL Secured</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="h-4 w-4 text-black" />
                  <span>Instant Activation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader className="h-8 w-8 animate-spin" /></div>}>
      <CheckoutContent />
    </Suspense>
  )
}
