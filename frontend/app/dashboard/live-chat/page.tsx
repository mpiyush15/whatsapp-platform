'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Loader, X, MessageSquare, Paperclip, Settings, Edit2, Save, Check, CheckCheck, Download, MoreVertical, Smile, Play, FileText, Music, Phone, Eye, Copy, Reply, Trash2, Star, Forward } from 'lucide-react';
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
  content: string | { text?: string; templateName?: string; [key: string]: any };
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  senderType: 'agent' | 'customer';
  isInternalNote: boolean;
  messageType?: 'text' | 'image' | 'video' | 'document' | 'audio' | 'voice';
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  caption?: string | { text?: string; [key: string]: any };
  thumbnailUrl?: string;
  duration?: number;
  reactions?: Record<string, string[]>; // emoji -> [userIds]
}

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

const API_BASE_URL = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

// ===== MEDIA HELPERS =====

const getFileIcon = (mimeType?: string, fileName?: string) => {
  if (!mimeType && !fileName) return '📄';
  
  const type = mimeType?.toLowerCase() || '';
  const name = fileName?.toLowerCase() || '';

  if (type.includes('pdf') || name.includes('.pdf')) return '📕';
  if (type.includes('word') || type.includes('msword') || name.includes('.doc')) return '📗';
  if (type.includes('sheet') || type.includes('excel') || name.includes('.xls')) return '📙';
  if (type.includes('zip') || type.includes('rar') || name.includes('.zip')) return '📦';
  if (type.includes('text') || name.includes('.txt')) return '📝';
  if (type.includes('powerpoint') || name.includes('.ppt')) return '🎯';
  
  return '📄';
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getMediaPreviewEmoji = (messageType?: string) => {
  switch (messageType) {
    case 'image': return '📷';
    case 'video': return '🎥';
    case 'audio':
    case 'voice': return '🎧';
    case 'document': return '📄';
    default: return '📎';
  }
};

// Format last seen status like WhatsApp
const formatLastSeen = (lastSeen?: string | Date) => {
  if (!lastSeen) return 'Last seen unknown';
  
  const date = new Date(lastSeen);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) {
    return 'Online';
  } else if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `Last seen ${mins}m ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `Last seen ${hours}h ago`;
  } else if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `Last seen ${days}d ago`;
  } else {
    return `Last seen ${date.toLocaleDateString()}`;
  }
};

export default function LiveChat() {
  const searchParams = useSearchParams();

  // ===== STATE =====
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'pending'>('all');
  
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [conversationStatus, setConversationStatus] = useState<'open' | 'closed' | 'pending'>('open');
  const [contactTags, setContactTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [editingContactName, setEditingContactName] = useState(false);
  const [sentMessageIds, setSentMessageIds] = useState<Set<string>>(new Set());
  
  // CRM Panel state
  const [crmPanelOpen, setCrmPanelOpen] = useState(false);
  const [contactNotes, setContactNotes] = useState('');
  const [editingName, setEditingName] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  
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
    return [...convs].sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || a.updatedAt).getTime();
      const bTime = new Date(b.lastMessageAt || b.updatedAt).getTime();
      return bTime - aTime;
    });
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return FileText;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return FileText;
    if (mimeType.includes('audio') || mimeType.includes('mp3')) return Music;
    return FileText;
  };

  const downloadMedia = async (url?: string, fileName?: string) => {
    if (!url) return;
    try {
      // Add auth token if available
      const headers: any = {};
      const token = getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(url, { headers });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg._id === messageId) {
        const reactions = msg.reactions ? { ...msg.reactions } : {};
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes('currentUser')) {
          reactions[emoji].push('currentUser');
        }
        return { ...msg, reactions };
      }
      return msg;
    }));
    setEmojiPickerOpen(null);
  };

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

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
      const response = await axios.get(`${API_BASE_URL()}/live-chat/messages`, {
        params: { conversationId, limit: 50, offset: 0 },
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        timeout: 10000
      });

      if (response.data.success && response.data.data) {
        // Backend returns array directly in data field
        let msgs = Array.isArray(response.data.data) ? response.data.data : response.data.data.messages;
        
        // Deduplicate messages by _id in case server returns duplicates
        const seenIds = new Set<string>();
        msgs = msgs.filter(msg => {
          if (seenIds.has(msg._id)) {
            console.warn('⏭️ Duplicate message filtered:', msg._id);
            return false;
          }
          seenIds.add(msg._id);
          return true;
        });
        
        setMessages(msgs);
        // Clear any temp message IDs after refresh
        setSentMessageIds(new Set());
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
      const tempMessageId = `temp_${Date.now()}`;
      const tempMessage: Message = {
        _id: tempMessageId,
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

      console.log('📤 Sending message:', { tempMessageId, content: messageText });

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
        const actualMessage = response.data.data;
        const actualMessageId = actualMessage._id;
        
        console.log('✅ Message saved with ID:', actualMessageId);
        
        // Mark this message as sent so socket doesn't add duplicate
        setSentMessageIds(prev => new Set([...prev, actualMessageId]));
        
        setMessages(prev =>
          prev.map(msg => 
            msg._id === tempMessageId 
              ? {
                  ...actualMessage,
                  content: actualMessage.content || messageText,  // Ensure content is set
                  senderType: 'agent',
                  isInternalNote: false
                }
              : msg
          )
        );
        // Socket will handle conversation_update event
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // ✅ Don't remove the message - it might have been saved even with API error
      // Just log the error and let it stay (user can refresh to confirm)
      // This is better UX than deleting a message that might have been saved
    }
  }, [messageInput, selectedConversation, sortConversations]);

  // ===== MESSAGE CONTEXT MENU HANDLERS =====

  const handleMessageContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId });
  };

  const handleCopyMessage = () => {
    const msg = messages.find(m => m._id === contextMenu?.messageId);
    if (msg && msg.content) {
      const contentToCopy = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      navigator.clipboard.writeText(contentToCopy);
    }
    setContextMenu(null);
  };

  const handleDeleteMessage = async () => {
    if (!contextMenu?.messageId) return;
    try {
      await axios.delete(`${API_BASE_URL()}/live-chat/messages/${contextMenu.messageId}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      setMessages(prev => prev.filter(msg => msg._id !== contextMenu.messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
    setContextMenu(null);
  };

  const handleDownloadMedia = (msg: Message) => {
    if (!msg.mediaUrl) return;
    const link = document.createElement('a');
    link.href = msg.mediaUrl;
    link.download = msg.fileName || `download_${msg._id}`;
    link.click();
    setContextMenu(null);
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg._id === messageId) {
        const reactions = msg.reactions || {};
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes('me')) reactions[emoji].push('me');
        return { ...msg, reactions };
      }
      return msg;
    }));
    setEmojiPickerOpen(null);
  };

  // Handle save contact info and notes - syncs to both Conversation and Contact models
  const handleSaveContact = async () => {
    if (!selectedConversation || !contactPhone) return;
    
    setSavingContact(true);
    try {
      const updatedName = editingName || contactName;

      // 1️⃣ Save to Conversation (conversation details + notes)
      const conversationResponse = await axios.patch(
        `${API_BASE_URL()}/live-chat/conversations/${selectedConversation}`,
        {
          userName: updatedName,
          notes: contactNotes,
          status: conversationStatus
        },
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        }
      );

      if (!conversationResponse.data.success) {
        throw new Error('Failed to save conversation details');
      }

      // 2️⃣ Sync to Contact model (creates or updates contact - handles duplicates automatically)
      const contactSyncResponse = await axios.post(
        `${API_BASE_URL()}/live-chat/conversations/sync-contact`,
        {
          whatsappNumber: contactPhone,
          name: updatedName,
          tags: contactTags,
          notes: contactNotes
        },
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        }
      );

      if (!contactSyncResponse.data.success) {
        console.warn('⚠️ Contact sync warning:', contactSyncResponse.data.message);
        // Don't fail here - conversation was saved successfully
      }

      // Update local state
      setContactName(updatedName);
      setEditingName('');
      
      // Update conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv._id === selectedConversation
            ? { ...conv, userName: updatedName, status: conversationStatus }
            : conv
        )
      );
      
      console.log('✅ Contact saved and synced successfully');
      alert('Contact info saved and synced!');
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact info: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSavingContact(false);
    }
  };

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

