"use client"

import { useEffect, useRef } from "react"
import { Check, CheckCheck, AlertCircle } from "lucide-react"
import { Socket } from "socket.io-client"

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
  messages: Message[]
  socket: Socket | null
}

export default function MessageList({ messages, socket }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'sent':
        return <Check size={14} className="text-gray-400" />
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={message._id}
            className={`flex ${message.senderRole === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.senderRole === 'agent'
                  ? 'bg-green-600 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-900 rounded-bl-none'
              }`}
            >
              {/* Media */}
              {message.mediaUrl && (
                <div className="mb-2">
                  {message.mediaType?.startsWith('image') && (
                    <img 
                      src={message.mediaUrl} 
                      alt="Message media" 
                      className="max-w-xs rounded"
                    />
                  )}
                  {message.mediaType?.startsWith('video') && (
                    <video 
                      src={message.mediaUrl} 
                      controls 
                      className="max-w-xs rounded"
                    />
                  )}
                  {message.mediaType === 'document' && (
                    <a 
                      href={message.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      📄 Document
                    </a>
                  )}
                </div>
              )}

              {/* Text */}
              <p className="text-sm break-words">{message.text}</p>

              {/* Status & Time */}
              <div className={`flex items-center justify-between gap-2 mt-1 text-xs ${
                message.senderRole === 'agent' 
                  ? 'text-green-100' 
                  : 'text-gray-500'
              }`}>
                <span>
                  {new Date(message.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {message.senderRole === 'agent' && getStatusIcon(message.status)}
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  )
}
