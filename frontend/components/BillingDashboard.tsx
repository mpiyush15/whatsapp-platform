'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { ErrorToast } from './ErrorToast';

interface Subscription {
  _id: string;
  subscriptionId: string;
  accountId: string;
  planId: {
    _id: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
  };
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'pending_payment';
  billingCycle: 'monthly' | 'annual';
  pricing: {
    amount: number;
    discount: number;
    finalAmount: number;
    currency: string;
  };
  startDate: string;
  endDate: string;
  renewalDate: string;
  createdAt: string;
}

export default function BillingDashboard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/my-subscription`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSubscription(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ reason: cancellationReason })
      });
      const data = await response.json();
      if (data.success) {
        setShowCancelModal(false);
        fetchSubscription();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  const handlePauseSubscription = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        fetchSubscription();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause subscription');
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscription/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        fetchSubscription();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!subscription) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Subscription</h2>
          <p className="text-gray-700 mb-6">
            You don't have an active subscription yet. Choose a plan to get started.
          </p>
          <a
            href="/pricing"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            View Plans
          </a>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string; icon: any }> = {
      active: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
      paused: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertCircle },
      cancelled: { bg: 'bg-red-50', text: 'text-red-700', icon: X },
      expired: { bg: 'bg-gray-50', text: 'text-gray-700', icon: AlertCircle },
      pending_payment: { bg: 'bg-orange-50', text: 'text-orange-700', icon: AlertCircle }
    };

    const style = statusStyles[status];
    const Icon = style.icon;

    return (
      <div className={`${style.bg} px-4 py-2 rounded-lg flex items-center gap-2 ${style.text}`}>
        <Icon className="w-4 h-4" />
        <span className="font-semibold capitalize">{status.replace('_', ' ')}</span>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white border rounded-lg shadow-lg p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {subscription.planId.name} Plan
            </h2>
            <p className="text-gray-600 capitalize">
              {subscription.billingCycle} Billing • {getStatusBadge(subscription.status)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">
              {subscription.pricing.currency}
              {subscription.pricing.finalAmount}
              <span className="text-sm text-gray-600 block">
                per {subscription.billingCycle === 'annual' ? 'year' : 'month'}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-600 mb-1">Start Date</p>
            <p className="font-semibold">{new Date(subscription.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">End Date</p>
            <p className="font-semibold">{new Date(subscription.endDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Renewal Date</p>
            <p className="font-semibold">{new Date(subscription.renewalDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
            <p className="font-semibold">
              {Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap">
          <a
            href={`/checkout?planId=${subscription.planId._id}&upgrade=true`}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold text-center"
          >
            Change Plan
          </a>
          {subscription.status === 'active' && (
            <>
              <button
                onClick={handlePauseSubscription}
                className="flex-1 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 font-semibold"
              >
                Pause Subscription
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold"
              >
                Cancel Subscription
              </button>
            </>
          )}
          {subscription.status === 'paused' && (
            <button
              onClick={handleResumeSubscription}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Resume Subscription
            </button>
          )}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="bg-white border rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-6">Pricing Breakdown</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b">
            <span className="text-gray-700">Base Price</span>
            <span className="font-semibold">
              {subscription.pricing.currency}{subscription.pricing.amount}
            </span>
          </div>
          {subscription.pricing.discount > 0 && (
            <div className="flex justify-between items-center pb-4 border-b text-green-600">
              <span>Discount</span>
              <span className="font-semibold">
                -{subscription.pricing.currency}{subscription.pricing.discount}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 text-lg font-bold text-blue-600">
            <span>Total Amount</span>
            <span>{subscription.pricing.currency}{subscription.pricing.finalAmount}</span>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Cancel Subscription</h2>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to cancel your subscription? You'll lose access to premium features.
              </p>
              <div className="mb-6">
                <label className="block font-semibold mb-2">Reason for Cancellation (Optional)</label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg h-24"
                  placeholder="Help us improve by telling us why you're cancelling"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