// Message events - SINGLE UNIFIED HANDLER (prevents duplicates)
  const handleNewMessage = (data: any) => {
    console.log('📨 Message received:', data);
    
    // Support both data formats
    const message = data.message || data;
    const conversationId = data.conversationId || message.conversationId;
    const messageId = message._id || data._id;
    
    if (!conversationId) return;
    
    // Update messages in current conversation
    if (conversationId === selectedConversation) {
      setMessages(prev => {
        // Avoid duplicates - if message already exists in our array, skip
        if (prev.some(m => m._id === messageId)) {
          console.log('⏭️ Message already in chat:', messageId);
          return prev;
        }
        
        const newMessage: Message = {
          _id: messageId,
          content: message.content?.text || message.content || data.senderPhone || 'Message',
          direction: message.direction || 'inbound',
          status: message.status || 'delivered',
          createdAt: message.createdAt,
          senderType: (message.direction === 'outbound') ? 'agent' : 'customer',
          isInternalNote: false,
          messageType: message.messageType || 'text',
          mediaUrl: message.mediaUrl || undefined,
          caption: message.caption || undefined,
          fileName: message.fileName || undefined,
          fileSize: message.fileSize || undefined
        };
        
        return [...prev, newMessage].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    }
      
      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(conv =>
          conv._id === conversationId
            ? {
                ...conv,
                updatedAt: message.createdAt,
                lastMessagePreview: (message.content?.text || message.content || 'Message').substring(0, 100),
                unreadCount: message.direction === 'inbound' && selectedConversation !== conversationId ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                lastMessageAt: message.createdAt
              }
            : conv
        );
        return sortConversations(updated);
      });
    };
    
    // Register handler for ALL message event types from backend
    // Backend emits: new_message, message.received, message_received
    newSocket.on('new_message', handleNewMessage);
    newSocket.on('message.received', handleNewMessage);
    newSocket.on('message_received', handleNewMessage);

    // Conversation events - Update specific conversation directly from socket
    newSocket.on('conversation_update', (data: any) => {
      console.log('🔄 Conversation updated from socket:', data);
      setConversations(prev => {
        const updated = prev.map(conv => {
          // Match by _id or conversationId
          if (conv._id === data._id || conv._id === data.conversationId) {
            return {
              ...conv,
              ...data,
              lastMessageAt: data.lastMessageAt || new Date().toISOString(),
              lastMessagePreview: data.lastMessagePreview || conv.lastMessagePreview
            };
          }
          return conv;
        });
        return sortConversations(updated);
      });
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

      // Join conversation room for real-time updates
      if (socket?.connected) {
        socket.emit('join_conversation', { conversationId: selectedConversation });
      }
    }
    // ⚠️ CRITICAL: Only fetch when selectedConversation ID changes, not when conversations list updates
    // Otherwise socket updates trigger re-fetches and lose temp messages
  }, [selectedConversation, fetchMessages, socket]);

  // Separate effect to update conversation details without re-fetching messages
  useEffect(() => {
    if (selectedConversation) {
      const conv = conversations.find(c => c._id === selectedConversation);
      if (conv) {
        setContactName(conv.userName);
        setEditingName(conv.userName || ''); // Sync editingName to prevent uncontrolled input warning
        setContactPhone(conv.userPhone || '');
        setConversationStatus(conv.status);
        setContactTags(conv.tags || []);
      }
    }
  }, [selectedConversation, conversations]);

  // ===== HANDLE QUERY PARAMETERS (Phone from Contact Drawer) =====
  useEffect(() => {
    const phoneParam = searchParams?.get('phone');
    
    if (phoneParam && conversations.length > 0 && !selectedConversation) {
      // Try to find conversation matching the phone number
      const matchingConversation = conversations.find(conv =>
        conv.userPhone === phoneParam || 
        conv.userPhone === decodeURIComponent(phoneParam) ||
        conv.userPhone.includes(phoneParam.replace(/[^0-9]/g, ''))
      );
      
      if (matchingConversation) {
        // Auto-select the conversation
        setSelectedConversation(matchingConversation._id);
        console.log('✅ Auto-selected conversation from phone parameter:', phoneParam);
      }
    }
  }, [searchParams, conversations, selectedConversation]);

  // ===== AUTO-SCROLL =====

  useEffect(() => {
    // On first load or when messages change, scroll to bottom instantly
    if (messagesEndRef.current) {
      // Use 'auto' for instant scroll on load, 'smooth' for subsequent updates
      const behavior = messages.length > 0 ? 'auto' : 'auto';
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, [messages]);

  // ===== RENDER =====

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-100">
      {/* Conversations Sidebar - Hidden on mobile when chat is open */}
      <div className={`w-full md:w-96 bg-white border-r border-gray-200 overflow-y-auto flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
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
                onClick={async () => {
                  setSelectedConversation(conv._id);
                  // Reset unread count when conversation is opened
                  setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));
                  
                  // Call backend API to mark conversation as read
                  try {
                    await axios.post(
                      `${API_BASE_URL()}/live-chat/conversations/${conv._id}/mark-read`,
                      {},
                      { headers: { 'Authorization': `Bearer ${getAuthToken()}` } }
                    );
                  } catch (error) {
                    console.error('Error marking conversation as read:', error);
                  }
                }}
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
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(conv.lastMessageAt || conv.updatedAt)}</span>
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
        <div className="flex w-full bg-white overflow-hidden">
          {/* Chat Column */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="h-20 border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button 
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                ← Back
              </button>
              <div className="flex-1 min-w-0">
                {/* Phone Number - Bigger Font */}
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg text-gray-900 truncate">{contactPhone || 'Unknown'}</h2>
                  {/* Online Status Indicator */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    conversations.find(c => c._id === selectedConversation)?.status === 'open' 
                      ? 'bg-green-500' 
                      : 'bg-gray-400'
                  }`} title={conversations.find(c => c._id === selectedConversation)?.status} />
                </div>
                {/* Contact Name */}
                <p className="text-sm font-medium text-gray-700 truncate">{contactName || 'No name'}</p>
                {/* Last Seen Status */}
                <p className="text-xs text-gray-500 mt-0.5">
                  {conversations.find(c => c._id === selectedConversation)?.lastMessageAt 
                    ? formatLastSeen(conversations.find(c => c._id === selectedConversation)?.lastMessageAt)
                    : 'Never contacted'
                  }
                </p>
              </div>
            </div>
            <button 
              onClick={() => setCrmPanelOpen(!crmPanelOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            >
              <Settings size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2" style={{backgroundColor: '#f5f1e8'}} onContextMenu={(e) => e.preventDefault()}>
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="animate-spin text-teal-600" size={24} />
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg, idx) => (
                <div 
                  key={msg._id} 
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'} group relative`}
                >
                  {/* Emoji Reaction Bar - Floating Above Message */}
                  {emojiPickerOpen === msg._id && (
                    <div className="absolute -top-10 left-0 flex gap-1 bg-white shadow-lg rounded-full px-2 py-1 z-40 border border-gray-200">
                      {emojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(msg._id, emoji)}
                          className="text-lg hover:scale-125 transition p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`max-w-md rounded-2xl shadow-sm overflow-hidden relative ${msg.direction === 'outbound' ? 'bg-green-200 rounded-br-none' : 'bg-blue-100 rounded-bl-none'}`}>
                    
                    {/* IMAGE MESSAGE */}
                    {msg.messageType === 'image' && msg.mediaUrl ? (
                      <div className="relative">
                        <img 
                          src={msg.mediaUrl}
                          alt="Image message"
                          onClick={() => { setSelectedMedia(msg); setMediaViewerOpen(true); }}
                          className="w-full max-w-sm max-h-80 object-cover cursor-pointer hover:opacity-90 transition rounded-2xl"
                          onError={(e) => console.error('Image failed to load:', msg.mediaUrl)}
                          onLoad={() => console.log('Image loaded successfully')}
                        />
                        {msg.caption && <p className="px-3 py-2 text-sm break-words text-gray-900">{typeof msg.caption === 'string' ? msg.caption : JSON.stringify(msg.caption)}</p>}
                        <button 
                          onClick={() => handleDownloadMedia(msg)}
                          className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition"
                        >
                          <Download size={16} className="text-gray-700" />
                        </button>
                      </div>
                    ) : msg.messageType === 'image' ? (
                      <div className="px-4 py-3 bg-inherit">
                        <p className="text-sm text-gray-600">🖼️ Image (no URL)</p>
                        <p className="text-xs text-gray-500 mt-1">{typeof msg.content === 'string' ? (msg.content || 'Image message') : 'Image message'}</p>
                      </div>
                    ) : msg.messageType === 'video' && msg.mediaUrl ? (
                      <div className="relative">
                        <img 
                          src={msg.thumbnailUrl || msg.mediaUrl}
                          alt="Video"
                          onClick={() => { setSelectedMedia(msg); setMediaViewerOpen(true); }}
                          className="w-full max-w-sm max-h-80 object-cover cursor-pointer rounded-2xl"
                        />
                        <button 
                          onClick={() => { setSelectedMedia(msg); setMediaViewerOpen(true); }}
                          className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition rounded-2xl"
                        >
                          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                            <Play size={24} fill="white" className="text-white ml-1" />
                          </div>
                        </button>
                        {msg.duration && (
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded font-mono">
                            {Math.floor(msg.duration / 60)}:{(msg.duration % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                      </div>
                    ) : msg.messageType === 'audio' || msg.messageType === 'voice' ? (
                      <div className="px-3 py-2 min-w-xs bg-inherit">
                        <div className="flex items-center gap-3">
                          <button className="flex-shrink-0 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition">
                            <Play size={16} fill="currentColor" />
                          </button>
                          <div className="flex-1 flex items-center gap-1">
                            <div className="flex-1 h-1 bg-gray-400/50 rounded-full relative">
                              <div className="absolute h-full bg-gray-600 rounded-full" style={{width: '30%'}}></div>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-gray-600 flex-shrink-0">
                            {msg.duration ? `${Math.floor(msg.duration / 60)}:${(msg.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                          </span>
                        </div>
                      </div>
                    ) : msg.messageType === 'document' && msg.mediaUrl ? (
                      <div className="px-4 py-3 bg-inherit">
                        <div className="flex items-start gap-3 bg-white/30 p-3 rounded-lg">
                          <span className="text-2xl flex-shrink-0">📄</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 break-words">{msg.fileName || 'Document'}</p>
                            <p className="text-xs text-gray-600">{formatFileSize(msg.fileSize)}</p>
                            <button 
                              onClick={() => handleDownloadMedia(msg)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 flex items-center gap-1"
                            >
                              <Download size={12} /> Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* TEXT MESSAGE */
                      <div className="px-3 py-2 bg-inherit">
                        <p className="text-sm break-words text-gray-900">
                          {typeof msg.content === 'string' 
                            ? (msg.content || (typeof msg.caption === 'string' ? msg.caption : '') || '')
                            : typeof msg.content === 'object' && msg.content?.templateName
                              ? `Template: ${msg.content.templateName}`
                              : (typeof msg.caption === 'string' ? msg.caption : 'Message')}
                        </p>
                      </div>
                    )}

                    {/* Message Footer */}
                    <div className={`text-xs px-3 py-2 font-medium flex items-center justify-end gap-1 ${msg.direction === 'outbound' ? 'text-green-700' : 'text-blue-600'}`}>
                      <span>{formatDate(msg.createdAt)}</span>
                      {msg.direction === 'outbound' && (
                        msg.status === 'read' ? (
                          <CheckCheck size={14} className="text-green-600" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck size={14} className="text-green-700" />
                        ) : (
                          <Check size={14} />
                        )
                      )}
                    </div>

                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 px-3 py-1 bg-white/20 border-t border-white/30">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(msg._id, emoji)}
                            className="px-2 py-1 rounded-full bg-white/50 hover:bg-white text-xs font-medium transition"
                            title={`Reacted by: ${users.join(', ')}`}
                          >
                            {emoji} {users.length > 1 ? users.length : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Menu Button - Arrow on Hover */}
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ${msg.direction === 'outbound' ? 'mr-2 order-first' : 'ml-2'}`}>
                    {/* Emoji Reaction Button */}
                    <button
                      onClick={() => setEmojiPickerOpen(emojiPickerOpen === msg._id ? null : msg._id)}
                      className="p-1 hover:bg-gray-200 rounded-full transition text-gray-600"
                      title="Add reaction"
                    >
                      <Smile size={16} />
                    </button>
                    
                    {/* Context Menu Dropdown */}
                    <div className="relative group/menu">
                      <button className="p-2 hover:bg-gray-200 rounded-full transition text-gray-600">
                        <MoreVertical size={16} />
                      </button>
                      
                      {/* Context Menu */}
                      <div className="hidden group-hover/menu:block absolute right-0 top-full bg-white shadow-lg rounded-lg py-2 z-50 min-w-max border border-gray-200 mt-1">
                        <button
                          onClick={() => { handleCopyMessage(); setContextMenu(null); }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                        >
                          <Copy size={14} /> Copy
                        </button>
                        {msg.mediaUrl && (
                          <button
                            onClick={() => handleDownloadMedia(msg)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                          >
                            <Download size={14} /> Download
                          </button>
                        )}
                        <button
                          onClick={() => { handleDeleteMessage(); setContextMenu(null); }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm text-red-600"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="h-16 border-t border-gray-200 px-4 py-2 flex items-center gap-2 flex-shrink-0 bg-white relative">
            {/* Attachment Menu */}
            <div className="relative group">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0">
                <Paperclip size={20} />
              </button>
              <div className="hidden group-hover:block absolute bottom-12 left-0 bg-white shadow-lg rounded-lg py-2 z-50 min-w-max border border-gray-200">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm">
                  <FileText size={16} /> Document
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm">
                  📷 Photos & Videos
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm">
                  <Music size={16} /> Audio
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm">
                  <Phone size={16} /> Contact
                </button>
              </div>
            </div>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* CRM Panel - Right Side */}
        {crmPanelOpen && (
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
            {/* Panel Header */}
            <div className="h-16 border-b border-gray-200 px-4 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Contact Info</h3>
              <button
                onClick={() => setCrmPanelOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                ✕
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Phone Number */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Phone</label>
                <p className="text-sm font-bold text-gray-900 mt-1">{contactPhone || 'Unknown'}</p>
              </div>

              {/* Contact Name */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Name</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Enter contact name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Notes</label>
                <textarea
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Add notes about this contact..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Status</label>
                <select
                  value={conversationStatus}
                  onChange={(e) => setConversationStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {/* Panel Footer - Save Button */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <button
                onClick={handleSaveContact}
                disabled={savingContact}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition"
              >
                {savingContact ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
        </div>
      ) : (
        <div className="hidden md:flex w-full items-center justify-center bg-gray-50">
          <div className="text-gray-400 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <p>Select a conversation to start messaging</p>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {mediaViewerOpen && selectedMedia && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <button
            onClick={() => setMediaViewerOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg"
          >
            <X size={24} className="text-gray-900" />
          </button>

          {selectedMedia.messageType === 'image' && selectedMedia.mediaUrl && (
            <div className="max-w-4xl w-full">
              <img
                src={selectedMedia.mediaUrl}
                alt="Full view"
                className="w-full h-auto max-h-96 object-contain rounded-lg"
              />
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedMedia.mediaUrl;
                    link.download = selectedMedia.fileName || 'image';
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>
          )}

          {selectedMedia.messageType === 'video' && selectedMedia.mediaUrl && (
            <video
              src={selectedMedia.mediaUrl}
              controls
              autoPlay
              className="max-w-4xl w-full h-auto max-h-96 rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  );
}
