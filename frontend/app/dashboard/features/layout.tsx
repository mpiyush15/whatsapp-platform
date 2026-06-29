"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * This layout redirects all /dashboard/features/* routes to /dashboard.
 * /dashboard auto-detects the user's project and redirects to /projects/[id]/*
 * which is the correct project-scoped client dashboard.
 */
export default function FeaturesRedirectLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard")
  }, [router])

  // Render nothing while redirecting
  return null
}
