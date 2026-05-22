"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { MessageCircle } from "lucide-react"
import ConversationList from "./ConversationList"
import ChatArea from "./ChatArea"
import { authService } from "@/lib/auth"
import { useLiveChat } from "@/lib/context/LiveChatContext"
import {
  fetchConversations as loadConversationsApi,
  type LiveChatConversation,
} from "@/lib/liveChatApi"
import {
  normalizeLiveChatMessage,
  messageIdsEqual,
  type LiveChatMessage,
} from "@/lib/liveChatMessageUtils"

const CONV_API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"}/integrations/whatsapp/conversations`

const normalizePhoneDigits = (phone: string) => String(phone || '').replace(/\D/g, '')

interface LiveChatContainerProps {
  initialPhone?: string | null
  projectId?: string
}

export default function LiveChatContainer({ initialPhone = null, projectId }: LiveChatContainerProps) {
  const { search, filter, setSearch } = useLiveChat()
  const [conversations, setConversations] = useState<LiveChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<LiveChatConversation | null>(null)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const messageOffsetRef = useRef(0)
  const initialPhoneHandledRef = useRef(false)
  const selectedConversationIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.conversationId ?? null
  }, [selectedConversation?.conversationId])

  const appendMessage = useCallback((raw: unknown, fallbackConversationId?: string) => {
    const msg = normalizeLiveChatMessage(
      (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>,
      fallbackConversationId
    )
    if (!msg) return
    const activeId = selectedConversationIdRef.current
    if (!activeId || !messageIdsEqual(msg.conversationId, activeId)) return

    setMessages((prev) => {
      if (prev.some((m) => messageIdsEqual(m._id, msg._id))) return prev
      return [...prev, msg]
    })

    setConversations((prev) =>
      prev.map((conv) =>
        messageIdsEqual(conv.conversationId, msg.conversationId)
          ? {
              ...conv,
              lastMessagePreview: msg.text || (msg.mediaType ? `📎 ${msg.mediaType}` : conv.lastMessagePreview),
              lastMessageAt: msg.createdAt,
            }
          : conv
      )
    )
  }, [])

  // Initialize Socket.io connection
  useEffect(() => {
    const token = authService.getToken()
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000", {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to live chat server')
      newSocket.emit('subscribe_conversations')
    })

    const handleNewMessage = (data: unknown) => {
      appendMessage(data)
    }
    newSocket.on('new_message', handleNewMessage)

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
      if (data.conversationId === selectedConversationIdRef.current) {
        setMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, status: 'delivered' }
            : msg
        ))
      }
    })

    const handleMessageStatus = (data: {
      conversationId?: string
      messageId?: string
      status?: LiveChatMessage['status']
      timestamp?: string
    }) => {
      if (!data?.messageId || !data.status) return
      const activeConversationId = selectedConversationIdRef.current
      if (data.conversationId && activeConversationId && data.conversationId !== activeConversationId) return

      setMessages(prev => prev.map(msg =>
        msg._id === data.messageId
          ? {
              ...msg,
              status: data.status as LiveChatMessage['status'],
              isRead: data.status === 'read' ? true : msg.isRead,
            }
          : msg
      ))
    }

    newSocket.on('message_status_updated', handleMessageStatus)
    newSocket.on('message_status', handleMessageStatus)

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
      const targetConversationId = data?.conversationId
      if (!targetConversationId && !data?._id) return

      setConversations(prev => prev.map(conv => 
        (conv.conversationId === targetConversationId || conv._id === data?._id)
          ? { ...conv, ...data }
          : conv
      ))
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from live chat server')
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.off('new_message', handleNewMessage)
      newSocket.off('message_status_updated', handleMessageStatus)
      newSocket.off('message_status', handleMessageStatus)
      newSocket.disconnect()
    }
  }, [appendMessage])

  // ✅ Join/Leave conversation rooms when selection changes + update listeners
  useEffect(() => {
    if (!socketRef.current || !selectedConversation) return

    socketRef.current.emit('join_conversation', {
      conversationId: selectedConversation.conversationId
    })
    console.log(`Joined room: ${selectedConversation.conversationId}`)

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_conversation', {
          conversationId: selectedConversation.conversationId
        })
        console.log(`Left room: ${selectedConversation.conversationId}`)
      }
    }
  }, [selectedConversation])

  const showToast = (type: 'error' | 'success', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  const reloadConversations = async () => {
    try {
      setLoading(true)
      const rows = await loadConversationsApi({
        search: search.trim() || undefined,
        status: filter === 'open' || filter === 'closed' ? filter : null,
        assignedToMe: filter === 'mine',
        limit: 100,
      })
      setConversations(rows)
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadConversations()
  }, [search, filter])

  useEffect(() => {
    if (initialPhone) {
      setSearch(normalizePhoneDigits(initialPhone))
    }
  }, [initialPhone, setSearch])

  const handleConversationUpdated = (updates: Partial<LiveChatConversation>) => {
    if (!selectedConversation) return
    const merged = { ...selectedConversation, ...updates }
    setSelectedConversation(merged)
    setConversations((prev) =>
      prev.map((c) =>
        c.conversationId === merged.conversationId ? { ...c, ...updates } : c
      )
    )
  }

  const fetchMessages = async (conversationId: string, limit = 50, offset = 0) => {
    try {
      const token = authService.getToken()
      const response = await fetch(
        `${CONV_API}/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.ok) {
        const result = await response.json()
        
        if (offset === 0) {
          // First load: show last 50 messages in chronological order (oldest first)
          const messages = result.data || []
          setMessages(messages)
          messageOffsetRef.current = limit
        } else {
          // Prepend older messages when scrolling up
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
      // Load 30 more messages when scrolling up
      await fetchMessages(conversationId, 30, messageOffsetRef.current)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSelectConversation = async (conversation: LiveChatConversation) => {
    setSelectedConversation(conversation)
    messageOffsetRef.current = 0
    setHasMore(false)
    setMessages([]) // Clear messages before loading new ones
    // Load only 20 messages initially for faster loading, user can scroll up for more
    await fetchMessages(conversation.conversationId, 50, 0)
    
    // Mark all messages as read and clear unread count
    if (socket && conversation.unreadCount > 0) {
      socket.emit('mark_conversation_read', { 
        conversationId: conversation.conversationId 
      })

      // Fallback API call to guarantee DB reset even if socket event drops
      try {
        const token = authService.getToken()
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/integrations/whatsapp/conversations/${conversation.conversationId}/mark-read`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
      } catch (err) {
        console.error('Error marking conversation as read:', err)
      }
    }
    
    // Update conversation unread count to 0
    setConversations(prev => prev.map(conv => 
      conv.conversationId === conversation.conversationId 
        ? { ...conv, unreadCount: 0 }
        : conv
    ))
  }

  useEffect(() => {
    if (!initialPhone || initialPhoneHandledRef.current || loading || conversations.length === 0) {
      return
    }
    const target = normalizePhoneDigits(initialPhone)
    if (!target) return

    const match =
      conversations.find((c) => normalizePhoneDigits(c.userPhone) === target) ||
      conversations.find((c) => c.conversationId?.endsWith(target))

    if (match) {
      initialPhoneHandledRef.current = true
      handleSelectConversation(match)
    }
  }, [initialPhone, loading, conversations])

  const handleSendMessage = async (
    text: string,
    mediaUrl?: string,
    mediaType?: string
  ): Promise<boolean> => {
    if (!selectedConversation) return false

    try {
      const token = authService.getToken()

      if (mediaUrl && mediaType) {
        console.log(`📤 Preparing to send ${mediaType}...`);
        
        // Convert data URL to blob directly
        const arr = mediaUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        
        if (!arr[1]) {
          showToast('error', 'Invalid media file')
          return false
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
          showToast('error', 'Media file is empty')
          return false
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
          `${CONV_API}/${selectedConversation.conversationId}/send-media`,
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
          try {
            const result = JSON.parse(responseText)
            if (result?.data) {
              appendMessage(result.data, selectedConversation.conversationId)
            }
          } catch {
            /* response may not be JSON */
          }
          return true
        }
        showToast('error', responseText || 'Failed to send media')
        return false
      } else {
        // Send text-only message
        const response = await fetch(
          `${CONV_API}/${selectedConversation.conversationId}/send-message`,
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
          const result = await response.json().catch(() => ({}))
          if (result?.data) {
            appendMessage(result.data, selectedConversation.conversationId)
          }
          return true
        }
        const errBody = await response.json().catch(() => ({}))
        showToast('error', errBody?.message || 'Failed to send message')
        return false
      }
    } catch (err) {
      console.error('❌ Error sending message:', err)
      showToast('error', 'Network error while sending')
      return false
    }
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      {toast && (
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
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
          onConversationUpdated={handleConversationUpdated}
          socket={socket}
          projectId={projectId}
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
