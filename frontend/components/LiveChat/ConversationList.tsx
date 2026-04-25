"use client"

import { useMemo } from "react"
import { useLiveChat } from "@/lib/context/LiveChatContext"

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
  search?: string
  filter?: 'all' | 'unread' | 'open' | 'closed'
}

export default function ConversationList({ 
  conversations, 
  selectedConversation, 
  onSelectConversation,
  loading,
  search = "",
  filter = 'all'
}: Props) {
  // Get filter and search from context (not from props)
  const { filter: contextFilter, setFilter, search: contextSearch } = useLiveChat()
  
  // Use context values for actual filtering
  const activeFilter = contextFilter
  const activeSearch = contextSearch

  const filtered = useMemo(() => {
    return conversations.filter(conv => {
      // Search filter
      if (activeSearch && !conv.userPhone.includes(activeSearch) && !conv.userName?.toLowerCase().includes(activeSearch.toLowerCase())) {
        return false
      }
      
      // Status filter
      if (activeFilter === 'unread' && conv.unreadCount === 0) return false
      if (activeFilter === 'open' && conv.status !== 'open') return false
      if (activeFilter === 'closed' && conv.status !== 'closed') return false
      
      return true
    }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
  }, [conversations, activeSearch, activeFilter])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Filter Buttons - Display only (controlled from topbar) */}
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto bg-white border-b border-gray-200 scrollbar-hide">
        {(['all', 'unread', 'open', 'closed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all font-medium ${
              contextFilter === f
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
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
              className={`px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors active:bg-gray-100 md:hover:bg-gray-100 ${
                selectedConversation?.conversationId === conversation.conversationId
                  ? 'bg-gray-100 md:border-l-4 md:border-l-green-600'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm">
                      {(conversation.userName || conversation.userPhone)[0]?.toUpperCase()}
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {conversation.userName || conversation.userPhone}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {new Date(conversation.lastMessageAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {conversation.lastMessagePreview}
                    </p>
                  </div>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                    {conversation.unreadCount}
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
