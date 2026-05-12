'use client'

import { useState, useEffect } from 'react'
import { Eye, Edit, Trash2, Plus, X } from 'lucide-react'
import { API_URL } from '@/lib/config/api'
import { ErrorToast } from '@/components/ErrorToast'

interface Plan {
  _id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  monthlyDiscount?: number
  quarterlyDiscount?: number
  yearlyDiscount?: number
  annualDiscount?: number
  setupFee: number
  signupCredits: number
  monthlyCredits: number
  isActive: boolean
  isPopular: boolean
  publishedToPublic: boolean
  limits?: {
    messages?: number | null
    contacts?: number | null
    phoneNumbers?: number | null
  }
  features?: { included: string[] }
}

type ViewState = 'list' | 'form'

export default function PlansOffersPage() {
  const [view, setView] = useState<ViewState>('list')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [showDetails, setShowDetails] = useState<Plan | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')

  const [formData, setFormData] = useState({
    name: 'Starter',
    monthlyPrice: '',
    yearlyPrice: '',
    setupFee: '',
    signupCredits: '',
    monthlyCredits: '',
    monthlyDiscount: '',
    quarterlyDiscount: '',
    yearlyDiscount: '',
    annualDiscount: '',
    messagesPerDayLimit: '',
    contactsLimit: '',
    phoneNumbersLimit: '',
    description: '',
    isActive: true,
    isPopular: false,
    publishedToPublic: true
  })

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/pricing/admin/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setPlans(data.data?.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFeatures([...features, featureInput.trim()])
      setFeatureInput('')
    }
  }

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx))
  }

  const handleOpenCreate = () => {
    setEditingPlan(null)
    setFeatures([])
    setFormData({
      name: 'Starter',
      monthlyPrice: '',
      yearlyPrice: '',
      setupFee: '',
      signupCredits: '',
      monthlyCredits: '',
      monthlyDiscount: '',
      quarterlyDiscount: '',
      yearlyDiscount: '',
      annualDiscount: '',
      messagesPerDayLimit: '',
      contactsLimit: '',
      phoneNumbersLimit: '',
      description: '',
      isActive: true,
      isPopular: false,
      publishedToPublic: true
    })
    setView('form')
  }

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      monthlyPrice: plan.monthlyPrice.toString(),
      yearlyPrice: plan.yearlyPrice.toString(),
      setupFee: plan.setupFee.toString(),
      signupCredits: plan.signupCredits.toString(),
      monthlyCredits: plan.monthlyCredits.toString(),
      monthlyDiscount: plan.monthlyDiscount?.toString() || '',
      quarterlyDiscount: plan.quarterlyDiscount?.toString() || '',
      yearlyDiscount: plan.yearlyDiscount?.toString() || '',
      annualDiscount: plan.annualDiscount?.toString() || '',
      messagesPerDayLimit: plan.limits?.messages?.toString() || '',
      contactsLimit: plan.limits?.contacts?.toString() || '',
      phoneNumbersLimit: plan.limits?.phoneNumbers?.toString() || '',
      description: plan.description || '',
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      publishedToPublic: plan.publishedToPublic
    })
    setFeatures(plan.features?.included || [])
    setView('form')
  }

  const handleCreateOrUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.monthlyPrice) {
      setError('Monthly Price is required')
      return
    }
    if (!formData.yearlyPrice) {
      setError('Yearly Price is required')
      return
    }
    
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const payload = {
        name: formData.name,
        monthlyPrice: parseInt(formData.monthlyPrice, 10),
        yearlyPrice: parseInt(formData.yearlyPrice, 10),
        setupFee: formData.setupFee ? parseInt(formData.setupFee, 10) : 0,
        signupCredits: formData.signupCredits ? parseInt(formData.signupCredits, 10) : 0,
        monthlyCredits: formData.monthlyCredits ? parseInt(formData.monthlyCredits, 10) : 0,
        monthlyDiscount: formData.monthlyDiscount ? parseInt(formData.monthlyDiscount, 10) : 0,
        quarterlyDiscount: formData.quarterlyDiscount ? parseInt(formData.quarterlyDiscount, 10) : 0,
        yearlyDiscount: formData.yearlyDiscount ? parseInt(formData.yearlyDiscount, 10) : 0,
        annualDiscount: formData.annualDiscount ? parseInt(formData.annualDiscount, 10) : 0,
        limits: {
          messages: formData.messagesPerDayLimit ? parseInt(formData.messagesPerDayLimit, 10) : null,
          contacts: formData.contactsLimit ? parseInt(formData.contactsLimit, 10) : null,
          phoneNumbers: formData.phoneNumbersLimit ? parseInt(formData.phoneNumbersLimit, 10) : null,
        },
        description: formData.description,
        isActive: formData.isActive,
        isPopular: formData.isPopular,
        publishedToPublic: formData.publishedToPublic,
        features: { included: features, excluded: [] }
      }

      const url = editingPlan 
        ? `${API_URL}/pricing/admin/plans/${editingPlan._id}`
        : `${API_URL}/pricing/admin/plans`
      
      const method = editingPlan ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(editingPlan ? '✅ Plan updated!' : '✅ Plan created!')
        setView('list')
        setEditingPlan(null)
        setTimeout(() => setSuccess(null), 2000)
        await fetchPlans()
      } else {
        setError(data.message || 'Failed to save plan')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan?')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/pricing/admin/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSuccess('✅ Deleted')
        await fetchPlans()
        setTimeout(() => setSuccess(null), 2000)
      }
    } catch (err) {
      setError('Delete failed')
    }
  }

  // LIST VIEW
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
        {success && (
          <div className="fixed top-4 right-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm z-50">
            {success}
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Plans & Offers</h1>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create Plan
            </button>
          </div>

          {/* Details Modal */}
          {showDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{showDetails.name}</h2>
                  <button onClick={() => setShowDetails(null)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-3 text-sm">
                  {showDetails.description && (
                    <div>
                      <p className="text-gray-600">{showDetails.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 py-3 border-t border-b">
                    <div>
                      <p className="text-gray-600">Monthly</p>
                      <p className="font-bold">₹{showDetails.monthlyPrice}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Yearly</p>
                      <p className="font-bold">₹{showDetails.yearlyPrice}</p>
                    </div>
                  </div>

                  {showDetails.setupFee > 0 && (
                    <div>
                      <p className="text-gray-600">Setup Fee</p>
                      <p className="font-bold">₹{showDetails.setupFee}</p>
                    </div>
                  )}

                  {showDetails.signupCredits > 0 && (
                    <div>
                      <p className="text-gray-600">Signup Credits</p>
                      <p className="font-bold">₹{showDetails.signupCredits}</p>
                    </div>
                  )}

                  {showDetails.monthlyCredits > 0 && (
                    <div>
                      <p className="text-gray-600">Monthly Credits</p>
                      <p className="font-bold">₹{showDetails.monthlyCredits}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-gray-600 font-semibold mb-2">Discount Cycles</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>Monthly: <span className="font-semibold">{showDetails.monthlyDiscount || 0}%</span></p>
                      <p>Quarterly: <span className="font-semibold">{showDetails.quarterlyDiscount || 0}%</span></p>
                      <p>Yearly: <span className="font-semibold">{showDetails.yearlyDiscount || 0}%</span></p>
                      <p>Annual: <span className="font-semibold">{showDetails.annualDiscount || 0}%</span></p>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-gray-600 font-semibold mb-2">Usage Limits</p>
                    <div className="grid grid-cols-1 gap-1 text-sm">
                      <p>Messages/day: <span className="font-semibold">{showDetails.limits?.messages ?? 'Unlimited'}</span></p>
                      <p>Contacts: <span className="font-semibold">{showDetails.limits?.contacts ?? 'Unlimited'}</span></p>
                      <p>Phone numbers: <span className="font-semibold">{showDetails.limits?.phoneNumbers ?? 'Unlimited'}</span></p>
                    </div>
                  </div>

                  {showDetails.features?.included && showDetails.features.included.length > 0 && (
                    <div className="pt-3">
                      <p className="text-gray-600 font-semibold mb-2">Features</p>
                      <ul className="space-y-1">
                        {showDetails.features.included.map((f, i) => (
                          <li key={i} className="text-gray-700">✓ {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${showDetails.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {showDetails.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {showDetails.isPopular && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Popular</span>}
                    {showDetails.publishedToPublic && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Public</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plans Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Plan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Monthly</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Yearly</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No plans yet. Click "Create Plan" to add one.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold">{plan.name}</p>
                          {plan.description && <p className="text-xs text-gray-600">{plan.description}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">₹{plan.monthlyPrice}</td>
                      <td className="px-6 py-4">₹{plan.yearlyPrice}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowDetails(plan)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(plan)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(plan._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // FORM VIEW (Create/Edit)
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="fixed top-4 right-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm z-50">
          {success}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h1>
          <button
            onClick={() => setView('list')}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleCreateOrUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan Name</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option>Starter</option>
                  <option>Pro</option>
                  <option>Enterprise</option>
                  <option>Custom</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Price <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                    placeholder="2499"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Yearly Price <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={formData.yearlyPrice}
                    onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                    placeholder="24990"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Setup Fee</label>
                  <input
                    type="number"
                    value={formData.setupFee}
                    onChange={(e) => setFormData({ ...formData, setupFee: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Signup Credits</label>
                  <input
                    type="number"
                    value={formData.signupCredits}
                    onChange={(e) => setFormData({ ...formData, signupCredits: e.target.value })}
                    placeholder="75"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Monthly Credits</label>
                <input
                  type="number"
                  value={formData.monthlyCredits}
                  onChange={(e) => setFormData({ ...formData, monthlyCredits: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.monthlyDiscount}
                    onChange={(e) => setFormData({ ...formData, monthlyDiscount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quarterly Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.quarterlyDiscount}
                    onChange={(e) => setFormData({ ...formData, quarterlyDiscount: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Yearly Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.yearlyDiscount}
                    onChange={(e) => setFormData({ ...formData, yearlyDiscount: e.target.value })}
                    placeholder="15"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Annual Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.annualDiscount}
                    onChange={(e) => setFormData({ ...formData, annualDiscount: e.target.value })}
                    placeholder="20"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Messages / Day Limit</label>
                  <input
                    type="number"
                    value={formData.messagesPerDayLimit}
                    onChange={(e) => setFormData({ ...formData, messagesPerDayLimit: e.target.value })}
                    placeholder="1000"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contacts Limit</label>
                  <input
                    type="number"
                    value={formData.contactsLimit}
                    onChange={(e) => setFormData({ ...formData, contactsLimit: e.target.value })}
                    placeholder="5000"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Numbers Limit</label>
                  <input
                    type="number"
                    value={formData.phoneNumbersLimit}
                    onChange={(e) => setFormData({ ...formData, phoneNumbersLimit: e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Plan description"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Popular ⭐</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.publishedToPublic}
                    onChange={(e) => setFormData({ ...formData, publishedToPublic: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Publish to Public</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-semibold"
                >
                  {loading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Features */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Plan Features</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Add Features</label>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddFeature()
                      }
                    }}
                    placeholder="e.g., Unlimited conversations"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">
                  Features ({features.length})
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {features.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No features added yet</p>
                  ) : (
                    features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                      >
                        <span className="text-sm">{feature}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
