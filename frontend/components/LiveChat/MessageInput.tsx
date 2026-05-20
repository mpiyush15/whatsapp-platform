"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Plus, Smile, X, Loader, ImageIcon, FileIcon, Video, Music, Zap } from "lucide-react"
import { fetchQuickReplies, type QuickReply } from "@/lib/liveChatApi"

interface Props {
  onSendMessage: (text: string, mediaUrl?: string, mediaType?: string) => void | Promise<boolean>
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
  disabledHint?: string
}

export default function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  disabledHint,
}: Props) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const documentRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Use array of emoji objects instead of string for better rendering
  const emojiList = [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", 
    "🤩", "😘", "😗", "😚", "😙", "😜", "😛", "🤪", "😌", "😔", "😑", "😐", "😶", "🥱", "😏", 
    "😒", "😞", "😟", "😕", "🙁", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", 
    "😱", "😖", "😣", "😩", "😫", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "💩", "🤡", "👹", 
    "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "❤️", 
    "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕", "👍", "❤️", "😂", "😮", "😢", "😡"
  ]

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
    setShowMediaMenu(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const triggerImageUpload = () => {
    imageRef.current?.click()
  }

  const triggerVideoUpload = () => {
    videoRef.current?.click()
  }

  const triggerDocumentUpload = () => {
    documentRef.current?.click()
  }

  const triggerFileUpload = () => {
    fileRef.current?.click()
  }

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji)
  }

  useEffect(() => {
    fetchQuickReplies().then(setQuickReplies).catch(() => setQuickReplies([]))
  }, [])

  return (
    <div className="bg-gray-50 px-3 py-2 space-y-1 sticky bottom-0 z-10 flex-shrink-0">
      {disabled && disabledHint && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          {disabledHint}
        </p>
      )}
      {filePreview && selectedFile && (
        <div className="relative inline-block">
          {selectedFile.type.startsWith('image/') && (
            <img src={filePreview} alt="Preview" className="h-14 w-14 rounded object-cover shadow-md" />
          )}
          {selectedFile.type.startsWith('video/') && (
            <video src={filePreview} className="h-14 w-14 rounded object-cover shadow-md" />
          )}
          {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
            <div className="h-14 w-14 bg-gray-200 rounded flex items-center justify-center shadow-md">
              <FileIcon size={32} className="text-gray-500" />
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

      {showQuickReplies && quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pb-1">
          {quickReplies.map((qr) => (
            <button
              key={qr._id}
              type="button"
              disabled={disabled || loading}
              onClick={() => {
                setText(qr.content)
                setShowQuickReplies(false)
              }}
              className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:border-green-400 hover:bg-green-50 disabled:opacity-50"
              title={qr.content}
            >
              {qr.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => setShowQuickReplies(!showQuickReplies)}
          className="flex-shrink-0 p-1.5 hover:bg-gray-200 rounded-full text-gray-600"
          title="Quick replies"
          disabled={loading}
        >
          <Zap size={18} />
        </button>
        <div className="relative flex-shrink-0">
          <button 
            type="button"
            onClick={() => setShowMediaMenu(!showMediaMenu)}
            className="flex-shrink-0 p-1.5 hover:bg-gray-300 rounded-full text-gray-600 transition active:bg-gray-400"
            disabled={loading || disabled}
          >
            <Plus size={20} />
          </button>

          {showMediaMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 flex flex-col gap-2 min-w-max">
              <button
                onClick={triggerImageUpload}
                className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 rounded transition text-sm text-gray-700"
              >
                <ImageIcon size={18} className="text-green-600" />
                Image
              </button>
              <button
                onClick={triggerVideoUpload}
                className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 rounded transition text-sm text-gray-700"
              >
                <Video size={18} className="text-green-600" />
                Video
              </button>
              <button
                onClick={triggerDocumentUpload}
                className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 rounded transition text-sm text-gray-700"
              >
                <FileIcon size={18} className="text-green-600" />
                PDF/Document
              </button>
              <button
                onClick={triggerFileUpload}
                className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 rounded transition text-sm text-gray-700"
              >
                <Music size={18} className="text-green-600" />
                Audio/File
              </button>
            </div>
          )}
        </div>

        {/* Hidden file inputs for different media types */}
        <input 
          ref={imageRef}
          type="file" 
          hidden 
          onChange={handleMediaUpload}
          accept="image/*"
        />
        <input 
          ref={videoRef}
          type="file" 
          hidden 
          onChange={handleMediaUpload}
          accept="video/*"
        />
        <input 
          ref={documentRef}
          type="file" 
          hidden 
          onChange={handleMediaUpload}
          accept=".pdf,.doc,.docx,.txt,.xlsx"
        />
        <input 
          ref={fileRef}
          type="file" 
          hidden 
          onChange={handleMediaUpload}
          accept="audio/*,.pdf,.doc,.docx"
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
          className="flex-1 px-3 py-2 bg-white rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 max-h-24 text-sm transition"
          disabled={loading || disabled}
        />

        <div className="relative flex-shrink-0">
          <button 
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-1.5 hover:bg-gray-300 rounded-full text-gray-600 transition active:bg-gray-400"
            disabled={loading}
          >
            <Smile size={20} />
          </button>

          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-72 max-h-56 overflow-y-auto z-50">
              <div className="grid grid-cols-8 gap-1">
                {emojiList.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertEmoji(emoji)}
                    className="text-2xl hover:bg-gray-100 p-1 rounded transition active:scale-125"
                    title={`Emoji ${idx}`}
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
          disabled={(!text.trim() && !selectedFile) || loading || disabled}
          className="flex-shrink-0 p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-full text-white transition-colors duration-200"
        >
          {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}
