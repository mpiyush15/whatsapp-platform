'use client';

import { useState, useEffect } from 'react';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const response = await fetch(`${apiUrl}/subscriptions/my-subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setSubscriptions(data.data?.subscriptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Subscriptions</h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <button
          onClick={fetchSubscriptions}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6">
          {error}
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-lg">No subscriptions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((sub: any) => (
            <div
              key={String(sub._id)}
              className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {sub.planId || 'Plan'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {sub.billingCycle || 'monthly'}
                  </p>
                </div>
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                  {sub.status || 'active'}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{sub.pricing?.finalAmount || sub.paymentAmount || 0}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Start Date</p>
                    <p className="text-sm font-medium text-gray-700">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">End Date</p>
                    <p className="text-sm font-medium text-gray-700">
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase">Subscription ID</p>
                  <p className="text-xs font-mono text-gray-600 break-all">
                    {sub.subscriptionId || String(sub._id)}
                  </p>
                </div>

                {sub.orderId && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Order ID</p>
                    <p className="text-xs font-mono text-gray-600 break-all">
                      {sub.orderId}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(sub, null, 2));
                  alert('Subscription data copied to clipboard');
                }}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
              >
                Copy JSON
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-900">
          <strong>Total:</strong> {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
