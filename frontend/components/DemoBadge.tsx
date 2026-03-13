import React from 'react'
import { AlertCircle } from 'lucide-react'

interface DemoBadgeProps {
  isDemoAccount?: boolean
  demoLabel?: string | null
  demoNote?: string | null
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export default function DemoBadge({ 
  isDemoAccount, 
  demoLabel,
  demoNote,
  size = 'md',
  showIcon = true
}: DemoBadgeProps) {
  if (!isDemoAccount) return null

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const label = demoLabel?.toUpperCase() || 'DEMO'

  return (
    <div className={`
      inline-flex items-center gap-2
      bg-amber-100 border border-amber-400 rounded-full
      text-amber-900 font-semibold
      ${sizeClasses[size]}
    `}>
      {showIcon && <AlertCircle size={size === 'sm' ? 12 : size === 'md' ? 16 : 20} />}
      <span>{label}</span>
      {demoNote && (
        <span className="ml-1 text-amber-800 opacity-75">
          {demoNote.substring(0, 30)}...
        </span>
      )}
    </div>
  )
}
