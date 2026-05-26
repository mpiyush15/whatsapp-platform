"use client"

import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"

type Props = {
  initialLoading: boolean
  refreshing: boolean
  isEmpty: boolean
  emptyMessage: string
  children: ReactNode
}

export function HealthcareTableShell({
  initialLoading,
  refreshing,
  isEmpty,
  emptyMessage,
  children,
}: Props) {
  if (initialLoading && isEmpty) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <div className="relative">
      {refreshing ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/60 pt-8"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </span>
        </div>
      ) : null}
      <div className={refreshing ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {isEmpty ? (
          <div className="py-12 text-center text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
