"use client"

import { useState, useRef } from "react"
import { Send, Plus, Smile, X, Loader, ImageIcon, FileIcon } from "lucide-react"

interface Props {
  onSendMessage: (text: string, mediaUrl?: string, mediaType?: string) => void
  onTyping?: (isTyping: boolean) => void
}

export default function MessageInput({ onSendMessage, onTyping }: Props) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const emojiList = "😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😙😜😛🤪😌😔😑😐😶🥱😏😒😞😟😕🙁☹️😲😳🥺😦😧😨😰😥😢😭😱😖😣😩😫🥱😤😡😠🤬😈👿💀💩🤡👹👺👻👽👾🤖😺😸😹😻😼😽🙀😿😾❤️🧡💛💚💙💜🖤🤍🤎💔💕💞💓💗💖💘💝💟👍👎👊👏🙌👐🤝🤜🤛✌️🤞🫰🤟🤘🤙"

  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return
    setLoading(true)
    try {
      if (selectedFile) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const mediaUrl = e.target?.result as string
          const mediaType = selectedFile.type.split('/')[0]
          await onSendMessage(text || '📎 File', mediaUrl, mediaType)
          setText("")
          setSelectedFile(null)
          setFilePreview(null)
          setLoading(false)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        await onSendMessage(text)
        setText("")
        setLoading(false)
      }
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    
    if (onTyping && newText.trim()) {
      onTyping(true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 3000)
    }
  }

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji)
  }

  return (
    <div className="bg-white border-t border-gray-200 p-2 md:p-4 space-y-2">
      {filePreview && selectedFile && (
        <div className="relative inline-block">
          {selectedFile.type.startsWith('image/') && (
            <img src={filePreview} alt="Preview" className="h-20 w-20 rounded object-cover shadow-md" />
          )}
          {selectedFile.type.startsWith('video/') && (
            <video src={filePreview} className="h-20 w-20 rounded object-cover shadow-md" />
          )}
          {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
            <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center shadow-md">
              <FileIcon size={40} className="text-gray-500" />
            </div>
          )}
          <button
            onClick={() => {
              setSelectedFile(null)
              setFilePreview(null)
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button 
          onClick={() => fileRef.current?.click()}
          className="flex-shrink-0 p-2 hover:bg-green-50 rounded-full text-green-600 transition active:bg-green-100"
          disabled={loading}
        >
          <Plus size={22} />
        </button>
        <input 
          ref={fileRef}
          type="file" 
          hidden 
          onChange={handleMediaUpload}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />

        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-4 py-3 md:py-2 bg-gray-50 border-0 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white max-h-24 text-sm md:text-base transition"
          disabled={loading}
        />

        <div className="relative flex-shrink-0">
          <button 
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2 hover:bg-green-50 rounded-full text-green-600 transition active:bg-green-100"
            disabled={loading}
          >
            <Smile size={22} />
          </button>

          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-72 max-h-56 overflow-y-auto z-50">
              <div className="grid grid-cols-8 gap-1">
                {emojiList.split('').map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertEmoji(emoji)}
                    className="text-2xl hover:bg-gray-100 p-1 rounded transition active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !selectedFile) || loading}
          className="flex-shrink-0 p-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 rounded-full text-white transition-colors duration-200"
        >
          {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>

      <p className="text-xs text-gray-400 px-2 hidden md:block">Enter to send • Shift+Enter for new line</p>
    </div>
  )
}
