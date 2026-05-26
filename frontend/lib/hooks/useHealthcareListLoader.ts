"use client"

import { useCallback, useRef, useState } from "react"

/**
 * Keeps the first load as a full skeleton, then uses a light refresh state
 * so pagination/search does not blank the table.
 */
export function useHealthcareListLoader() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnce = useRef(false)
  const requestId = useRef(0)

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    const id = ++requestId.current
    const isRefresh = hasLoadedOnce.current

    if (!isRefresh) {
      setInitialLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const result = await fn()
      if (id !== requestId.current) {
        return undefined
      }
      hasLoadedOnce.current = true
      return result
    } finally {
      if (id === requestId.current) {
        setInitialLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  const cancel = useCallback(() => {
    requestId.current += 1
    setInitialLoading(false)
    setRefreshing(false)
  }, [])

  const reset = useCallback(() => {
    hasLoadedOnce.current = false
    setInitialLoading(true)
    setRefreshing(false)
  }, [])

  return {
    initialLoading,
    refreshing,
    run,
    cancel,
    reset,
    hasLoadedOnce,
  }
}
