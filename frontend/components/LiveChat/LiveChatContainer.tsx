"use client"

import { useState, useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
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

    // Listen for new messages
    newSocket.on('new_message', (data: Message) => {
      console.log('📨 New message:', data)
      if (selectedConversation && data.conversationId === selectedConversation.conversationId) {
        setMessages(prev => [...prev, data])
      }
      // Update conversation preview
      setConversations(prev => prev.map(conv => 
        conv.conversationId === data.conversationId 
          ? { ...conv, lastMessagePreview: data.text, lastMessageAt: new Date(data.createdAt) }
          : conv
      ))
    })

    // Listen for typing indicator
    newSocket.on('customer_typing', (data) => {
      console.log('✍️ Customer typing:', data)
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
      newSocket.disconnect()
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
        setConversations(result.data?.conversations || [])
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/whatsapp/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setMessages(result.data?.messages || [])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    await fetchMessages(conversation.conversationId)
    
    // Emit event to mark as read
    if (socket) {
      socket.emit('mark_read', { conversationId: conversation.conversationId })
    }
  }

  const handleSendMessage = async (text: string, mediaUrl?: string, mediaType?: string) => {
    if (!selectedConversation) return

    try {
      const token = authService.getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/whatsapp/conversations/${selectedConversation.conversationId}/send`, {
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
    <div className="flex h-screen bg-white">
      {/* Sidebar - Conversations */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <ConversationList 
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          loading={loading}
        />
      </div>

      {/* Main Chat Area */}
      {selectedConversation ? (
        <ChatArea 
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          socket={socket}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  )
}
