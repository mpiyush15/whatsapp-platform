"use client"

import { useState } from "react"
import { MessageCircle, Phone, MoreVertical, X } from "lucide-react"
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

interface Props {
  conversation: Conversation
  messages: Message[]
  onSendMessage: (text: string, mediaUrl?: string, mediaType?: string) => void
  socket: Socket | null
}

export default function ChatArea({ 
  conversation, 
  messages, 
  onSendMessage,
  socket 
}: Props) {
  const [showProfile, setShowProfile] = useState(true)

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {conversation.userName || conversation.userPhone}
            </h2>
            <p className="text-xs text-gray-500">{conversation.userPhone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Phone size={20} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <MoreVertical size={20} className="text-gray-600" />
          </button>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className={`p-2 hover:bg-gray-100 rounded-lg ${showProfile ? 'bg-gray-100' : ''}`}
          >
            {showProfile ? <X size={20} /> : <MessageCircle size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          <MessageList messages={messages} socket={socket} />
          <MessageInput onSendMessage={onSendMessage} />
        </div>

        {/* Customer Profile Sidebar */}
        {showProfile && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <CustomerProfile conversation={conversation} />
          </div>
        )}
      </div>
    </div>
  )
}
