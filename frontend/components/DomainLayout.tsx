/**
 * Domain-based layout selection
 * Routes to correct UI based on domain (admin vs app)
 */
'use client'

import { useDomain } from '@/lib/context/DomainContext'

interface DomainLayoutProps {
  children?: React.ReactNode
  adminLayout?: React.ReactNode
  appLayout?: React.ReactNode
}

export default function DomainLayout({ 
  children, 
  adminLayout, 
  appLayout 
}: DomainLayoutProps) {
  const { domain } = useDomain()

  // Render appropriate layout based on detected domain
  if (adminLayout && appLayout) {
    // Two-layout mode
    return domain === 'admin' ? <>{adminLayout}</> : <>{appLayout}</>
  }

  // Pass-through mode
  return <>{children}</>
}
