'use client';

import { useState, useEffect } from 'react';
import { Send, MoreVertical, Phone, Video, Plus, Loader, X, MessageSquare } from 'lucide-react';
import axios from 'axios';

interface Conversation {
  _id: string;
  contactId: {
    _id: string;
    name: string;
    phone: string;
    profilePictureUrl?: string;
  };
  status: 'open' | 'closed';
  tags: string[];
  unreadCount: number;
  lastMessage?: string;
  updatedAt: string;
  assignedAgentId?: string;
  priority: string;
  messageCount: number;
}

interface Message {
  _id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
  senderType: 'agent' | 'customer';
  isInternalNote: boolean;
}

export default function LiveChat() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);

  useEffect(() => {
    fetchPhoneNumbers();
    // Also try to fetch conversations immediately
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
    const token = getAuthToken();
    
    axios.get(`${baseURL}/live-chat/conversations`, {
      params: { limit: 50, offset: 0 },
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      timeout: 10000
    }).then(res => {
      if (res.data.success && res.data.data) {
        setConversations(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedConversation(res.data.data[0]._id);
          setShowConversationList(false);
        }
        setLoading(false);
      }
    }).catch(err => {
      console.error('Failed to fetch:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token');
    }
    return null;
  };

  const fetchPhoneNumbers = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      // Try multiple endpoints to get phone numbers
      let response = null;
      try {
        response = await axios.get(`${baseURL}/settings/phone-numbers`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
          timeout: 5000
        });
      } catch (e) {
        // Fallback endpoint
        response = await axios.get(`${baseURL}/phone-numbers`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
          timeout: 5000
        });
      }

      if (response.data.success && response.data.data?.length > 0) {
        const activePhone = response.data.data.find((p: any) => p.isActive) || response.data.data[0];
        if (activePhone?.phoneNumberId) {
          setPhoneNumberId(activePhone.phoneNumberId);
          return;
        }
      }
      
      // If no phone numbers found, still allow loading conversations without phone ID filter
      console.warn('No phone numbers found, loading without filter');
      setPhoneNumberId('');
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      // Don't block - set empty phone ID and try to load anyway
      setPhoneNumberId('');
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      const response = await axios.get(`${baseURL}/live-chat/conversations`, {
        params: {
          status: null,
          limit: 50,
          offset: 0,
          search: searchQuery
        },
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          ...(phoneNumberId && { 'x-phone-number-id': phoneNumberId })
        },
        timeout: 10000
      });

      if (response.data.success && response.data.data) {
        const convos = response.data.data;
        setConversations(convos);
        
        if (convos.length > 0 && !selectedConversation) {
          setSelectedConversation(convos[0]._id);
          setShowConversationList(false);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      const response = await axios.get(`${baseURL}/live-chat/messages`, {
        params: {
          conversationId,
          limit: 100,
          offset: 0
        },
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (response.data.success && response.data.data) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      await axios.post(`${baseURL}/live-chat/messages`, {
        conversationId: selectedConversation,
        content: messageInput,
        messageType: 'text'
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      setMessageInput('');
      fetchMessages(selectedConversation);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedConvData = conversations.find((c) => c._id === selectedConversation);

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden">
      {/* Conversation List */}
      <div className={`${showConversationList ? 'flex' : 'hidden'} md:flex w-full md:w-80 flex-shrink-0 border-r border-gray-200 flex-col overflow-hidden`}>
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0 bg-white">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Plus size={20} className="text-green-500" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyUp={() => fetchConversations()}
            className="w-full px-3 py-2 bg-gray-100 border border-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="animate-spin text-green-500" size={24} />
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => {
                  setSelectedConversation(conv._id);
                  setShowConversationList(false);
                }}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                  selectedConversation === conv._id ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(conv.contactId.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{conv.contactId.name}</h4>
                      <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(conv.updatedAt)}</span>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-600 truncate mt-1">{conv.lastMessage}</p>
                    )}
                  </div>

                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 p-4">
              <p className="text-center text-sm">No conversations</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden'} md:flex w-full flex-col overflow-hidden`}>
        {selectedConvData ? (
          <>
            <div className="h-16 border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-3 flex-1">
                <button 
                  onClick={() => setShowConversationList(true)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition -ml-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {getInitials(selectedConvData.contactId.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 text-sm truncate">{selectedConvData.contactId.name}</h2>
                  <p className="text-xs text-gray-500">Active now</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition hidden sm:block">
                  <Phone size={18} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition hidden sm:block">
                  <Video size={18} className="text-gray-600" />
                </button>
                <button 
                  onClick={() => setDetailsPanelOpen(!detailsPanelOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <MoreVertical size={18} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 flex flex-col gap-3 bg-white">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="animate-spin text-green-500" size={24} />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-green-500 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p className="text-sm">No messages</p>
                </div>
              )}
            </div>

            <div className="h-16 border-t border-gray-200 px-4 py-3 flex items-center gap-2 flex-shrink-0 bg-white">
              <input
                type="text"
                placeholder="Message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              <button 
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition flex-shrink-0 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-400 text-center">Select a chat</p>
          </div>
        )}
      </div>

      {detailsPanelOpen && selectedConvData && (
        <div className="fixed md:relative inset-0 md:inset-auto md:w-80 md:border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0 z-50">
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white md:hidden">
            <h3 className="font-semibold text-gray-900">Info</h3>
            <button onClick={() => setDetailsPanelOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-2xl mb-4">
                {getInitials(selectedConvData.contactId.name)}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{selectedConvData.contactId.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedConvData.status === 'open' ? '🟢 Active' : '⚫ Closed'}</p>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Phone</h4>
              <p className="text-sm text-gray-600 break-all">{selectedConvData.contactId.phone}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Messages</span>
                <span className="font-semibold text-gray-900">{selectedConvData.messageCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
