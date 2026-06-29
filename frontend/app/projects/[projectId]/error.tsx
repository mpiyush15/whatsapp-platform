'use client'

import { useEffect } from 'react'

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Project Component Error:', error)
  }, [error])

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm border border-slate-200">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Something went wrong!</h2>
        <p className="mb-6 text-sm text-slate-500">
          We encountered an unexpected error while rendering this page.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Reload Page
          </button>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Try Again
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 rounded bg-slate-100 p-3 text-left">
            <p className="text-xs font-mono text-slate-600 break-all">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
