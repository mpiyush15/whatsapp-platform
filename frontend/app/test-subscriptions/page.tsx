'use client';

import { useState } from 'react';

export default function TestSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
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
      console.log('Subscriptions:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Test Subscriptions</h1>
      
      <button
        onClick={handleGetSubscriptions}
        disabled={loading}
        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Subscriptions'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {subscriptions.length > 0 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Found {subscriptions.length} subscription(s):</h2>
          {subscriptions.map((sub, idx) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p><strong>ID:</strong> {String(sub._id || '')}</p>
              <p><strong>Plan:</strong> {String(sub.planId || 'N/A')}</p>
              <p><strong>Status:</strong> {String(sub.status || 'N/A')}</p>
              <p><strong>Amount:</strong> ₹{String(sub.pricing?.finalAmount || 0)}</p>
              <p><strong>Start:</strong> {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}</p>
              <p><strong>End:</strong> {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}</p>
              <pre className="mt-2 p-2 bg-white text-xs overflow-auto max-h-60 font-mono">
                {typeof sub === 'object' ? JSON.stringify(sub, null, 2) : String(sub)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {subscriptions.length === 0 && !loading && !error && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Click the button above to fetch subscriptions
        </div>
      )}
    </div>
  );
}
