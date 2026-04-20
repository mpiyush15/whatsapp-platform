"use client"

import { Search, Filter } from "lucide-react"
import { useState, useMemo } from "react"

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

interface Props {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conv: Conversation) => void
  loading: boolean
}

export default function ConversationList({ 
  conversations, 
  selectedConversation, 
  onSelectConversation,
  loading 
}: Props) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<'all' | 'unread' | 'open' | 'closed'>('all')

  const filtered = useMemo(() => {
    return conversations.filter(conv => {
      // Search filter
      if (search && !conv.userPhone.includes(search) && !conv.userName?.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      
      // Status filter
      if (filter === 'unread' && conv.unreadCount === 0) return false
      if (filter === 'open' && conv.status !== 'open') return false
      if (filter === 'closed' && conv.status !== 'closed') return false
      
      return true
    }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
  }, [conversations, search, filter])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold mb-4">Live Chat Inbox</h1>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'unread', 'open', 'closed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-gray-600">
            {loading ? 'Loading...' : 'No conversations found'}
          </div>
        ) : (
          filtered.map(conversation => (
            <div
              key={conversation.conversationId}
              onClick={() => onSelectConversation(conversation)}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedConversation?.conversationId === conversation.conversationId
                  ? 'bg-green-50 border-l-4 border-l-green-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">
                    {conversation.userName || conversation.userPhone}
                  </p>
                  <p className="text-xs text-gray-500">{conversation.userPhone}</p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="ml-2 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 truncate">
                {conversation.lastMessagePreview}
              </p>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {new Date(conversation.lastMessageAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  conversation.status === 'open'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {conversation.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
