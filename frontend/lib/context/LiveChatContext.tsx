'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface LiveChatContextType {
  search: string
  setSearch: (search: string) => void
  filter: 'all' | 'unread' | 'open' | 'closed'
  setFilter: (filter: 'all' | 'unread' | 'open' | 'closed') => void
}

const LiveChatContext = createContext<LiveChatContextType | undefined>(undefined)

export function LiveChatProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'open' | 'closed'>('all')

  return (
    <LiveChatContext.Provider value={{ search, setSearch, filter, setFilter }}>
      {children}
    </LiveChatContext.Provider>
  )
}

export function useLiveChat() {
  const context = useContext(LiveChatContext)
  if (!context) {
    throw new Error('useLiveChat must be used within LiveChatProvider')
  }
  return context
}
