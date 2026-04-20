"use client"

import { useState, useRef } from "react"
import { Send, Plus, Smile } from "lucide-react"

interface Props {
  onSendMessage: (text: string, mediaUrl?: string, mediaType?: string) => void
}

export default function MessageInput({ onSendMessage }: Props) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (!text.trim()) return

    setLoading(true)
    try {
      await onSendMessage(text)
      setText("")
    } finally {
      setLoading(false)
    }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      // Upload to storage (S3/Cloudinary) - TODO
      // For now, just send with text
      const mediaUrl = URL.createObjectURL(file)
      const mediaType = file.type.split('/')[0] // 'image', 'video', 'audio', 'application'
      
      await onSendMessage(text || '📎 File shared', mediaUrl, mediaType)
      setText("")
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      {/* Message Input */}
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <button 
          onClick={() => fileRef.current?.click()}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          disabled={loading}
        >
          <Plus size={20} />
        </button>
        <input 
          ref={fileRef}
          type="file" 
          hidden 
          onChange={handleMediaUpload}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />

        {/* Text Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 max-h-24"
          disabled={loading}
        />

        {/* Emoji Button (TODO) */}
        <button 
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          disabled={loading}
        >
          <Smile size={20} />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || loading}
          className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 rounded-lg text-white transition-colors"
        >
          <Send size={20} />
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
    </div>
  )
}
