'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface SettingsContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
  tabTitle: string
  setTabTitle: (title: string) => void
  showSyncButton?: boolean
  setShowSyncButton: (show: boolean) => void
  showCreateButton?: boolean
  setShowCreateButton: (show: boolean) => void
  isSyncing?: boolean
  setIsSyncing: (syncing: boolean) => void
  onSyncClick?: () => void
  setSyncClick: (callback: () => void) => void
  onCreateClick?: () => void
  setCreateClick: (callback: () => void) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState('connect-number')
  const [tabTitle, setTabTitle] = useState('Connect Number')
  const [showSyncButton, setShowSyncButton] = useState(false)
  const [showCreateButton, setShowCreateButton] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [onSyncClick, setSyncClick] = useState<() => void>(() => {})
  const [onCreateClick, setCreateClick] = useState<() => void>(() => {})

  return (
    <SettingsContext.Provider
      value={{
        activeTab,
        setActiveTab,
        tabTitle,
        setTabTitle,
        showSyncButton,
        setShowSyncButton,
        showCreateButton,
        setShowCreateButton,
        isSyncing,
        setIsSyncing,
        onSyncClick,
        setSyncClick,
        onCreateClick,
        setCreateClick
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
