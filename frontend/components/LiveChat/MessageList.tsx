"use client"

import { useEffect, useRef, useState } from "react"
import { Check, CheckCheck, AlertCircle, MessageCircle, Smile } from "lucide-react"
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
  createdAt: Date | string
  reactions?: { emoji: string; count: number }[]
  isRead?: boolean
  timestamp?: Date | string
}

interface Props {
  messages: Message[]
  socket: Socket | null
  isTyping?: boolean
}

export default function MessageList({ messages, socket, isTyping }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡']

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Helper to proxy WhatsApp media URLs through our backend
  const getProxiedMediaUrl = (mediaUrl: string | undefined): string | undefined => {
    if (!mediaUrl) return undefined
    
    // If it's already a proxy URL or data URL, return as-is
    if (mediaUrl.startsWith('/media/') || mediaUrl.startsWith('data:') || mediaUrl.startsWith('media://')) {
      return mediaUrl
    }
    
    // If it's a WhatsApp URL, proxy through our media endpoint
    if (mediaUrl.includes('graph.facebook.com') || mediaUrl.includes('scontent')) {
      const encodedUrl = encodeURIComponent(mediaUrl)
      return `${process.env.NEXT_PUBLIC_API_URL}/media/proxy?url=${encodedUrl}`
    }
    
    return mediaUrl
  }

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

  const handleReaction = (messageId: string, emoji: string) => {
    socket?.emit('add_reaction', { messageId, emoji })
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 scroll-smooth bg-gradient-to-b from-transparent to-blue-50">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm md:text-base">No messages yet</p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.senderRole === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in group`}
            onMouseEnter={() => setHoveredMessageId(message._id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <div className="relative flex flex-col">
              {/* Main Message Bubble */}
              <div
                className={`max-w-[85%] md:max-w-md px-3 md:px-4 py-2 rounded-2xl text-sm md:text-base transition-all ${
                  message.senderRole === 'agent'
                    ? 'bg-green-50 text-gray-900 rounded-br-none shadow-md border border-green-200'
                    : 'bg-white text-gray-900 rounded-bl-none shadow-md border border-gray-100'
                }`}
              >
                {/* Media */}
                {message.mediaUrl && (
                  <div className="mb-2">
                    {(message.mediaType === 'image' || message.mediaType?.startsWith('image')) && (
                      <img 
                        src={getProxiedMediaUrl(message.mediaUrl)} 
                        alt="Message" 
                        className="max-w-full max-h-80 rounded-xl object-cover"
                        onError={(e) => {
                          console.error('Failed to load image:', message.mediaUrl);
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    )}
                    {(message.mediaType === 'video' || message.mediaType?.startsWith('video')) && (
                      <video 
                        src={getProxiedMediaUrl(message.mediaUrl)} 
                        controls 
                        className="max-w-full max-h-80 rounded-xl bg-black"
                        onError={(e) => {
                          console.error('Failed to load video:', message.mediaUrl);
                        }}
                      />
                    )}
                    {(message.mediaType === 'audio' || message.mediaType?.startsWith('audio')) && (
                      <audio 
                        src={getProxiedMediaUrl(message.mediaUrl)} 
                        controls 
                        className="w-full rounded-xl"
                        onError={(e) => {
                          console.error('Failed to load audio:', message.mediaUrl);
                        }}
                      />
                    )}
                    {(message.mediaType === 'document' || message.mediaType?.startsWith('document') || message.mediaType?.startsWith('application')) && (
                      <div className="flex flex-col gap-2">
                        {/* PDF Preview */}
                        {message.mediaUrl?.includes('.pdf') || message.mediaUrl?.startsWith('data:application/pdf') ? (
                          <div className="w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                            <iframe
                              src={getProxiedMediaUrl(message.mediaUrl)}
                              className="w-full h-64 rounded-xl"
                              title="PDF Preview"
                              onError={(e) => {
                                console.error('Failed to load PDF:', message.mediaUrl);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">📄</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Document</p>
                                <p className="text-xs text-gray-600">Click to download</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Download Link */}
                        <a 
                          href={getProxiedMediaUrl(message.mediaUrl)} 
                          download
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-center px-3 py-2 bg-blue-50 border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-100 rounded-lg transition"
                        >
                          ⬇️ Download File
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Text */}
                {message.text && (
                  <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
                )}

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
                  <div className="flex items-center gap-1">
                    {message.senderRole === 'agent' && getStatusIcon(message.status)}
                    {message.isRead && message.senderRole === 'agent' && (
                      <span className="text-xs" title="Read">✓</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 ml-1">
                  {message.reactions.map((reaction, idx) => (
                    <button
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs hover:bg-gray-50 transition shadow-sm"
                      title={`${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
                    >
                      {reaction.emoji} {reaction.count > 1 ? reaction.count : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* Reaction Picker - Show on hover */}
              {hoveredMessageId === message._id && (
                <div className="absolute -top-10 right-0 bg-white border border-gray-200 rounded-full shadow-lg p-1 flex gap-0.5 z-20">
                  {reactionEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(message._id, emoji)}
                      className="hover:scale-125 transition text-lg"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    className="text-sm hover:scale-125 transition"
                    title="More reactions"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex justify-start animate-fade-in">
          <div className="px-4 py-2 bg-gray-200 text-gray-900 rounded-2xl rounded-bl-none shadow-md">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
