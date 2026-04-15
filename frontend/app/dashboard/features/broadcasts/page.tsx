'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export default function BroadcastsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    const initPage = async () => {
      const currentUser = authService.getCurrentUser();
      const token = authService.getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      try {
        const response = await fetch(`${API_URL}/broadcasts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setBroadcasts(data.data?.broadcasts || []);
        }
      } catch (error) {
        console.error('Error fetching broadcasts:', error);
      }

      setLoading(false);
    };

    initPage();
  }, [router]);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-600 mt-2">
            {user?.type === 'company' 
              ? `Send bulk messages to groups`
              : 'Send bulk messages to your customers'
            }
          </p>
        </div>
        <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
          Create Broadcast
        </button>
      </div>

      {/* Broadcasts List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {broadcasts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No broadcasts yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Recipients</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((broadcast) => (
                <tr key={broadcast._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{broadcast.name}</td>
                  <td className="px-6 py-3 text-gray-600">{broadcast.recipientCount}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      broadcast.status === 'sent' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {broadcast.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600 text-sm">
                    {new Date(broadcast.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
