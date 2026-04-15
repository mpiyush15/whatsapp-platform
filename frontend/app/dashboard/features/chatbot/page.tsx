'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export default function ChatbotPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatbots, setChatbots] = useState<any[]>([]);

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
        const response = await fetch(`${API_URL}/chatbots`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setChatbots(data.data?.chatbots || []);
        }
      } catch (error) {
        console.error('Error fetching chatbots:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Chatbot</h1>
          <p className="text-gray-600 mt-2">Configure AI-powered chatbots for automated responses</p>
        </div>
        <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium">
          Create Chatbot
        </button>
      </div>

      {/* Chatbots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chatbots.length === 0 ? (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No chatbots configured yet</p>
          </div>
        ) : (
          chatbots.map((bot) => (
            <div key={bot._id} className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">{bot.name}</h3>
              <p className="text-sm text-gray-600 mt-2">{bot.description}</p>
              <div className="mt-4">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  bot.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {bot.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 text-sm font-medium transition">
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 text-sm font-medium transition">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
