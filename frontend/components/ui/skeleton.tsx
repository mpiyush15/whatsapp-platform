"use client"

import React from "react"

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-6 w-24" />
    </div>
  )
}

export function TableRowsSkeleton({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3">
              <Skeleton className={columnIndex === 0 ? "h-4 w-36" : "h-4 w-24"} />
              {columnIndex === 0 ? <Skeleton className="mt-2 h-3 w-28" /> : null}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
