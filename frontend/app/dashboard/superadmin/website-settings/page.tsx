'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Loader, Save, Plus, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorToast } from '@/components/ErrorToast'
import { authService, UserRole } from '@/lib/auth'
import { API_URL } from '@/lib/config/api'
import { useRouter } from 'next/navigation'

interface PricingPlan {
  id?: string
  planId?: string
  name: string
  monthlyPrice: number
  setupFee?: number
  description: string
  highlighted?: boolean
  isPopular?: boolean
  features?: {
    included: string[]
    excluded: string[]
  }
}

interface Feature {
  id?: string
  icon: string
  title: string
  description: string
}

export default function WebsiteSettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pricing' | 'features' | 'discounts'>('pricing')

  // Pricing state
  const [plans, setPlans] = useState<PricingPlan[]>([
    {
      name: 'Starter',
      monthlyPrice: 2499,
      setupFee: 3000,
      description: 'Perfect for getting started',
      highlighted: false,
      features: {
        included: [
          '1 WhatsApp Number',
          'Broadcast Messaging',
          'Basic Chatbot (Menu-driven)',
          'Live Chat Dashboard',
          '3 Team Agents',
          'Contact Management',
          'Basic Analytics',
          'Email Notifications',
          'Payment Link Support',
          'Standard Support',
        ],
        excluded: [
          'Advanced Chatbot Flows',
          'Campaign Automation',
          'Webhook Support',
        ],
      },
    },
    {
      name: 'Pro',
      monthlyPrice: 4999,
      setupFee: 3000,
      description: 'For scaling businesses',
      highlighted: true,
      features: {
        included: [
          '3 WhatsApp Numbers',
          'Everything in Starter',
          'Advanced Chatbot (Logic-based)',
          'Campaign Automation',
          '10 Team Agents',
          'Scheduled Broadcasting',
          'Advanced Analytics & Reports',
          'Webhook Support',
          'Limited API Access',
          'Priority Support 24/7',
          'Agent Routing & Tagging',
        ],
        excluded: [
          'Custom Integrations',
        ],
      },
    }
  ])

  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null)
  const [newPlan, setNewPlan] = useState<PricingPlan>({
    name: '',
    monthlyPrice: 0,
    setupFee: 0,
    description: '',
    highlighted: false,
    features: {
      included: [],
      excluded: []
    }
  })

  // Discount state
  const [discounts, setDiscounts] = useState({
    quarterlyDiscount: 10,
    annualDiscount: 20
  })

  // Plan features editing state
  const [editingPlanFeatures, setEditingPlanFeatures] = useState<{
    planIndex: number | null
    included: string[]
    excluded: string[]
    newIncluded: string
    newExcluded: string
  }>({
    planIndex: null,
    included: [],
    excluded: [],
    newIncluded: '',
    newExcluded: ''
  })

  // Features state
  const [features, setFeatures] = useState<Feature[]>([
    {
      title: 'Broadcast Messages',
      description: 'Send promotional messages to unlimited customers',
      icon: 'Megaphone'
    },
    {
      title: 'No-Code Chatbot',
      description: 'Build intelligent chatbot flows in minutes',
      icon: 'Bot'
    }
  ])

  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null)
  const [newFeature, setNewFeature] = useState<Feature>({
    title: '',
    description: '',
    icon: 'Zap'
  })

  // Check admin access (but allow viewing for now)
  useEffect(() => {
    const user = authService.getCurrentUser()
    console.log('Current user:', user)
    
    // Allow viewing but could add warning if not superadmin
    // if (!user || user.role !== UserRole.SUPERADMIN) {
    //   router.push('/dashboard')
    // }
  }, [router])

  // Fetch pricing plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsFetching(true)
        console.log('Fetching from:', `${API_URL}/pricing/plans/public`)
        const response = await fetch(`${API_URL}/pricing/plans/public`)
        console.log('Fetch response:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('Fetched plans:', data)
          if (data.data && data.data.length > 0) {
            setPlans(data.data)
            setSuccess('Plans loaded from server')
            setTimeout(() => setSuccess(null), 2000)
          }
        } else {
          console.log('API returned error, using default plans')
        }
      } catch (err) {
        console.error('Error fetching plans:', err)
        // Keep default state
      } finally {
        setIsFetching(false)
      }
    }
    fetchPlans()
  }, [])

  // Pricing Plan handlers
  const handleAddPlan = () => {
    if (!newPlan.name || !newPlan.monthlyPrice) {
      setError('Please fill all required fields')
      return
    }
    setPlans([...plans, newPlan])
    setNewPlan({ 
      name: '', 
      monthlyPrice: 0, 
      setupFee: 0, 
      description: '', 
      highlighted: false,
      features: { included: [], excluded: [] }
    })
    setError(null)
    setSuccess('Plan added successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleDeletePlan = (index: number) => {
    setPlans(plans.filter((_, i) => i !== index))
    setError(null)
    setSuccess('Plan deleted successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleEditPlan = (index: number) => {
    setEditingPlanIndex(index)
    setNewPlan({ ...plans[index] })
  }

  const handleUpdatePlan = (index: number) => {
    if (!newPlan.name || !newPlan.monthlyPrice) {
      setError('Please fill all required fields')
      return
    }
    const updatedPlans = [...plans]
    updatedPlans[index] = { ...newPlan }
    setPlans(updatedPlans)
    setEditingPlanIndex(null)
    setNewPlan({ 
      name: '', 
      monthlyPrice: 0, 
      setupFee: 0, 
      description: '', 
      highlighted: false,
      features: { included: [], excluded: [] }
    })
    setError(null)
    setSuccess('Plan updated successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  // Plan features handlers
  const handleEditPlanFeatures = (index: number) => {
    const plan = plans[index]
    setEditingPlanFeatures({
      planIndex: index,
      included: plan.features?.included || [],
      excluded: plan.features?.excluded || [],
      newIncluded: '',
      newExcluded: ''
    })
  }

  const handleAddIncludedFeature = () => {
    if (!editingPlanFeatures.newIncluded.trim()) return
    setEditingPlanFeatures({
      ...editingPlanFeatures,
      included: [...editingPlanFeatures.included, editingPlanFeatures.newIncluded],
      newIncluded: ''
    })
  }

  const handleRemoveIncludedFeature = (idx: number) => {
    setEditingPlanFeatures({
      ...editingPlanFeatures,
      included: editingPlanFeatures.included.filter((_, i) => i !== idx)
    })
  }

  const handleAddExcludedFeature = () => {
    if (!editingPlanFeatures.newExcluded.trim()) return
    setEditingPlanFeatures({
      ...editingPlanFeatures,
      excluded: [...editingPlanFeatures.excluded, editingPlanFeatures.newExcluded],
      newExcluded: ''
    })
  }

  const handleRemoveExcludedFeature = (idx: number) => {
    setEditingPlanFeatures({
      ...editingPlanFeatures,
      excluded: editingPlanFeatures.excluded.filter((_, i) => i !== idx)
    })
  }

  const handleSavePlanFeatures = () => {
    if (editingPlanFeatures.planIndex === null) return
    const updatedPlans = [...plans]
    updatedPlans[editingPlanFeatures.planIndex] = {
      ...updatedPlans[editingPlanFeatures.planIndex],
      features: {
        included: editingPlanFeatures.included,
        excluded: editingPlanFeatures.excluded
      }
    }
    setPlans(updatedPlans)
    setEditingPlanFeatures({
      planIndex: null,
      included: [],
      excluded: [],
      newIncluded: '',
      newExcluded: ''
    })
    setError(null)
    setSuccess('Plan features updated!')
    setTimeout(() => setSuccess(null), 3000)
  }

  // Feature handlers
  const handleAddFeature = () => {
    if (!newFeature.title || !newFeature.description) {
      setError('Please fill all required fields')
      return
    }
    setFeatures([...features, newFeature])
    setNewFeature({ title: '', description: '', icon: 'Zap' })
    setError(null)
    setSuccess('Feature added successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleDeleteFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
    setError(null)
    setSuccess('Feature deleted successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleEditFeature = (index: number) => {
    setEditingFeatureIndex(index)
    setNewFeature({ ...features[index] })
  }

  const handleUpdateFeature = (index: number) => {
    if (!newFeature.title || !newFeature.description) {
      setError('Please fill all required fields')
      return
    }
    const updatedFeatures = [...features]
    updatedFeatures[index] = { ...newFeature }
    setFeatures(updatedFeatures)
    setEditingFeatureIndex(null)
    setNewFeature({ title: '', description: '', icon: 'Zap' })
    setError(null)
    setSuccess('Feature updated successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleSaveAll = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('No authentication token found. Please login.')
        router.push('/login')
        return
      }

      console.log('🔄 Saving all plans...')

      // Save each plan to backend
      for (const plan of plans) {
        const planData = {
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          setupFee: plan.setupFee || 3000,
          yearlyPrice: plan.monthlyPrice * 10,
          monthlyDiscount: 0,
          quarterlyDiscount: discounts.quarterlyDiscount || 0,
          yearlyDiscount: 0,
          annualDiscount: discounts.annualDiscount || 0,
          isPopular: plan.highlighted || false,
          features: plan.features || { included: [], excluded: [] }
        }

        console.log(`📝 Saving plan: ${plan.name}`, planData)

        // Check if plan already exists by name
        const checkResponse = await fetch(`${API_URL}/pricing/plans/public/${plan.name.toLowerCase()}`)
        const isUpdate = checkResponse.ok

        console.log(`${isUpdate ? '✏️ Updating' : '➕ Creating'} plan: ${plan.name}`)

        const endpoint = isUpdate 
          ? `${API_URL}/pricing/admin/plans/${plan.name.toLowerCase()}`
          : `${API_URL}/pricing/admin/plans`

        console.log(`API Endpoint: ${endpoint}`)
        console.log(`Method: ${isUpdate ? 'PUT' : 'POST'}`)

        const response = await fetch(endpoint, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(planData)
        })

        console.log(`Response Status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Error saving ${plan.name}:`, response.status, errorText)
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.message || `Failed to save plan: ${plan.name}`)
          } catch {
            throw new Error(`Failed to save plan: ${plan.name} (HTTP ${response.status})`)
          }
        }

        const result = await response.json()
        console.log(`✅ Plan saved: ${plan.name}`, result)
      }

      console.log('🎉 All plans saved successfully!')
      setSuccess('All pricing plans saved successfully!')
      
      // Re-fetch plans to sync with backend
      console.log('🔄 Re-fetching plans from server...')
      const fetchResponse = await fetch(`${API_URL}/pricing/plans/public`)
      if (fetchResponse.ok) {
        const data = await fetchResponse.json()
        console.log('✅ Plans refreshed:', data.data)
        setPlans(data.data || [])
      } else {
        console.warn('⚠️ Failed to refresh plans')
      }
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings'
      console.error('❌ Save error:', errorMsg)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Website Settings</h1>
        <p className="text-gray-600 mt-1">Manage pricing plans and features displayed on your website</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'pricing'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Pricing Plans
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'features'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Features
        </button>
        <button
          onClick={() => setActiveTab('discounts')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'discounts'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Discounts
        </button>
      </div>

      {/* Pricing Plans Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-8">
          {isFetching && (
            <div className="text-center py-8">
              <Loader className="h-6 w-6 animate-spin mx-auto text-green-600 mb-2" />
              <p className="text-gray-600">Loading pricing plans...</p>
            </div>
          )}

          {!isFetching && (
            <>
          {/* Add/Edit Plan Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingPlanIndex !== null ? 'Edit Plan' : 'Add New Plan'}
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="e.g., Starter, Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Price (₹) *
                </label>
                <input
                  type="number"
                  value={newPlan.monthlyPrice || 0}
                  onChange={(e) => setNewPlan({ ...newPlan, monthlyPrice: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="2499"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setup Fee (₹)
                </label>
                <input
                  type="number"
                  value={newPlan.setupFee || 0}
                  onChange={(e) => setNewPlan({ ...newPlan, setupFee: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="3000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Perfect for getting started"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.highlighted || false}
                    onChange={(e) => setNewPlan({ ...newPlan, highlighted: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Mark as Most Popular</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              {editingPlanIndex !== null ? (
                <>
                  <Button
                    onClick={() => handleUpdatePlan(editingPlanIndex)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Update Plan
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingPlanIndex(null)
                      setNewPlan({ name: '', monthlyPrice: 0, setupFee: 0, description: '', highlighted: false })
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleAddPlan} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Plan
                </Button>
              )}
            </div>
          </div>

          {/* Plans List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Existing Plans</h3>

            {plans.map((plan, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {plan.name}
                      {plan.highlighted && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Most Popular</span>}
                    </h4>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPlanFeatures(index)}
                      className="p-2 hover:bg-gray-100 rounded text-purple-600"
                      title="Manage included/excluded features"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditPlan(index)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(index)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">Monthly: </span>
                    <span className="font-semibold">₹{plan.monthlyPrice.toLocaleString()}</span>
                  </div>
                  {plan.setupFee && (
                    <div>
                      <span className="text-gray-600">Setup: </span>
                      <span className="font-semibold">₹{plan.setupFee.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-8">
          {/* Add/Edit Feature Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingFeatureIndex !== null ? 'Edit Feature' : 'Add New Feature'}
            </h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newFeature.title}
                  onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="e.g., Broadcast Messages"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  rows={3}
                  placeholder="Feature description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon Name
                </label>
                <input
                  type="text"
                  value={newFeature.icon}
                  onChange={(e) => setNewFeature({ ...newFeature, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Megaphone, Bot, Zap, etc."
                />
              </div>
            </div>

            <div className="flex gap-2">
              {editingFeatureIndex !== null ? (
                <>
                  <Button
                    onClick={() => handleUpdateFeature(editingFeatureIndex)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Update Feature
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingFeatureIndex(null)
                      setNewFeature({ title: '', description: '', icon: 'Zap' })
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleAddFeature} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Feature
                </Button>
              )}
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Existing Features</h3>

            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    <p className="text-xs text-gray-500 mt-2">Icon: {feature.icon}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditFeature(index)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteFeature(index)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Features Editor Modal */}
      {editingPlanFeatures.planIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                Edit Features for {plans[editingPlanFeatures.planIndex]?.name}
              </h2>
            </div>

            <div className="p-6 space-y-8">
              {/* Included Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Included Features</h3>
                <div className="space-y-3">
                  {editingPlanFeatures.included.map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-700">{feature}</span>
                      <button
                        onClick={() => handleRemoveIncludedFeature(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={editingPlanFeatures.newIncluded}
                    onChange={(e) => setEditingPlanFeatures({
                      ...editingPlanFeatures,
                      newIncluded: e.target.value
                    })}
                    placeholder="Add new included feature..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                  <Button
                    onClick={handleAddIncludedFeature}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Excluded Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Excluded Features</h3>
                <div className="space-y-3">
                  {editingPlanFeatures.excluded.map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-700 line-through">{feature}</span>
                      <button
                        onClick={() => handleRemoveExcludedFeature(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={editingPlanFeatures.newExcluded}
                    onChange={(e) => setEditingPlanFeatures({
                      ...editingPlanFeatures,
                      newExcluded: e.target.value
                    })}
                    placeholder="Add new excluded feature..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                  <Button
                    onClick={handleAddExcludedFeature}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white">
              <Button
                onClick={() => setEditingPlanFeatures({
                  planIndex: null,
                  included: [],
                  excluded: [],
                  newIncluded: '',
                  newExcluded: ''
                })}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePlanFeatures}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Save Features
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Discounts Tab */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Plan Discounts</h3>
            <p className="text-sm text-gray-600 mb-6">Set discounts for quarterly and annual billing periods. These will be applied to all plans.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quarterly Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quarterly Discount (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discounts.quarterlyDiscount}
                    onChange={(e) => setDiscounts({...discounts, quarterlyDiscount: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-lg"
                    placeholder="10"
                  />
                  <span className="text-gray-600 font-semibold">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Applied to 3-month billing periods</p>
              </div>

              {/* Annual Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Annual Discount (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discounts.annualDiscount}
                    onChange={(e) => setDiscounts({...discounts, annualDiscount: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-lg"
                    placeholder="20"
                  />
                  <span className="text-gray-600 font-semibold">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Applied to 12-month billing periods</p>
              </div>
            </div>

            {/* Discount Preview */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Discount Preview</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• Starter Monthly: ₹2,499 → No discount</p>
                <p>• Starter Quarterly: ₹2,499 × 3 = ₹7,497 → with {discounts.quarterlyDiscount}% off = ₹{(7497 * (1 - discounts.quarterlyDiscount/100)).toFixed(0)}</p>
                <p>• Starter Annual: ₹2,499 × 12 = ₹29,988 → with {discounts.annualDiscount}% off = ₹{(29988 * (1 - discounts.annualDiscount/100)).toFixed(0)}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => {
                  setSuccess('Discounts updated! Click "Save All Changes" to apply.');
                  setTimeout(() => setSuccess(null), 3000);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Update Discounts
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save All Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <Button
          onClick={handleSaveAll}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 py-3 text-lg"
        >
          {isLoading ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
