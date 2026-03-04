'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical, 
  Phone, 
  Video,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Download,
  Smile,
  ArrowLeft,
  X,
  Copy,
  Trash2,
  Pin,
  ChevronDown,
  Image as ImageIcon,
  File as FileIcon
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

interface Message {
  _id: string;
  conversationId: string;
  content: { text?: string; url?: string; caption?: string; filename?: string };
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document';
  senderName?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  waMessageId?: string;
}

interface Conversation {
  _id: string;
  userPhone: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount?: number;
  phoneNumberId: string;
  lastSeen?: string;
  isOnline?: boolean;
}

interface PhoneNumber {
  _id: string;
  phoneNumberId: string;
  displayPhone: string;
  displayName: string;
  qualityRating: string;
  isActive: boolean;
}

// ✅ DIAGNOSTIC: Log API configuration on mount
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    API_URL,
    hasToken: !!localStorage.getItem('token'),
    tokenLength: localStorage.getItem('token')?.length || 0
  });
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// ✅ Helper function to make API calls with better error handling
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  const headers = getHeaders();
  
  console.log(`📡 API Call: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
    
    // If response is not JSON, return text for debugging
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to parse error response';
      }
      
      console.error(`❌ API Error ${response.status}:`, errorText);
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ API Call Failed: ${errorMsg}`);
    throw error;
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return 'TODAY';
  } else if (date.getTime() > now.getTime() - 24 * 60 * 60 * 1000) {
    return 'YESTERDAY';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }).toUpperCase();
  }
};

