'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Domain = 'admin' | 'app'

interface DomainContextType {
  domain: Domain
  mounted: boolean
}

const DomainContext = createContext<DomainContextType | undefined>(undefined)

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const [domain, setDomain] = useState<Domain>('app')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Detect subdomain from hostname
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    
    if (hostname.includes('admin.')) {
      setDomain('admin')
    } else {
      setDomain('app')
    }
    
    setMounted(true)
  }, [])

  return (
    <DomainContext.Provider value={{ domain, mounted }}>
      {children}
    </DomainContext.Provider>
  )
}

export function useDomain() {
  const context = useContext(DomainContext)
  if (!context) {
    throw new Error('useDomain must be used within DomainProvider')
  }
  return context
}
