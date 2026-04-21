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
    <div className="flex-1 flex flex-col h-[calc(100vh-0px)] bg-gradient-to-b from-blue-50 to-white overflow-hidden">
      {/* WhatsApp-style Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-1">
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="relative">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle size={24} className="text-white" />
            </div>
            {conversation.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-300 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white truncate">
              {conversation.userName || 'Customer'}
            </h2>
            <p className="text-xs text-green-100">
              {conversation.isOnline ? 'Online now' : conversation.userPhone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition">
            <Phone size={20} className="text-white" />
          </button>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
          >
            <MoreVertical size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area - Full width on mobile */}
        <div className="flex-1 flex flex-col min-w-0">
          <MessageList messages={messages} socket={socket} />
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
