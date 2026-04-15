'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export default function LiveChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);

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
        // Fetch conversations for current account (works for both client & company)
        const response = await fetch(`${API_URL}/conversations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setConversations(data.data?.conversations || []);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Live Chat</h1>
        <p className="text-gray-600 mt-2">
          {user?.type === 'company' 
            ? `Manage real-time conversations for ${user?.name}`
            : `Chat with your customers in real-time`
          }
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="md:col-span-1 bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Conversations</h2>
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-sm">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => setSelectedChat(conv)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedChat?._id === conv._id
                      ? 'bg-green-50 border-green-300'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-900 truncate">{conv.participantName}</p>
                  <p className="text-xs text-gray-500">{conv.participantPhone}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat View */}
        <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          {selectedChat ? (
            <div>
              <h2 className="font-semibold text-gray-900 mb-4">{selectedChat.participantName}</h2>
              <div className="space-y-3 h-96 overflow-y-auto mb-4">
                {selectedChat.messages?.map((msg: any, i: number) => (
                  <div key={i} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs p-3 rounded-lg ${
                      msg.direction === 'inbound' 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'bg-green-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{msg.body}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
