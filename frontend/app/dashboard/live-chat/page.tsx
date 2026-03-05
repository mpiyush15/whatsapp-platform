'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, MoreVertical, Phone, Video, Plus, Loader, X, MessageSquare, Paperclip, Image, FileText, Music, Settings, Edit2, Save, ChevronDown } from 'lucide-react';
import axios from 'axios';
import io, { Socket } from 'socket.io-client';

interface Conversation {
  _id: string;
  userName: string;
  userPhone: string;
  userProfileName?: string;
  status: 'open' | 'closed';
  tags: string[];
  unreadCount: number;
  lastMessagePreview?: string;
  updatedAt: string;
  assignedAgentId?: string;
  priority: string;
  messageCount: number;
  contactId?: {
    _id: string;
    name: string;
    phone: string;
    profilePictureUrl?: string;
  };
}

interface Message {
  _id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | string;
  createdAt: string;
  senderType: 'agent' | 'customer';
  isInternalNote: boolean;
  messageType?: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template' | string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export default function LiveChat() {
  const searchParams = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [contactTags, setContactTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'pending' | 'assigned_to_me' | 'unassigned' | 'closed'>('all');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; content: string }>>([
    { id: '1', name: '/welcome', content: 'Welcome to our service! How can I help you today?' },
    { id: '2', name: '/order_status', content: 'Thank you for your inquiry. Let me check your order status.' },
    { id: '3', name: '/payment_link', content: 'Here is your payment link: {payment_link}' },
    { id: '4', name: '/delivery_info', content: 'Your order will be delivered by {delivery_date}' }
  ]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<Array<{ phoneNumberId: string; displayName: string; phoneNumber: string; isActive: boolean }>>([]);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ id: string; name: string; content: string } | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  const [contactName, setContactName] = useState('');
  const [editingContactName, setEditingContactName] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'open' | 'closed' | 'pending'>('closed');