const formatLastSeen = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getStatusIcon = (message: Message) => {
  if (message.direction !== 'outbound') return null;

  switch (message.status) {
    case 'sent':
      return <Check className="h-4 w-4 text-[#667781]" />;
    case 'delivered':
      return <CheckCheck className="h-4 w-4 text-[#667781]" />;
    case 'read':
      return <CheckCheck className="h-4 w-4 text-[#53bdeb]" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-[#667781]" />;
  }
};

export default function LiveChatV2() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState<{ file: File; preview: string } | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contactStatus, setContactStatus] = useState<{ isOnline: boolean; lastSeen: string } | null>(null);
  const [messagesPage, setMessagesPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [contactPriority, setContactPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignedAgent, setAssignedAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [contactNamesMap, setContactNamesMap] = useState<Record<string, string>>({}); // Map of phone -> name
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-adjust textarea height
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  };

  // Check mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
      setSidebarOpen(window.innerWidth >= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🔴 FETCH PHONE NUMBERS FIRST
  const fetchPhoneNumbers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }
      
      const response = await fetch(`${API_URL}/settings/phone-numbers`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.phoneNumbers || data || []);
        
        // Auto-select first active phone
        const phones = data.phoneNumbers || data || [];
        const activePhone = phones.find((p: PhoneNumber) => p.isActive);
        if (activePhone) {
          setSelectedPhoneId(activePhone.phoneNumberId);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch phones:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  }, []);

  // 🔴 FETCH CONVERSATIONS WITH PHONE ID
  const fetchConversations = useCallback(async () => {
    if (!selectedPhoneId) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        setIsLoading(false);
        return;
      }
      
      const url = new URL(`${API_URL}/conversations`);
      url.searchParams.append('phoneNumberId', selectedPhoneId);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-phone-number-id': selectedPhoneId
      };
      
      console.log('📡 Fetching conversations from:', url.toString());
      console.log('📡 API_URL:', API_URL);
      console.log('📡 Token exists:', !!token);
      console.log('📡 SelectedPhoneId:', selectedPhoneId);
      
      const response = await fetch(url.toString(), { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, response.statusText, errorText);
        setConversations([]);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.conversations) {
        console.log('✅ Fetched conversations:', data.conversations.length);
        setConversations(data.conversations);
      } else {
        console.warn('⚠️ No conversations found:', data);
        setConversations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPhoneId]);

  // 🔴 FETCH MESSAGES FOR CONVERSATION
  const fetchMessages = useCallback(async (conversationId: string, phoneNumberId: string, page: number = 0, append: boolean = false) => {
    if (!conversationId || !phoneNumberId) {
      console.warn('⚠️ Missing conversationId or phoneNumberId');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-phone-number-id': phoneNumberId
      };
      
      const messageUrl = `${API_URL}/conversations/${conversationId}/messages?phoneNumberId=${phoneNumberId}&page=${page}&limit=50`;
      console.log('📡 Fetching messages from:', messageUrl);
      
      const response = await fetch(messageUrl, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, response.statusText, errorText);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        console.log('✅ Fetched messages:', data.messages.length);
        
        if (append) {
          // Prepend older messages
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          // Replace all messages
          setMessages(data.messages);
        }
        
        // Check if there are more messages
        setHasMoreMessages(data.messages.length === 50);
        
        // Auto-scroll to bottom only if not appending
        if (!append) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else {
        console.warn('⚠️ No messages found or error:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
      }
    }
  }, []);

  // 🔴 FETCH CONTACT STATUS (Last Seen, Online/Offline)
  const fetchContactStatus = useCallback(async (userPhone: string, conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/conversations/${conversationId}/contact-status?userPhone=${userPhone}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Contact Status:', data);
        
        if (data.success && data.status) {
          setContactStatus({
            isOnline: data.status.isOnline || false,
            lastSeen: data.status.lastSeen || new Date().toISOString()
          });
        }
      } else {
        console.warn('⚠️ Failed to fetch contact status:', response.status);
        // Set default offline status
        setContactStatus({
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error fetching contact status:', error);
      // Set default offline status
      setContactStatus({
        isOnline: false,
        lastSeen: new Date().toISOString()
      });
    }
  }, []);

  // 🔴 FETCH CONTACT NAME FROM BACKEND
  const fetchContactName = useCallback(async (userPhone: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/contacts/by-phone/${userPhone}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Contact fetched:', data);
        
        if (data.success && data.contact) {
          console.log('📱 Setting display name to:', data.contact.name);
          setDisplayName(data.contact.name);
          // Also add to map for persistent display
          setContactNamesMap(prev => ({
            ...prev,
            [userPhone]: data.contact.name
          }));
        } else {
          console.log('⚠️ No contact found in DB for phone:', userPhone);
          setDisplayName(null);
        }
      } else {
        console.warn('⚠️ Failed to fetch contact:', response.status);
        setDisplayName(null);
      }
    } catch (error) {
      console.error('❌ Error fetching contact name:', error);
      setDisplayName(null);
    }
  }, []);

  // 🔴 FETCH ALL CONTACT NAMES WHEN CONVERSATIONS LOAD
  useEffect(() => {
    if (conversations.length > 0) {
      conversations.forEach(conv => {
        // Only fetch if not already in map
        if (!contactNamesMap[conv.userPhone]) {
          fetchContactName(conv.userPhone);
        }
      });
    }
  }, [conversations, fetchContactName, contactNamesMap]);

  // 🔴 LOAD MORE OLD MESSAGES
  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversation || !hasMoreMessages) return;
    
    const nextPage = messagesPage + 1;
    console.log('📡 Loading more messages, page:', nextPage);
    
    await fetchMessages(selectedConversation._id, selectedConversation.phoneNumberId, nextPage, true);
    setMessagesPage(nextPage);
  }, [selectedConversation, hasMoreMessages, messagesPage, fetchMessages]);

  // 🔴 SAVE CONTACT
  const handleSaveContact = async () => {
    if (!selectedConversation || !contactName.trim()) {
      alert('Please enter a contact name');
      return;
    }

    setIsAddingContact(true);
    try {
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          whatsappNumber: selectedConversation.userPhone,
          name: contactName.trim(),
          tags: ['from_chat'],
          phoneNumberId: selectedConversation.phoneNumberId
        })
      });

      const data = await response.json();

      if (data.success || response.ok) {
        console.log('✅ Contact saved successfully');
        const savedName = contactName.trim();
        setDisplayName(savedName);
        // Update map for persistent display
        setContactNamesMap(prev => ({
          ...prev,
          [selectedConversation.userPhone]: savedName
        }));
        setShowAddContactModal(false);
        setContactName('');
        alert(`✅ Contact "${savedName}" saved successfully!`);
      } else {
        console.error('❌ Failed to save contact:', data);
        alert(`Failed to save contact: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error saving contact:', error);
      alert('Error saving contact. Please try again.');
    } finally {
      setIsAddingContact(false);
    }
  };

  // 🔴 SEND MESSAGE
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    
    setIsSending(true);
    
    try {
      const response = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          phoneNumberId: selectedConversation.phoneNumberId,
          recipientPhone: selectedConversation.userPhone,
          message: newMessage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        // Message will be added via socket.io broadcast
      } else {
        alert(`Failed to send: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ Send error:', error);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // 🔴 SEND FILE
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    
    if (file.size > 16 * 1024 * 1024) {
      alert('File too large (max 16MB)');
      return;
    }

    // Generate preview
    let preview = '';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setShowFilePreview({ file, preview: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setShowFilePreview({ file, preview: '' });
    }
  };

  // Send file after preview
  const sendFile = async (file: File) => {
    if (!selectedConversation) return;
    
    setIsSending(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('phoneNumberId', selectedConversation.phoneNumberId);
      formData.append('recipientPhone', selectedConversation.userPhone);
      formData.append('campaign', 'manual');
      
      const response = await fetch(`${API_URL}/messages/send-media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        alert(`Upload failed: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('Upload failed');
    } finally {
      setIsSending(false);
    }
  };

  // 🔴 INIT PHONE NUMBERS & SOCKET
  useEffect(() => {
    fetchPhoneNumbers();
    
    // Setup socket.io
    const socketUrl = API_URL.replace('/api', '');
    console.log('🔌 Connecting to socket:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: { token: localStorage.getItem('token') },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
    });
    
    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });
    
    newSocket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
    });
    
    newSocket.on('message.received', (data: Message) => {
      console.log('📨 Message received:', data);
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setMessages(prev => [...prev, data]);
      }
    });
    
    newSocket.on('message.sent', (data: Message) => {
      console.log('📤 Message sent:', data);
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === data._id);
          return exists ? prev.map(m => m._id === data._id ? data : m) : [...prev, data];
        });
      }
    });
    
    newSocket.on('message_status', (data: any) => {
      console.log('🔄 Message status:', data);
      setMessages(prev =>
        prev.map(m =>
          m._id === data.messageId
            ? { ...m, status: data.status }
            : m
        )
      );
    });

    // Listen for contact status changes
    newSocket.on('contact_status', (data: any) => {
      console.log('👤 Contact status:', data);
      setContactStatus({
        isOnline: data.isOnline,
        lastSeen: data.lastSeen || new Date().toISOString()
      });
    });

    // Listen for contact online event
    newSocket.on('contact_online', (data: any) => {
      console.log('🟢 Contact online:', data);
      setContactStatus({
        isOnline: true,
        lastSeen: data.lastSeen || new Date().toISOString()
      });
    });

    // Listen for contact offline event
    newSocket.on('contact_offline', (data: any) => {
      console.log('🔴 Contact offline:', data);
      setContactStatus({
        isOnline: false,
        lastSeen: data.lastSeen || new Date().toISOString()
      });
    });

    // Listen for typing indicator
    newSocket.on('contact_typing', (data: any) => {
      console.log('✍️ Contact typing:', data);
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    });

    // Listen for typing stopped
    newSocket.on('contact_typing_stopped', () => {
      console.log('⏹️ Contact stopped typing');
      setIsTyping(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 🔴 FETCH CONVERSATIONS WHEN PHONE CHANGES
  useEffect(() => {
    if (selectedPhoneId) {
      setIsLoading(true);
      fetchConversations();
      const interval = setInterval(fetchConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedPhoneId, fetchConversations]);

  // 🔴 FETCH MESSAGES WHEN CONVERSATION CHANGES
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id, selectedConversation.phoneNumberId);
      
      // Fetch contact name from backend
      fetchContactName(selectedConversation.userPhone);
      
      // Fetch contact status from API
      fetchContactStatus(selectedConversation.userPhone, selectedConversation._id);
      
      // Subscribe to conversation room
      socket?.emit('join_conversation', selectedConversation._id);

      // Emit to get contact status via socket
      socket?.emit('get_contact_status', {
        conversationId: selectedConversation._id,
        userPhone: selectedConversation.userPhone
      });
      
      return () => {
        socket?.emit('leave_conversation', selectedConversation._id);
      };
    } else {
      // Reset display name when no conversation selected
      setDisplayName(null);
    }
  }, [selectedConversation, socket, fetchMessages, fetchContactStatus, fetchContactName]);

  // 🔴 TRACK CONTACT STATUS UPDATES
  useEffect(() => {
    if (selectedConversation && socket) {
      // Poll contact status every 15 seconds via API
      const statusInterval = setInterval(() => {
        fetchContactStatus(selectedConversation.userPhone, selectedConversation._id);
      }, 15000);

      return () => clearInterval(statusInterval);
    }
  }, [selectedConversation, socket, fetchContactStatus]);

  // 🔴 AUTO SCROLL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Render message content
  const renderMessageContent = (message: Message) => {
    const { content, messageType } = message;
    
    switch (messageType) {
      case 'image':
        return (
          <div className="max-w-xs">
            <img src={content.url} alt="Image" className="rounded-lg w-full" />
            {content.caption && <p className="text-sm mt-1">{content.caption}</p>}
          </div>
        );
      case 'video':
        return (
          <div className="max-w-xs">
            <video src={content.url} controls className="rounded-lg w-full" />
            {content.caption && <p className="text-sm mt-1">{content.caption}</p>}
          </div>
        );
      case 'audio':
        return (
          <div className="w-64">
            <audio src={content.url} controls className="w-full" />
          </div>
        );
      case 'document':
        return (
          <a href={content.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 underline">
            <Download className="h-4 w-4" />
            {content.filename || 'Document'}
          </a>
        );
      default:
        return <p className="text-sm break-words">{content.text}</p>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* SIDEBAR - Chat List */}
      <div className={`${isMobileView && selectedConversation ? 'hidden' : 'w-full md:w-96 lg:w-80'} bg-white border-r border-gray-200 flex flex-col`}>
          {/* Header with gradient */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h1 className="text-2xl font-bold text-gray-900">💬 Live Chat</h1>
            <p className="text-xs text-gray-600 mt-1">Real-time messaging</p>
          </div>

          {/* Phone Selector */}
          <div className="p-3 border-b border-gray-200">
            <select
              value={selectedPhoneId}
              onChange={(e) => setSelectedPhoneId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            >
              <option value="">Select phone number</option>
              {phoneNumbers.map(phone => (
                <option key={phone.phoneNumberId} value={phone.phoneNumberId}>
                  {phone.displayPhone} {phone.isActive ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-pulse text-sm text-gray-500">Loading chats...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations
                .filter(conv => conv.userPhone.includes(searchQuery))
                .map(conv => {
                  const contactName = contactNamesMap[conv.userPhone] || conv.userPhone;
                  return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full p-4 border-b border-gray-100 hover:bg-gray-50 text-left transition duration-150 active:bg-gray-100"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{contactName}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessagePreview}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(conv.lastMessageAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {conv.unreadCount && conv.unreadCount > 0 ? (
                          <div className="mt-1 inline-block bg-green-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
                })
            )}
          </div>
      </div>

      {/* MAIN CHAT AREA - Show on Desktop when selected, or Mobile when selected */}
      {selectedConversation && (
        <div className="flex-1 flex flex-col bg-white w-full h-full overflow-hidden">
          {/* Header with gradient */}
          <div className="flex-shrink-0 sticky top-0 z-50 flex items-center justify-between p-3 md:p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              {isMobileView && (
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg flex-shrink-0 md:hidden"
                  title="Back to chats"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm md:text-base truncate">
                    {contactNamesMap[selectedConversation.userPhone] || selectedConversation.userPhone}
                  </p>
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${contactStatus?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-xs text-gray-500">
                  {isTyping ? (
                    <span className="text-blue-600 font-medium">Typing...</span>
                  ) : contactStatus?.isOnline ? (
                    'Online now'
                  ) : (
                    `Last seen ${contactStatus?.lastSeen ? formatLastSeen(contactStatus.lastSeen) : 'long ago'}`
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex gap-1 md:gap-2 flex-shrink-0">
              <button className="p-2 hover:bg-gray-200 rounded-full transition" title="Call">
                <Phone className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-full transition" title="Video">
                <Video className="h-5 w-5 text-gray-600" />
              </button>
              <button 
                onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                className="p-2 hover:bg-gray-200 rounded-full transition"
                title="More options"
              >
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1 md:space-y-2 bg-gradient-to-b from-gray-50 to-white"
            onScroll={(e) => {
              const target = e.currentTarget;
              if (target.scrollTop === 0 && hasMoreMessages) {
                loadMoreMessages();
              }
            }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-5xl mb-3">💬</div>
                  <p className="text-gray-500 font-medium">No messages yet</p>
                  <p className="text-xs text-gray-400 mt-1">Start a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const showDate = idx === 0 || new Date(messages[idx - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                  const isOutbound = msg.direction === 'outbound';
                  
                  return (
                    <div key={msg._id}>
                      {showDate && (
                        <div className="flex justify-center my-3 md:my-4">
                          <span className="text-xs bg-white text-gray-500 px-3 py-1 rounded-full border border-gray-200 font-medium">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`flex relative group ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-xs md:max-w-md px-3 md:px-4 py-2 rounded-2xl shadow-sm hover:shadow-md transition ${
                            isOutbound
                              ? 'bg-gradient-to-r from-green-400 to-green-500 text-white rounded-br-none'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                          }`}
                          onMouseEnter={() => setShowMessageMenu(msg._id)}
                          onMouseLeave={() => setShowMessageMenu(null)}
                        >
                          {msg.direction === 'inbound' && msg.senderName && (
                            <p className="text-xs font-semibold text-green-700 mb-1 opacity-80">{msg.senderName}</p>
                          )}
                          {renderMessageContent(msg)}
                          <div className="flex items-center gap-1 mt-1 text-xs justify-between">
                            <span className={isOutbound ? 'text-green-100' : 'text-gray-500'}>
                              {formatTime(msg.createdAt)}
                            </span>
                            {isOutbound && (
                              <span className="ml-1">
                                {getStatusIcon(msg)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {showMessageMenu === msg._id && (
                          <button 
                            className="absolute -top-10 right-0 p-2 hover:bg-gray-200 rounded-lg bg-white border border-gray-200 shadow-lg"
                            onClick={() => {}}
                            title="Message options"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* File Preview */}
          {showFilePreview && (
            <div className="flex-shrink-0 sticky bottom-20 z-30 p-3 md:p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-3 items-end bg-white rounded-lg p-3 border border-gray-200">
                {showFilePreview.preview && (
                  <img src={showFilePreview.preview} alt="Preview" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                )}
                {!showFilePreview.preview && (
                  <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{showFilePreview.file.name}</p>
                  <p className="text-xs text-gray-500">{(showFilePreview.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowFilePreview(null)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition"
                    title="Cancel"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => sendFile(showFilePreview.file)}
                    disabled={isSending}
                    className="p-2 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                    title="Send"
                  >
                    <Send className="h-5 w-5 text-green-500" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 sticky bottom-0 z-40 p-2 md:p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2 items-end">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                title="Emojis"
              >
                <Smile className="h-5 w-5 text-gray-600" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                title="Attach file"
              >
                <Paperclip className="h-5 w-5 text-gray-600" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type message... (Shift+Enter for new line)"
                  rows={1}
                  className="w-full p-2 md:p-3 border border-gray-300 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 transition max-h-24"
                />
              </div>

              <button
                onClick={sendMessage}
                disabled={isSending || !newMessage.trim()}
                className="p-2 hover:bg-green-100 rounded-full transition disabled:opacity-50 flex-shrink-0"
                title="Send message"
              >
                <Send className="h-5 w-5 text-green-500" />
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-2 absolute bottom-20 left-2 right-2 md:left-auto md:right-4 z-50 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {['😀', '😂', '❤️', '😍', '🔥', '👍', '😭', '😱', '🎉', '💯', '👏', '🙏', '😊', '😘', '🤔', '😎', '🤩', '😴', '🤮', '😡', '😠', '🥺'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewMessage(newMessage + emoji);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg text-xl transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMPTY STATE - Show on Desktop when no conversation selected */}
      {!selectedConversation && !isMobileView && (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-gray-600 font-semibold text-lg">Select a conversation</p>
            <p className="text-gray-400 text-sm mt-1">to start messaging</p>
          </div>
        </div>
      )}

      {/* Details Panel (only on desktop) */}
      {showDetailsPanel && selectedConversation && (
        <div className="hidden lg:flex w-72 bg-white border-l border-gray-200 flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Conversation Info</h2>
            <button onClick={() => setShowDetailsPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Phone Number</p>
              <p className="font-semibold text-gray-900 break-all">{selectedConversation.userPhone}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${contactStatus?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <p className={`text-sm font-medium ${contactStatus?.isOnline ? 'text-green-700' : 'text-gray-600'}`}>
                  {isTyping ? 'Typing...' : contactStatus?.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Last Message</p>
              <p className="text-sm text-gray-700">{new Date(selectedConversation.lastMessageAt).toLocaleString()}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Recent Messages</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {messages.slice(-5).map((msg) => (
                  <div key={msg._id} className="p-2 bg-gray-50 rounded text-xs text-gray-700 border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-0.5">{msg.direction === 'outbound' ? 'You' : 'Contact'}</p>
                    <p className="line-clamp-2">{msg.content.text || `[${msg.messageType.toUpperCase()}]`}</p>
                    <p className="text-gray-500 text-xs mt-1">{formatTime(msg.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Priority */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Priority</p>
              <select
                value={contactPriority}
                onChange={(e) => setContactPriority(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            {/* Assign to Agent */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Assign Agent</p>
              <select
                value={assignedAgent || ''}
                onChange={(e) => setAssignedAgent(e.target.value || null)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">None</option>
                <option value="me">Me</option>
              </select>
            </div>

            {/* Add to Contacts */}
            <button 
              onClick={() => setShowAddContactModal(true)}
              className="w-full py-2 px-3 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition"
            >
              + Add to Contacts
            </button>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Add to Contacts</h3>
              <p className="text-sm text-gray-600 mt-1">Save this contact with a name</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Phone Number</p>
              <p className="text-sm font-medium text-gray-900 p-2 bg-gray-50 rounded border border-gray-200">
                {selectedConversation?.userPhone}
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Enter contact name..."
                className="w-full mt-2 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowAddContactModal(false);
                  setContactName('');
                }}
                className="flex-1 py-2 px-3 border border-gray-300 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                disabled={isAddingContact || !contactName.trim()}
                className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition"
              >
                {isAddingContact ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
