"use client"

import { useState } from "react"
import { MessageCircle, Phone, MoreVertical, X, ArrowLeft } from "lucide-react"
import MessageList from "./MessageList"
import MessageInput from "./MessageInput"
import CustomerProfile from "./CustomerProfile"
import { Socket } from "socket.io-client"

interface Conversation {
  _id: string
  conversationId: string
  userPhone: string
  userName: string
  lastMessagePreview: string
  lastMessageAt: Date
  unreadCount: number
  status: 'open' | 'closed'
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

interface Props {
  conversation: Conversation
  messages: Message[]
  onSendMessage: (text: string, mediaUrl?: string, mediaType?: string) => void
  socket: Socket | null
  onBack?: () => void
}

export default function ChatArea({ 
  conversation, 
  messages, 
  onSendMessage,
  socket,
  onBack
}: Props) {
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* WhatsApp-style Header - Compact */}
      <div className="bg-white border-b border-gray-200 text-gray-900 px-3 py-2 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-0.5 flex-shrink-0 hover:bg-gray-100 rounded">
              <ArrowLeft size={18} className="text-gray-700" />
            </button>
          )}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <MessageCircle size={16} className="text-green-600" />
            </div>
            {conversation.isOnline && (
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 truncate text-sm">
              {conversation.userName || 'Customer'}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {conversation.isOnline ? '🟢 Online' : conversation.userPhone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="p-1 hover:bg-gray-100 rounded-full transition">
            <Phone size={16} className="text-gray-600" />
          </button>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <MoreVertical size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area - Full width on mobile */}
        <div className="flex-1 flex flex-col min-w-0">
          <MessageList messages={messages} socket={socket} conversationId={conversation.conversationId} />
          <MessageInput onSendMessage={onSendMessage} onTyping={(isTyping) => {
            socket?.emit('typing', { conversationId: conversation._id, isTyping })
          }} />
        </div>

        {/* Customer Profile Sidebar - Hidden on mobile */}
        {showProfile && (
          <div className="hidden md:flex md:w-80 border-l border-gray-200 bg-white overflow-y-auto flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Details</h3>
              <button 
                onClick={() => setShowProfile(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <CustomerProfile conversation={conversation} />
          </div>
        )}
      </div>
    </div>
  )
}