  useEffect(() => {
    fetchPhoneNumbers();
    fetchTemplates();
    
    // Initialize socket connection
    const socketURL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5050';
    const token = getAuthToken();
    
    console.log('🔌 Initializing Socket.IO:', { url: socketURL, hasToken: !!token });
    
    const newSocket = io(socketURL, {
      auth: {
        token: token || ''
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      // Join account room to receive account-wide events
      const token = getAuthToken();
      let accountId = 'unknown';
      try {
        if (token && token.includes('.')) {
          accountId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).accountId;
        }
      } catch (e) {
        console.warn('Could not decode token for accountId');
      }
      console.log('📍 Joining account room:', accountId);
      newSocket.emit('join_account', accountId);
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
    });

    newSocket.on('message_status_update', (data: { messageId: string; status: string }) => {
      console.log('📊 Message status updated:', data);
      setMessages(prevMsgs =>
        prevMsgs.map(msg =>
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    });

    newSocket.on('new_message', (data: any) => {
      console.log('📨 New message via Socket.io:', data);
      if (data.conversationId === selectedConversation && data.message) {
        setMessages(prevMsgs => [...prevMsgs, data.message]);
      }
      fetchConversations();
    });

    newSocket.on('message.received', (data: any) => {
      console.log('📥 Message received event:', data);
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation);
      }
    });

    newSocket.on('message.sent', (data: any) => {
      console.log('📤 Message sent via broadcastSentMessage:', data);
      fetchConversations();
      if (selectedConversation && data.conversationId === selectedConversation) {
        fetchMessages(selectedConversation);
      }
    });

    newSocket.on('message_sent', (data: any) => {
      console.log('📤 Message sent event:', data);
      if (data.conversationId === selectedConversation && data.message) {
        setMessages(prevMsgs => [...prevMsgs, data.message]);
      }
      fetchConversations();
    });

    newSocket.on('message_received', (data: { conversationId: string; message: Message }) => {
      console.log('📨 New message received:', data);
      if (data.conversationId === selectedConversation) {
        setMessages(prevMsgs => [...prevMsgs, data.message]);
      }
      // Update conversation list
      fetchConversations();
    });

    newSocket.on('message_status_updated', (data: any) => {
      console.log('📊 Message status updated:', data);
      if (data.conversationId === selectedConversation && data.messageId) {
        setMessages(prevMsgs =>
          prevMsgs.map(msg =>
            msg._id === data.messageId ? { ...msg, status: data.status } : msg
          )
        );
      }
    });

    newSocket.on('message_read_by_customer', (data: any) => {
      console.log('👁️ Message read by customer:', data);
      if (data.conversationId === selectedConversation && data.messageId) {
        setMessages(prevMsgs =>
          prevMsgs.map(msg =>
            msg._id === data.messageId ? { ...msg, status: 'read' } : msg
          )
        );
      }
    });

    newSocket.on('conversation_update', (data: any) => {
      console.log('🔄 Conversation updated:', data);
      fetchConversations();
    });

    newSocket.on('conversation_updated', (data: any) => {
      console.log('🔄 Conversation updated (alt):', data);
      fetchConversations();
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    setSocket(newSocket);

    // Also try to fetch conversations immediately
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
    
    console.log('📡 Fetching conversations from:', baseURL);
    
    const fetchInitialConversations = async () => {
      try {
        const response = await axios.get(`${baseURL}/live-chat/conversations`, {
          params: { limit: 50, offset: 0 },
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
          timeout: 10000
        });
        console.log('✅ Conversations fetched:', response.data.data?.length || 0, 'conversations');
        if (response.data.success && response.data.data) {
          setConversations(response.data.data);
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch conversations:', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          data: err.response?.data
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialConversations();
    
    // Set up polling to refresh conversations every 5 seconds
    const conversationPollInterval = setInterval(() => {
      fetchInitialConversations();
    }, 5000);

    // Cleanup
    return () => {
      newSocket.disconnect();
      clearInterval(conversationPollInterval);
    };
  }, []);

  useEffect(() => {
    if (selectedConversation && socket) {
      console.log('📍 Joining conversation room:', selectedConversation);
      const token = getAuthToken();
      const accountId = token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).accountId : 'unknown';
      
      // Join the conversation room for real-time updates
      socket.emit('join_conversation', accountId, selectedConversation);
      
      fetchMessages(selectedConversation);
      // Initialize tags from selected conversation
      const conv = conversations.find(c => c._id === selectedConversation);
      setContactTags(conv?.tags || []);
      setContactName(conv?.userName || '');
      setConversationStatus((conv?.status as 'open' | 'closed' | 'pending') || 'closed');
      setNewTag('');
      setNoteText('');
      setShowAddNote(false);
      setEditingContactName(false);
    }
  }, [selectedConversation, socket]);

  // Handle phone parameter from URL
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam && conversations.length > 0) {
      const decodedPhone = decodeURIComponent(phoneParam);
      const conversation = conversations.find(c => 
        c.userPhone === decodedPhone || 
        c.userPhone?.replace(/\D/g, '') === decodedPhone.replace(/\D/g, '')
      );
      
      if (conversation) {
        console.log('🔍 Found conversation for phone:', decodedPhone, conversation._id);
        setSelectedConversation(conversation._id);
      }
    }
  }, [conversations, searchParams]);

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
        const formattedPhones = response.data.data.map((p: any) => ({
          phoneNumberId: p.phoneNumberId,
          displayName: p.displayName || p.phoneNumber || p.number,
          phoneNumber: p.phoneNumber || p.number,
          isActive: p.isActive || false
        }));
        setPhoneNumbers(formattedPhones);
        
        const activePhone = formattedPhones.find(p => p.isActive) || formattedPhones[0];
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

  const updateContactTags = async (tags: string[]) => {
    if (!selectedConversation) return;
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      console.log('🏷️  Updating tags:', { tags, token: token ? '✅' : '❌' });
      
      const response = await axios.patch(`${baseURL}/live-chat/conversations/${selectedConversation}`, {
        tags
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      console.log('✅ Tags updated:', response.data);
    } catch (error: any) {
      console.error('❌ Error updating contact tags:', error.response?.data || error.message);
    }
  };

  const saveInternalNote = async (note: string) => {
    if (!selectedConversation || !note.trim()) return;
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      await axios.post(`${baseURL}/live-chat/conversations/${selectedConversation}/notes`, {
        content: note,
        isInternal: true
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const insertTemplate = (template: typeof templates[0]) => {
    setMessageInput(template.content);
    setShowTemplates(false);
  };

  const fetchTemplates = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      const response = await axios.get(`${baseURL}/live-chat/conversations/quick-replies`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.data.success && response.data.data) {
        setTemplates(response.data.data.map((t: any) => ({
          id: t._id || t.id,
          name: t.name,
          content: t.content
        })));
      }
    } catch (error) {
      console.error('Error fetching quick replies:', error);
      // Keep default quick replies if API fails
    }
  };

  const getMessageTypeFromFile = (file: File): string => {
    const mimeType = file.type;
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.startsWith('application/')) return 'document';
    return 'document';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    setSelectedFile(file);
    setUploadingFile(true);
    setUploadProgress(0);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      const formData = new FormData();
      
      formData.append('file', file);
      formData.append('conversationId', selectedConversation);
      formData.append('messageType', getMessageTypeFromFile(file));

      const response = await axios.post(`${baseURL}/live-chat/upload`, formData, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        }
      });

      if (response.data.success) {
        // Send the file as a message
        await axios.post(`${baseURL}/live-chat/messages`, {
          conversationId: selectedConversation,
          content: response.data.mediaUrl,
          messageType: getMessageTypeFromFile(file),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          mediaUrl: response.data.mediaUrl
        }, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });

        fetchMessages(selectedConversation);
        setSelectedFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      setSelectedFile(null);
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const changeConversationStatus = async (newStatus: 'open' | 'closed' | 'pending') => {
    if (!selectedConversation) return;
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      console.log('🔄 Changing conversation status:', { status: newStatus, token: token ? '✅' : '❌' });
      
      const response = await axios.patch(`${baseURL}/live-chat/conversations/${selectedConversation}`, {
        status: newStatus
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      console.log('✅ Status changed:', response.data);
      setConversationStatus(newStatus);
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv._id === selectedConversation
            ? { ...conv, status: newStatus as any }
            : conv
        )
      );
    } catch (error: any) {
      console.error('❌ Error changing conversation status:', error.response?.data || error.message);
      alert(`Failed to change status: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateContactName = async (newName: string) => {
    if (!selectedConversation || !newName.trim()) return;
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      console.log('📝 Updating contact name:', { name: newName, token: token ? '✅' : '❌' });
      
      const response = await axios.patch(`${baseURL}/live-chat/conversations/${selectedConversation}`, {
        userName: newName.trim()
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      console.log('✅ Contact name updated:', response.data);
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv._id === selectedConversation
            ? { ...conv, userName: newName.trim() }
            : conv
        )
      );
      setEditingContactName(false);
    } catch (error: any) {
      console.error('❌ Error updating contact name:', error.response?.data || error.message);
      alert(`Failed to update contact name: ${error.response?.data?.message || error.message}`);
    }
  };

  const addTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      alert('Please fill in all template fields');
      return;
    }

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      
      console.log('➕ Creating quick reply:', { name: newTemplate.name, token: token ? '✅' : '❌' });
      
      const response = await axios.post(`${baseURL}/live-chat/conversations/quick-replies`, {
        name: newTemplate.name,
        content: newTemplate.content,
        category: 'General',
        messageType: 'text'
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      console.log('✅ Quick reply created:', response.data);
      if (response.data.success) {
        setTemplates([...templates, {
          id: response.data.data._id,
          name: newTemplate.name,
          content: newTemplate.content
        }]);
        setNewTemplate({ name: '', content: '' });
      }
    } catch (error: any) {
      console.error('❌ Error adding quick reply:', error.response?.data || error.message);
      alert(`Failed to add quick reply: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
      const token = getAuthToken();
      await axios.delete(`${baseURL}/live-chat/conversations/quick-replies/${templateId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
    } catch (error) {
      console.error('Error deleting quick reply:', error);
    }
    setTemplates(templates.filter(t => t.id !== templateId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFilteredConversations = () => {
    let filtered = conversations;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(conv => {
        if (filterStatus === 'assigned_to_me') {
          return conv.assignedAgentId; // Assume current user is assigned
        }
        if (filterStatus === 'unassigned') {
          return !conv.assignedAgentId;
        }
        return conv.status === filterStatus;
      });
    }
    
    return filtered;
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'read':
        return <span className="text-blue-500">✓✓</span>;
      case 'delivered':
        return <span className="text-gray-600">✓✓</span>;
      case 'sent':
      default:
        return <span className="text-gray-400">✓</span>;
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const updatedTags = [...contactTags, newTag.trim()];
      setContactTags(updatedTags);
      setNewTag('');
      
      // Update conversation tags in state
      if (selectedConversation) {
        setConversations(prevConvs => 
          prevConvs.map(conv => 
            conv._id === selectedConversation 
              ? { ...conv, tags: updatedTags }
              : conv
          )
        );
        // Call API to update tags
        updateContactTags(updatedTags);
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = contactTags.filter(tag => tag !== tagToRemove);
    setContactTags(updatedTags);
    
    // Update conversation tags in state
    if (selectedConversation) {
      setConversations(prevConvs => 
        prevConvs.map(conv => 
          conv._id === selectedConversation 
            ? { ...conv, tags: updatedTags }
            : conv
        )
      );
      // Call API to update tags
      updateContactTags(updatedTags);
    }
  };

  const addNote = () => {
    if (noteText.trim()) {
      saveInternalNote(noteText);
      setNoteText('');
      setShowAddNote(false);
    }
  };

  const selectedConvData = conversations.find((c) => c._id === selectedConversation);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Plus size={20} className="text-green-500" />
        </button>
      </div>

      {/* Conversation List - Mobile: Full screen, Desktop: Sidebar */}
      <div className={`${showConversationList ? 'flex' : 'hidden'} md:flex w-full md:w-72 flex-shrink-0 border-r border-gray-200 flex-col bg-white overflow-hidden`}>
        {/* Desktop Header */}
        <div className="hidden md:flex h-16 px-4 items-center justify-between border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowTemplateSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
              title="Template Settings"
            >
              <Settings size={18} className="text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition">
              <Plus size={20} className="text-green-500" />
            </button>
          </div>
        </div>

        {/* Phone Number Selector */}
        {phoneNumbers.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
            <label className="text-xs font-semibold text-gray-700 block mb-2">📱 WhatsApp Number</label>
            <select
              value={phoneNumberId || ''}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Numbers</option>
              {phoneNumbers.map(phone => (
                <option key={phone.phoneNumberId} value={phone.phoneNumberId}>
                  {phone.displayName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyUp={() => fetchConversations()}
              className="w-full px-3 py-2 pl-10 bg-gray-100 border border-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-2 py-2 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-1">
            {[
              { id: 'all', label: 'All', icon: '📋' },
              { id: 'open', label: 'Open', icon: '🟢' },
              { id: 'pending', label: 'Pending', icon: '🟡' },
              { id: 'assigned_to_me', label: 'Assigned', icon: '👤' },
              { id: 'unassigned', label: 'Unassigned', icon: '❓' },
              { id: 'closed', label: 'Closed', icon: '⚫' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id as any)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  filterStatus === filter.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="animate-spin text-green-500" size={24} />
            </div>
          ) : getFilteredConversations().length > 0 ? (
            getFilteredConversations().map((conv) => (
              <button
                key={conv._id}
                onClick={() => {
                  setSelectedConversation(conv._id);
                  setShowConversationList(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3 ${
                  selectedConversation === conv._id ? 'bg-green-50' : ''
                }`}
              >
                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {getInitials(conv.userName || conv.userPhone)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{conv.userName || conv.userPhone || 'Unknown'}</h4>
                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                        conv.status === 'open' ? 'bg-green-100 text-green-700' :
                        conv.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {conv.status === 'open' ? '🟢 Open' : conv.status === 'closed' ? '⚫ Closed' : '🟡 Pending'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatDate(conv.updatedAt || new Date().toISOString())}</span>
                  </div>
                  {conv.lastMessagePreview && (
                    <p className="text-xs text-gray-600 truncate mt-0.5">{conv.lastMessagePreview}</p>
                  )}
                </div>

                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {conv.unreadCount}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 p-4">
              <p className="text-center text-sm">No messages with this filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden'} md:flex w-full flex-col bg-white overflow-hidden`}>
        {selectedConvData ? (
          <>
            {/* Chat Header */}
            <div className="h-14 md:h-16 border-b border-gray-200 px-3 md:px-4 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-2 md:gap-3 flex-1">
                <button 
                  onClick={() => setShowConversationList(true)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition -ml-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-9 h-9 md:w-10 md:h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                  {getInitials(selectedConvData?.userName || selectedConvData?.userPhone)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 text-sm truncate">{selectedConvData?.userName || selectedConvData?.userPhone || 'Chat'}</h2>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition hidden sm:block">
                  <Phone size={16} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition hidden sm:block">
                  <Video size={16} className="text-gray-600" />
                </button>
                <button 
                  onClick={() => setDetailsPanelOpen(!detailsPanelOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <MoreVertical size={16} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 md:px-4 py-2 md:py-2 flex flex-col gap-2 bg-gray-50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="animate-spin text-green-500" size={20} />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.messageType === 'image' && msg.mediaUrl ? (
                      <div className={`max-w-xs rounded-xl overflow-hidden ${msg.direction === 'outbound' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                        <img 
                          src={msg.mediaUrl} 
                          alt="Message image" 
                          className="max-w-xs h-auto max-h-80"
                        />
                        <div className={`px-3 py-2 text-xs ${msg.direction === 'outbound' ? 'bg-green-500 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {msg.direction === 'outbound' && (
                            <span className="ml-2 font-semibold">{getMessageStatusIcon(msg.status)}</span>
                          )}
                        </div>
                      </div>
                    ) : msg.messageType === 'video' && msg.mediaUrl ? (
                      <div className={`max-w-xs rounded-xl overflow-hidden ${msg.direction === 'outbound' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                        <video 
                          src={msg.mediaUrl} 
                          controls 
                          className="max-w-xs h-auto max-h-80"
                        />
                        <div className={`px-3 py-2 text-xs ${msg.direction === 'outbound' ? 'bg-green-500 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {msg.direction === 'outbound' && (
                            <span className="ml-2 font-semibold">{getMessageStatusIcon(msg.status)}</span>
                          )}
                        </div>
                      </div>
                    ) : msg.messageType === 'audio' && msg.mediaUrl ? (
                      <div className={`max-w-xs px-3 py-2 rounded-xl ${msg.direction === 'outbound' ? 'bg-green-500 rounded-br-none' : 'bg-white rounded-bl-none border border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <Music size={16} className={msg.direction === 'outbound' ? 'text-white' : 'text-green-500'} />
                          <audio 
                            src={msg.mediaUrl} 
                            controls 
                            className="w-40"
                          />
                        </div>
                        <p className={`text-xs mt-2 ${msg.direction === 'outbound' ? 'text-white opacity-70' : 'text-gray-600'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {msg.direction === 'outbound' && (
                            <span className="ml-2 font-semibold">{getMessageStatusIcon(msg.status)}</span>
                          )}
                        </p>
                      </div>
                    ) : msg.messageType === 'document' && msg.mediaUrl ? (
                      <a
                        href={msg.mediaUrl}
                        download={msg.fileName}
                        className={`max-w-xs px-3 py-2 rounded-xl ${msg.direction === 'outbound' ? 'bg-green-500 rounded-br-none' : 'bg-white rounded-bl-none border border-gray-200'}`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={16} className={msg.direction === 'outbound' ? 'text-white' : 'text-red-500'} />
                          <div>
                            <p className={`text-xs font-medium truncate max-w-xs ${msg.direction === 'outbound' ? 'text-white' : 'text-gray-900'}`}>
                              {msg.fileName || 'Document'}
                            </p>
                            <p className={`text-xs ${msg.direction === 'outbound' ? 'text-white opacity-70' : 'text-gray-600'}`}>
                              {msg.fileSize && (msg.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <p className={`text-xs mt-2 ${msg.direction === 'outbound' ? 'text-white opacity-70' : 'text-gray-600'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {msg.direction === 'outbound' && (
                            <span className="ml-2 font-semibold">{getMessageStatusIcon(msg.status)}</span>
                          )}
                        </p>
                      </a>
                    ) : (
                      <div
                        className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                          msg.direction === 'outbound'
                            ? 'bg-green-500 text-white rounded-br-none'
                            : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                        }`}
                      >
                        <p className="break-words">{msg.content}</p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {msg.direction === 'outbound' && (
                            <span className="text-xs font-semibold">{getMessageStatusIcon(msg.status)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p className="text-sm">No messages</p>
                </div>
              )}
            </div>

            {/* Input Area - Only show when conversation is selected */}
            {selectedConversation && (
            <div className="h-14 md:h-16 border-t border-gray-200 px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 flex-shrink-0 bg-white">
              <button 
                onClick={() => setShowTemplates(!showTemplates)}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0"
                title="Quick Reply Templates"
              >
                <MessageSquare size={18} />
              </button>
              
              <button 
                onClick={handleAttachmentClick}
                disabled={uploadingFile}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0 disabled:opacity-50"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                disabled={uploadingFile}
              />
              
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
                disabled={uploadingFile}
                className="flex-1 px-3 py-2 bg-gray-100 border border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50"
              />
              
              <button 
                onClick={sendMessage}
                disabled={!messageInput.trim() || uploadingFile}
                className="p-2 md:p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition flex-shrink-0 disabled:opacity-50"
              >
                {uploadingFile ? (
                  <Loader size={16} className="md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Send size={16} className="md:w-5 md:h-5" />
                )}
              </button>
            </div>
            )}

            {/* Upload Progress */}
            {selectedConversation && uploadingFile && uploadProgress > 0 && (
              <div className="h-1 bg-gray-200 border-t border-gray-200">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {/* Templates Modal */}
            {showTemplates && (
              <div className="absolute bottom-20 left-4 md:left-auto bg-white rounded-lg shadow-lg border border-gray-200 w-64 max-h-64 overflow-y-auto z-50">
                <div className="p-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-900 uppercase">Quick Replies</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => insertTemplate(template)}
                      className="w-full text-left px-3 py-2 hover:bg-green-50 transition"
                    >
                      <p className="text-xs font-semibold text-green-600">{template.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{template.content}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            <MessageSquare size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Contact Details Sidebar - WATI Style */}
      {detailsPanelOpen && selectedConvData && (
        <div className="fixed md:relative inset-0 md:inset-auto md:w-80 md:border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0 z-50">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-900 text-sm">Contact Info</h3>
            <button onClick={() => setDetailsPanelOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Contact Profile */}
            <div className="flex flex-col items-center pb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-2xl mb-4">
                {getInitials(selectedConvData?.userName || selectedConvData?.userPhone)}
              </div>
              
              {/* Contact Name - Editable */}
              {editingContactName ? (
                <div className="w-full flex gap-2 items-center justify-center mb-3">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter name"
                    autoFocus
                  />
                  <button
                    onClick={() => updateContactName(contactName)}
                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <Save size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-full text-center mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{contactName || selectedConvData?.userPhone || 'Unknown'}</h3>
                  <button
                    onClick={() => setEditingContactName(true)}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 justify-center mt-1 w-full"
                  >
                    <Edit2 size={12} />
                    Edit Name
                  </button>
                </div>
              )}

              {/* Conversation Status */}
              <div className="w-full mb-3">
                <select
                  value={conversationStatus}
                  onChange={(e) => changeConversationStatus(e.target.value as 'open' | 'closed' | 'pending')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="open">🟢 Open</option>
                  <option value="pending">🟡 Pending</option>
                  <option value="closed">⚫ Closed</option>
                </select>
              </div>
            </div>

            {/* Contact Basic Info */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1 uppercase">Phone</h4>
                <p className="text-sm text-gray-900 break-all font-medium">{selectedConvData?.userPhone || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1 uppercase">Name</h4>
                <p className="text-sm text-gray-900">{selectedConvData?.userName || 'Not Set'}</p>
              </div>
            </div>

            {/* Contact Custom Parameters */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">Contact Custom Parameters</h4>
              <div className="space-y-2">
                <div className="bg-gray-50 rounded border border-gray-200 p-2 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">last_cart_total_value</p>
                    <p className="text-xs text-gray-600">2500</p>
                  </div>
                  <button className="p-1 hover:bg-gray-200 rounded text-gray-400">
                    <X size={14} />
                  </button>
                </div>
                <div className="bg-gray-50 rounded border border-gray-200 p-2 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">last_cart_items</p>
                    <p className="text-xs text-gray-600">Clarke Man's Best...</p>
                  </div>
                  <button className="p-1 hover:bg-gray-200 rounded text-gray-400">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <button className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                + Add Custom Parameter
              </button>
            </div>

            {/* Tags Section */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">Tags</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {contactTags && contactTags.length > 0 ? (
                  contactTags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                      {tag}
                      <button 
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No tags yet</p>
                )}
              </div>
              <input
                type="text"
                placeholder="Add a tag and press Enter"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={addTag}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Contact Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Messages</p>
                <p className="text-xl font-bold text-gray-900">{selectedConvData?.messageCount || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <p className="text-sm font-semibold text-green-600">{selectedConvData?.status || 'unknown'}</p>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">Notes</h4>
              {showAddNote ? (
                <div className="bg-white rounded-lg border border-gray-300 p-3 mb-3">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add your note here..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500 resize-none h-24"
                  />
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={addNote}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition"
                    >
                      Save Note
                    </button>
                    <button 
                      onClick={() => {
                        setShowAddNote(false);
                        setNoteText('');
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 min-h-[80px] mb-3 text-xs text-gray-600">
                    <p>Notes help you keep track of your conversation with customers.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddNote(true)}
                    className="w-full px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    Add Note
                  </button>
                </>
              )}
            </div>

            {/* Inquiry Type */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">Inquiry Type</h4>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>General Inquiry</option>
                <option>Shipping Inquiry</option>
                <option>Payment Inquiry</option>
                <option>Product Inquiry</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Template Settings Modal */}
      {showTemplateSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-bold text-gray-900">Quick Reply Templates</h3>
              <button 
                onClick={() => setShowTemplateSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Add New Template Form */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Create New Template</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Template name (e.g., /welcome)"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <textarea
                    placeholder="Template content..."
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none h-20"
                  />
                  <button
                    onClick={addTemplate}
                    className="w-full px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition"
                  >
                    Add Template
                  </button>
                </div>
              </div>

              {/* Templates List */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Templates</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {templates.length > 0 ? (
                    templates.map(template => (
                      <div key={template.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-green-600">{template.name}</p>
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">{template.content}</p>
                        </div>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="flex-shrink-0 p-1 hover:bg-red-100 rounded text-red-500"
                          title="Delete template"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-4">No templates created yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
