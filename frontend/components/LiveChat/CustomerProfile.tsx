"use client"

import { MessageCircle, Clock, Calendar } from "lucide-react"

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
  conversation: Conversation
}

export default function CustomerProfile({ conversation }: Props) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="p-4">
      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <MessageCircle size={32} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-lg text-gray-900">
          {conversation.userName || 'Unknown'}
        </h3>
        <p className="text-sm text-gray-600">{conversation.userPhone}</p>
      </div>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Status</span>
          <span className={`text-sm px-2 py-1 rounded ${
            conversation.status === 'open'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {conversation.status.charAt(0).toUpperCase() + conversation.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <MessageCircle size={18} className="text-gray-600" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">Conversations</p>
            <p className="font-semibold text-gray-900">1</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Calendar size={18} className="text-gray-600" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">First Contact</p>
            <p className="font-semibold text-sm text-gray-900">
              {formatDate(conversation.lastMessageAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Clock size={18} className="text-gray-600" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">Last Contact</p>
            <p className="font-semibold text-sm text-gray-900">
              {formatDate(conversation.lastMessageAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
          Assign to Me
        </button>
        <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors">
          Resolve Chat
        </button>
        <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors">
          Add Tag
        </button>
      </div>

      {/* Notes */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-semibold text-sm text-gray-900 mb-2">Notes</h4>
        <textarea 
          placeholder="Add internal notes..."
          className="w-full p-2 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
          rows={3}
        />
      </div>
    </div>
  )
}
