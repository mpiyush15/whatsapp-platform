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
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)

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

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = authService.getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live-chat/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setMessages(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    await fetchMessages(conversation.conversationId)
    
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live-chat/conversations/${selectedConversation.conversationId}/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, mediaUrl, mediaType })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Emit via socket for real-time update
        if (socket) {
          socket.emit('send_message', {
            conversationId: selectedConversation.conversationId,
            text,
            mediaUrl,
            mediaType
          })
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
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
    <div className="flex h-screen bg-white overflow-hidden">
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
        <div className="md:hidden w-full">
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
        />
      ) : (
        <div className="hidden md:flex md:flex-1 items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
          <div className="text-center">
            <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 text-lg font-medium">Select a conversation to start</p>
          </div>
        </div>
      )}
    </div>
  )
}
