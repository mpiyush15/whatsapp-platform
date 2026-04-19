'use client';

import { useState, useEffect } from 'react';

export default function SuperAdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const response = await fetch(`${apiUrl}/subscriptions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const allSubs = data.data?.subscriptions || data.subscriptions || [];
      
      // Sort
      if (sortBy === 'amount') {
        allSubs.sort((a: any, b: any) => (b.pricing?.finalAmount || b.amount || 0) - (a.pricing?.finalAmount || a.amount || 0));
      } else {
        allSubs.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      }
      
      setSubscriptions(allSubs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">All Subscriptions</h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">All Subscriptions</h1>
          <p className="text-gray-600 mt-1">Total: {subscriptions.length} subscriptions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('date')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              sortBy === 'date'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sort by Date
          </button>
          <button
            onClick={() => setSortBy('amount')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              sortBy === 'amount'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sort by Amount
          </button>
          <button
            onClick={fetchSubscriptions}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition"
          >
            Refresh
          </button>
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Subscription ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Account ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Plan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Billing</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Start Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">End Date</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub: any, idx) => (
                <tr
                  key={String(sub._id)}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 text-xs font-mono text-blue-600 font-semibold">
                    {sub.subscriptionId || String(sub._id).substring(0, 12)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 bg-blue-50">
                    {sub.accountId}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {sub.planId || sub.planName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    ₹{sub.pricing?.finalAmount || sub.paymentAmount || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                    {sub.billingCycle || 'monthly'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      sub.status === 'active' ? 'bg-green-100 text-green-800' :
                      sub.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sub.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN') : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-blue-700">Total Subscriptions</p>
            <p className="text-2xl font-bold text-blue-900">{subscriptions.length}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Total Revenue</p>
            <p className="text-2xl font-bold text-blue-900">
              ₹{subscriptions.reduce((sum, sub) => sum + (sub.pricing?.finalAmount || sub.paymentAmount || 0), 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Active Subscriptions</p>
            <p className="text-2xl font-bold text-blue-900">
              {subscriptions.filter((s: any) => s.status === 'active').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
