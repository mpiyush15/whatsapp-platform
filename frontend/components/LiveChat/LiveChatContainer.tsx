"use client"

import { useState, useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { MessageCircle } from "lucide-react"
import ConversationList from "./ConversationList"
import ChatArea from "./ChatArea"
import { authService } from "@/lib/auth"

interface Conversation {
  _id: string
  conversationId: string
  userPhone: string
  userName: string
  lastMessagePreview: string
  lastMessageAt: Date
  unreadCount: number
  status: 'open' | 'closed'
  assignedAgentId?: string
  isOnline?: boolean
}

interface Message {
  _id: string
  conversationId: string
  senderRole: 'customer' | 'agent'
  senderName: string
  text: string
  mediaUrl?: string
  mediaType?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  createdAt: Date
  reactions?: { emoji: string; count: number }[]
  isRead?: boolean
}

export default function LiveChatContainer() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const messageOffsetRef = useRef(0)

  // Initialize Socket.io connection
  useEffect(() => {
    const token = authService.getToken()
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000", {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to live chat server')
    })

    // 🔥 NOTE: new_message listener moved to selectedConversation useEffect
    // This ensures it captures the correct selectedConversation value

    // Listen for conversation preview updates (from any conversation)
    const handleConversationUpdate = (data: Message) => {
      setConversations(prev => prev.map(conv => 
        conv.conversationId === data.conversationId 
          ? { ...conv, lastMessagePreview: data.text || `📎 ${data.mediaType}`, lastMessageAt: new Date(data.createdAt) }
          : conv
      ))
    }
    newSocket.on('new_message', handleConversationUpdate)

    // Listen for typing indicator
    newSocket.on('customer_typing', (data) => {
      console.log('✍️ Customer typing:', data)
    })

    // Listen for agent typing indicator
    newSocket.on('agent_typing', (data) => {
      console.log('✍️ Agent typing:', data)
      // Update UI to show agent typing
    })

    // Listen for message reactions
    newSocket.on('message_reaction', (data) => {
      console.log('😊 Message reaction:', data)
      if (selectedConversation && data.conversationId === selectedConversation.conversationId) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId
            ? {
                ...msg,
                reactions: [
                  ...(msg.reactions || []).filter(r => r.emoji !== data.emoji),
                  { emoji: data.emoji, count: (msg.reactions?.find(r => r.emoji === data.emoji)?.count || 0) + 1 }
                ]
              }
            : msg
        ))
      }
    })

    // Listen for read receipts
    newSocket.on('message_read', (data) => {
      console.log('✓ Message read:', data)
      if (selectedConversation && data.conversationId === selectedConversation.conversationId) {
        setMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, isRead: true, readAt: data.readAt }
            : msg
        ))
      }
    })

    // Listen for message delivered status (double tick)
    newSocket.on('message_delivered', (data) => {
      console.log('✓✓ Message delivered:', data)
      if (selectedConversation && data.conversationId === selectedConversation.conversationId) {
        setMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, status: 'delivered' }
            : msg
        ))
      }
    })

    // Listen for agent status changes (online/offline)
    newSocket.on('agent_status', (data) => {
      console.log('🟢 Agent status:', data)
      // Update conversation list with online status
      if (data.status === 'online') {
        setConversations(prev => prev.map(conv =>
          conv._id === data.conversationId ? { ...conv, isOnline: true } : conv
        ))
      }
    })

    // Listen for conversation updated
    newSocket.on('conversation_updated', (data) => {
      setConversations(prev => prev.map(conv => 
        conv.conversationId === data.conversationId ? data : conv
      ))
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from live chat server')
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.off('new_message', handleConversationUpdate)
      newSocket.disconnect()
    }
  }, [])

  // ✅ Join/Leave conversation rooms when selection changes + update listeners
  useEffect(() => {
    if (!socketRef.current || !selectedConversation) return

    socketRef.current.emit('join_conversation', {
      conversationId: selectedConversation.conversationId
    })
    console.log(`Joined room: ${selectedConversation.conversationId}`)

    // 🔥 UPDATE: Add message listener HERE so it captures current selectedConversation
    const handleNewMessage = (data: Message) => {
      console.log('📨 New message:', data)
      console.log('🎬 Message details - Type:', data.mediaType, 'URL:', data.mediaUrl?.substring(0, 80))
      if (data.conversationId === selectedConversation.conversationId) {
        setMessages(prev => [...prev, data])
      }
    }

    socketRef.current.on('new_message', handleNewMessage)

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message', handleNewMessage)
        socketRef.current.emit('leave_conversation', {
          conversationId: selectedConversation.conversationId
        })
        console.log(`Left room: ${selectedConversation.conversationId}`)
      }
    }
  }, [selectedConversation])

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const token = authService.getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/whatsapp/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('📡 Fetched conversations:', result.data)
        setConversations(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string, limit = 50, offset = 0) => {
    try {
      const token = authService.getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/live-chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.ok) {
        const result = await response.json()
        
        if (offset === 0) {
          // First load: show last 50 messages
          setMessages(result.data || [])
          messageOffsetRef.current = limit
        } else {
          // Prepend older messages
          setMessages(prev => [...(result.data || []), ...prev])
          messageOffsetRef.current += limit
        }
        
        // Check if there are more messages
        setHasMore(result.pagination?.hasMore || false)
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  const fetchMoreMessages = async (conversationId: string) => {
    if (loadingMore || !hasMore) return
    
    try {
      setLoadingMore(true)
      await fetchMessages(conversationId, 50, messageOffsetRef.current)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    messageOffsetRef.current = 0
    setHasMore(false)
    await fetchMessages(conversation.conversationId, 50, 0) // Load last 50 messages
    
    // Mark all messages as read and clear unread count
    if (socket && conversation.unreadCount > 0) {
      socket.emit('mark_conversation_read', { 
        conversationId: conversation.conversationId 
      })
    }
    
    // Update conversation unread count to 0
    setConversations(prev => prev.map(conv => 
      conv.conversationId === conversation.conversationId 
        ? { ...conv, unreadCount: 0 }
        : conv
    ))
  }

  const handleSendMessage = async (text: string, mediaUrl?: string, mediaType?: string) => {
    if (!selectedConversation) return

    try {
      const token = authService.getToken()

      // If there's media (file was selected)
      if (mediaUrl && mediaType) {
        console.log(`📤 Preparing to send ${mediaType}...`);
        
        // Convert data URL to blob directly
        const arr = mediaUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        
        if (!arr[1]) {
          console.error('❌ Invalid data URL - no base64 data');
          return;
        }
        
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const blob = new Blob([u8arr], { type: mime });
        
        console.log(`✅ Blob created: ${(blob.size / 1024).toFixed(2)}KB, MIME: ${mime}`);
        
        if (blob.size === 0) {
          console.error('❌ Blob is empty!');
          return;
        }
        
        // Determine filename from mediaType
        const extension = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'mp3' : 'pdf';
        const filename = `media_${Date.now()}.${extension}`;
        const file = new File([blob], filename, { type: mime });

        console.log(`✅ File created: ${filename} (${(file.size / 1024).toFixed(2)}KB)`);

        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        if (text && text.trim()) {
          formData.append('caption', text);
          console.log(`✅ Caption added: "${text}"`);
        }

        console.log(`📤 Sending to /send-media endpoint...`);

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/live-chat/conversations/${selectedConversation.conversationId}/send-media`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
              // Don't set Content-Type, let browser set it for FormData
            },
            body: formData
          }
        );

        const responseText = await uploadResponse.text();
        console.log(`📥 Response status: ${uploadResponse.status}`);
        console.log(`📥 Response: ${responseText}`);

        if (uploadResponse.ok) {
          console.log('✅ Media message sent successfully');
          // Message will come via socket listener 'new_message' event
        } else {
          console.error('❌ Failed to send media message:', responseText);
        }
      } else {
        // Send text-only message
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/live-chat/conversations/${selectedConversation.conversationId}/send-message`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, mediaUrl, mediaType })
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Message sent successfully');
          // Message will come via socket listener 'new_message' event
        }
      }
    } catch (err) {
      console.error('❌ Error sending message:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* Sidebar - Conversations (Hidden on mobile, visible on desktop) */}
      <div className="hidden md:flex md:w-80 border-r border-gray-200 flex-col flex-shrink-0">
        <ConversationList 
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          loading={loading}
        />
      </div>

      {/* Mobile Conversation List - Visible when no conversation selected */}
      {!selectedConversation && (
        <div className="md:hidden w-full h-full overflow-hidden">
          <ConversationList 
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            loading={loading}
          />
        </div>
      )}

      {/* Main Chat Area (Full width on mobile) */}
      {selectedConversation ? (
        <ChatArea 
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          socket={socket}
          onBack={() => setSelectedConversation(null)}
          onLoadMore={() => fetchMoreMessages(selectedConversation.conversationId)}
          loadingMore={loadingMore}
          hasMore={hasMore}
        />
      ) : (
        <div className="hidden md:flex md:flex-1 items-center justify-center bg-stone-50">
          <div className="text-center">
            <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-900 text-2xl font-bold">Welcome to Replysys</p>
            <p className="text-gray-600 text-lg font-medium mt-2">Start chatting with your customers</p>
          </div>
        </div>
      )}
    </div>
  )
}
