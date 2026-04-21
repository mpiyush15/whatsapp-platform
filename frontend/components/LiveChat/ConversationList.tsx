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
  isOnline?: boolean
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
      {/* Compact Header with inline search */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex-shrink-0">Messages</h1>
        
        {/* Inline Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto bg-gray-50 border-b border-gray-200 scrollbar-hide">
        {(['all', 'unread', 'open', 'closed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs md:text-sm whitespace-nowrap transition-all font-medium ${
              filter === f
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-gray-600 mt-8">
            {loading ? (
              <div>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
                <p>Loading...</p>
              </div>
            ) : (
              <p>No conversations</p>
            )}
          </div>
        ) : (
          filtered.map(conversation => (
            <div
              key={conversation.conversationId}
              onClick={() => onSelectConversation(conversation)}
              className={`p-3 md:p-4 border-b border-gray-100 cursor-pointer transition-colors active:bg-green-100 md:hover:bg-green-50 ${
                selectedConversation?.conversationId === conversation.conversationId
                  ? 'bg-green-50 md:border-l-4 md:border-l-green-600'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold">
                      {(conversation.userName || conversation.userPhone)[0]?.toUpperCase()}
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {conversation.userName || conversation.userPhone}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{conversation.userPhone}</p>
                  </div>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="ml-2 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 truncate ml-12">
                {conversation.lastMessagePreview}
              </p>
              
              <div className="flex items-center justify-between mt-2 ml-12">
                <span className="text-xs text-gray-500">
                  {new Date(conversation.lastMessageAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {conversation.isOnline && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                    Online
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
