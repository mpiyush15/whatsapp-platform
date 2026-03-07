'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Loader, X, MessageSquare, Paperclip, Settings, Edit2, Save } from 'lucide-react';
import axios from 'axios';
import io, { Socket } from 'socket.io-client';

interface Conversation {
  _id: string;
  userName: string;
  userPhone: string;
  status: 'open' | 'closed' | 'pending';
  tags: string[];
  unreadCount: number;
  lastMessagePreview?: string;
  updatedAt: string;
  lastMessageAt?: string;
  assignedAgentId?: string;
  priority: string;
  messageCount: number;
}

interface Message {
  _id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  senderType: 'agent' | 'customer';
  isInternalNote: boolean;
  messageType?: 'text' | 'image' | 'video' | 'document' | 'audio';
  mediaUrl?: string;
}

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

const API_BASE_URL = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export default function LiveChat() {
  const searchParams = useSearchParams();

  // ===== STATE =====
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'pending'>('all');
  
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [contactName, setContactName] = useState('');
  const [conversationStatus, setConversationStatus] = useState<'open' | 'closed' | 'pending'>('open');
  const [contactTags, setContactTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [editingContactName, setEditingContactName] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ===== UTILITY FUNCTIONS =====
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateToCheck.getTime() === todayDate.getTime()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    if (dateToCheck.getTime() === yesterdayDate.getTime()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const sortConversations = useCallback((convs: Conversation[]) => {
    return [...convs].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, []);

  const getFilteredConversations = useCallback(() => {
    let filtered = conversations;
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(conv => conv.status === filterStatus);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.userPhone.includes(query) ||
        conv.userName?.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [conversations, filterStatus, searchQuery]);

  const getInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ===== API CALLS =====

  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL()}/live-chat/conversations`, {
        params: { limit: 50, offset: 0 },
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        timeout: 10000
      });

      if (response.data.success && response.data.data) {
        const sorted = sortConversations(response.data.data);
        setConversations(sorted);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [sortConversations]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const response = await axios.get(`${API_BASE_URL()}/live-chat/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        timeout: 10000
      });

      if (response.data.success && response.data.data) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const messageText = messageInput;
    setMessageInput('');

    try {
      // Optimistic update - add message immediately
      const tempMessage: Message = {
        _id: `temp_${Date.now()}`,
        content: messageText,
        direction: 'outbound',
        status: 'sent',
        createdAt: new Date().toISOString(),
        senderType: 'agent',
        isInternalNote: false,
        messageType: 'text'
      };

      setMessages(prev => [...prev, tempMessage]);

      // Update conversation optimistically
      setConversations(prev => {
        const updated = prev.map(conv =>
          conv._id === selectedConversation
            ? {
                ...conv,
                lastMessagePreview: messageText.substring(0, 100),
                updatedAt: new Date().toISOString(),
                lastMessageAt: new Date().toISOString()
              }
            : conv
        );
        return sortConversations(updated);
      });

      // Send to server
      const response = await axios.post(`${API_BASE_URL()}/live-chat/messages`, {
        conversationId: selectedConversation,
        content: messageText,
        messageType: 'text'
      }, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      // Replace temp message with actual message
      if (response.data.success && response.data.data) {
        setMessages(prev =>
          prev.map(msg => msg._id === tempMessage._id ? response.data.data : msg)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg._id !== `temp_${Date.now()}`));
    }
  }, [messageInput, selectedConversation, sortConversations]);

  // ===== SOCKET.IO HANDLERS =====

  useEffect(() => {
    const socketURL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5050';
    const token = getAuthToken();

    const newSocket = io(socketURL, {
      auth: { token: token || '' },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    // Message events - UNIFIED HANDLER
    newSocket.on('new_message', (data: any) => {
      console.log('📨 New message:', data);
      
      // Update messages if this conversation is selected
      if (data.conversationId === selectedConversation && data.message) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === data.message._id)) return prev;
          const updated = [...prev, data.message];
          return updated.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }

      // Update conversation in list (auto-sort)
      if (data.conversationId && data.message) {
        setConversations(prev => {
          const updated = prev.map(conv =>
            conv._id === data.conversationId
              ? {
                  ...conv,
                  updatedAt: data.message.createdAt,
                  lastMessagePreview: data.message.content?.substring(0, 100),
                  unreadCount: data.message.direction === 'inbound' ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                  lastMessageAt: data.message.createdAt
                }
              : conv
          );
          return sortConversations(updated);
        });
      }
    });

    newSocket.on('message_received', (data: any) => {
      console.log('📨 Message received:', data);
      // Same as new_message
      newSocket.emit('new_message', data);
    });

    // Conversation events
    newSocket.on('conversation_update', (data: any) => {
      console.log('🔄 Conversation updated:', data);
      fetchConversations();
    });

    setSocket(newSocket);

    // Fetch initial data
    fetchConversations();

    return () => {
      newSocket.disconnect();
    };
  }, [fetchConversations, selectedConversation, sortConversations]);

  // ===== CONVERSATION SELECTION =====

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);

      // Load conversation details
      const conv = conversations.find(c => c._id === selectedConversation);
      if (conv) {
        setContactName(conv.userName);
        setConversationStatus(conv.status);
        setContactTags(conv.tags || []);
      }

      // Join conversation room for real-time updates
      if (socket?.connected) {
        socket.emit('join_conversation', { conversationId: selectedConversation });
      }
    }
  }, [selectedConversation, conversations, fetchMessages, socket]);

  // ===== AUTO-SCROLL =====

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== RENDER =====

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
        {/* Search & Filter */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            {(['all', 'open', 'closed', 'pending'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  filterStatus === status
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="animate-spin text-green-500" size={24} />
            </div>
          ) : getFilteredConversations().length > 0 ? (
            getFilteredConversations().map((conv) => (
              <button
                key={conv._id}
                onClick={() => setSelectedConversation(conv._id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                  selectedConversation === conv._id ? 'bg-green-50 border-l-4 border-green-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {getInitials(conv.userName)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 justify-between">
                      <h4 className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
                        {conv.userName || conv.userPhone}
                      </h4>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(conv.updatedAt)}</span>
                    </div>
                    {conv.lastMessagePreview && (
                      <p className="text-xs text-gray-500 truncate mt-1">{conv.lastMessagePreview}</p>
                    )}
                  </div>

                  {/* Unread Badge */}
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">No conversations</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="hidden md:flex w-full flex-col bg-white overflow-hidden">
          {/* Header */}
          <div className="h-16 border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="font-semibold text-gray-900">{contactName}</h2>
              <p className="text-xs text-gray-500">{conversations.find(c => c._id === selectedConversation)?.userPhone}</p>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Settings size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.direction === 'outbound'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-600'}`}>
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">No messages</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="h-16 border-t border-gray-200 px-4 py-3 flex items-center gap-2 flex-shrink-0">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600">
              <Paperclip size={18} />
            </button>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex w-full items-center justify-center bg-gray-50">
          <p className="text-gray-400">Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
}
