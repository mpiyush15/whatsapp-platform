'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export type FlowBuilderStatus = {
  type: 'success' | 'error'
  message: string
}

interface FlowBuilderContextType {
  status: FlowBuilderStatus | null
  setStatus: (status: FlowBuilderStatus | null) => void
}

const FlowBuilderContext = createContext<FlowBuilderContextType | undefined>(undefined)

export function FlowBuilderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<FlowBuilderStatus | null>(null)

  useEffect(() => {
    setStatus(null)
  }, [pathname])

  return (
    <FlowBuilderContext.Provider value={{ status, setStatus }}>
      {children}
    </FlowBuilderContext.Provider>
  )
}

export function useFlowBuilder() {
  const context = useContext(FlowBuilderContext)
  if (!context) {
    throw new Error('useFlowBuilder must be used within FlowBuilderProvider')
  }
  return context
}

export function useFlowBuilderOptional() {
  return useContext(FlowBuilderContext)
}
