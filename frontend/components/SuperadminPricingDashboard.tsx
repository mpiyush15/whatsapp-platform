'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { ErrorToast } from './ErrorToast';

interface Feature {
  _id: string;
  name: string;
  description?: string;
  included: boolean;
  limit?: number;
}

interface PricingPlan {
  _id: string;
  planId: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  monthlyDiscount: number;
  yearlyDiscount: number;
  limits: Record<string, number>;
  features: Feature[];
  isActive: boolean;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SuperadminPricingDashboard() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthlyPrice: '',
    yearlyPrice: '',
    currency: 'USD',
    monthlyDiscount: '',
    yearlyDiscount: '',
    isPopular: false
  });

  const [featureData, setFeatureData] = useState({
    name: '',
    description: '',
    included: true,
    limit: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/plans`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFeatureInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFeatureData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingPlan ? 'PUT' : 'POST';
      const url = editingPlan
        ? `${process.env.NEXT_PUBLIC_API_URL}/pricing/plans/${editingPlan.planId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/pricing/plans`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...formData,
          monthlyPrice: parseFloat(formData.monthlyPrice),
          yearlyPrice: parseFloat(formData.yearlyPrice),
          monthlyDiscount: parseFloat(formData.monthlyDiscount) || 0,
          yearlyDiscount: parseFloat(formData.yearlyDiscount) || 0
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchPlans();
        setShowModal(false);
        setEditingPlan(null);
        resetForm();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    }
  };

  const handleEditPlan = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPrice.toString(),
      yearlyPrice: plan.yearlyPrice.toString(),
      currency: plan.currency,
      monthlyDiscount: plan.monthlyDiscount.toString(),
      yearlyDiscount: plan.yearlyDiscount.toString(),
      isPopular: plan.isPopular
    });
    setShowModal(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchPlans();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/plans/${selectedPlanId}/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...featureData,
          limit: featureData.limit ? parseInt(featureData.limit) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchPlans();
        setShowFeatureModal(false);
        setSelectedPlanId(null);
        resetFeatureForm();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feature');
    }
  };

  const handleRemoveFeature = async (planId: string, featureId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/plans/${planId}/features/${featureId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchPlans();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove feature');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      monthlyPrice: '',
      yearlyPrice: '',
      currency: 'USD',
      monthlyDiscount: '',
      yearlyDiscount: '',
      isPopular: false
    });
  };

  const resetFeatureForm = () => {
    setFeatureData({
      name: '',
      description: '',
      included: true,
      limit: ''
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pricing Plans Management</h1>
        <button
          onClick={() => {
            setEditingPlan(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Plan
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map(plan => (
          <div key={plan._id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {plan.isPopular && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded mt-1 inline-block">
                    Popular
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditPlan(plan)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.planId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-2xl font-bold text-blue-600">
                {plan.currency}{plan.monthlyPrice}
                <span className="text-sm text-gray-600">/mo</span>
              </p>
              <p className="text-lg font-bold text-gray-600">
                {plan.currency}{plan.yearlyPrice}
                <span className="text-sm text-gray-600">/year</span>
              </p>
            </div>

            {/* Features Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Features</h4>
                <button
                  onClick={() => {
                    setSelectedPlanId(plan.planId);
                    resetFeatureForm();
                    setShowFeatureModal(true);
                  }}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {plan.features.map(feature => (
                  <div key={feature._id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <span>{feature.name}</span>
                    <button
                      onClick={() => handleRemoveFeature(plan.planId, feature._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>{plan.isActive ? '✓ Active' : 'Inactive'}</span>
              <span>{new Date(plan.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-2">Plan Name</label>
                  <select
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="">Select Plan</option>
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-2">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg h-24"
                  placeholder="Plan description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-2">Monthly Price</label>
                  <input
                    type="number"
                    name="monthlyPrice"
                    value={formData.monthlyPrice}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-2">Yearly Price</label>
                  <input
                    type="number"
                    name="yearlyPrice"
                    value={formData.yearlyPrice}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-2">Monthly Discount %</label>
                  <input
                    type="number"
                    name="monthlyDiscount"
                    value={formData.monthlyDiscount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-2">Yearly Discount %</label>
                  <input
                    type="number"
                    name="yearlyDiscount"
                    value={formData.yearlyDiscount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPopular"
                    checked={formData.isPopular}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="font-semibold">Mark as Popular</span>
                </label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Feature Modal */}
      {showFeatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">Add Feature</h2>
              <button
                onClick={() => setShowFeatureModal(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddFeature} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold mb-2">Feature Name</label>
                <input
                  type="text"
                  name="name"
                  value={featureData.name}
                  onChange={handleFeatureInputChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={featureData.description}
                  onChange={handleFeatureInputChange}
                  className="w-full px-4 py-2 border rounded-lg h-20"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Limit (leave empty for unlimited)</label>
                <input
                  type="number"
                  name="limit"
                  value={featureData.limit}
                  onChange={handleFeatureInputChange}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="included"
                    checked={featureData.included}
                    onChange={handleFeatureInputChange}
                    className="w-4 h-4"
                  />
                  <span className="font-semibold">Included in Plan</span>
                </label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
                >
                  Add Feature
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeatureModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
