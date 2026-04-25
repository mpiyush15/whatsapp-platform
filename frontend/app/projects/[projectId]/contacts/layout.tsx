'use client'

import { ReactNode } from 'react'

interface ContactsLayoutProps {
  children: ReactNode
}

export default function ContactsLayout({ children }: ContactsLayoutProps) {
  return <>{children}</>
}
