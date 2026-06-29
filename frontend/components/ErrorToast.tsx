"use client"

import { AlertCircle, X } from "lucide-react"
import { useState, useEffect } from "react"

interface ErrorToastProps {
  message: string | null
  onDismiss: () => void
  autoClose?: number // ms before auto-closing (null = manual close only)
  type?: 'error' | 'warning' | 'info' | 'success'
}

export function ErrorToast({ message, onDismiss, autoClose = 5000, type = 'error' }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(!!message)

  useEffect(() => {
    if (message) {
      setIsVisible(true)
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false)
          onDismiss()
        }, autoClose)
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [message, autoClose, onDismiss])

  if (!message || !isVisible) return null

  const colors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  }

  const iconColors = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    success: 'text-green-600'
  }

  return (
    <div className={`fixed bottom-4 right-4 max-w-md z-50 border rounded-lg p-4 ${colors[type]} animate-in slide-in-from-right-5`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColors[type]}`} />
        <div className="flex-1">
          <p className="text-sm font-medium whitespace-pre-wrap">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            onDismiss()
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Custom hook for managing error toast state
 * Usage: const { error, setError, clearError } = useErrorToast()
 */
export function useErrorToast() {
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      setError(err.message)
    } else if (typeof err === 'string') {
      setError(err)
    } else {
      setError('An unexpected error occurred')
    }
  }

  return { error, setError, clearError, handleError }
}
