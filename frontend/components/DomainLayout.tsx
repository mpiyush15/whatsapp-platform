/**
 * Domain-based layout selection
 * Routes to correct UI based on domain
 */
'use client'

import { useEffect, ReactNode } from 'react'
import { getCurrentDomain, isAdminDomain } from '@/lib/domain'

interface DomainLayoutProps {
  children: ReactNode
  adminLayout: ReactNode
  appLayout: ReactNode
}

export default function DomainLayout({ 
  children, 
  adminLayout, 
  appLayout 
}: DomainLayoutProps) {
  const isDomain = isAdminDomain()

  useEffect(() => {
    // Log domain for debugging
    console.log(`🌐 Running on domain: ${isDomain ? 'admin.domain' : 'app.domain'}`)
  }, [isDomain])

  // Render appropriate layout based on domain
  if (isDomain) {
    return <>{adminLayout}</>
  } else {
    return <>{appLayout}</>
  }
}
