'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo } from 'react'
import { authService, User, UserRole } from '@/lib/auth'
import {
  canOpenStaffWelcomePage,
  isHealthcareStaffSession,
  routeKeyFromProjectPathname,
  staffRouteKeyAllowed,
  staffRoutesForProject,
  staffWelcomePath,
} from '@/lib/healthcareStaffRoutes'

type Props = {
  projectId: string
  children: ReactNode
}

const AGENT_ALLOWED_ROUTES = ['live-chat-v2', 'leads']

export default function ProjectStaffRouteGate({ projectId, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const user = authService.getCurrentUser() as User | null
  const isProjectAgent =
    user?.role === UserRole.AGENT &&
    Boolean(user.agentProjectId)
  const agentProjectMatches = isProjectAgent && String(user?.agentProjectId) === String(projectId)

  const { restricted, allowed, currentKey } = useMemo(() => {
    if (!user) {
      return { restricted: false, allowed: [] as string[], currentKey: null as string | null }
    }
    const restrictedSession = isHealthcareStaffSession(user)
    const allowedRoutes = staffRoutesForProject(user, projectId)
    const key = routeKeyFromProjectPathname(pathname, projectId)
    return { restricted: restrictedSession, allowed: allowedRoutes, currentKey: key }
  }, [user, projectId, pathname])

  useEffect(() => {
    if (!user || !isProjectAgent || !agentProjectMatches) return
    const key = routeKeyFromProjectPathname(pathname, projectId)
    if (key === 'home' || (key && !AGENT_ALLOWED_ROUTES.includes(key))) {
      router.replace(`/projects/${projectId}/live-chat-v2`)
    }
  }, [user, isProjectAgent, agentProjectMatches, pathname, projectId, router])

  useEffect(() => {
    if (!user || !restricted) return
    const base = `/projects/${projectId}`
    const atRoot = pathname === base || pathname === `${base}/`
    if (!atRoot) return
    if (allowed.includes('home')) return
    if (canOpenStaffWelcomePage(user, allowed)) {
      router.replace(staffWelcomePath(projectId))
    }
  }, [user, restricted, allowed, pathname, projectId, router])

  useEffect(() => {
    if (!user || !restricted) return
    if (allowed.length === 0) return
    if (currentKey === "staff") return
    if (currentKey && staffRouteKeyAllowed(currentKey, allowed)) return
    if (canOpenStaffWelcomePage(user, allowed)) {
      router.replace(staffWelcomePath(projectId))
    }
  }, [user, restricted, allowed, currentKey, projectId, router])

  if (user && isProjectAgent) {
    if (!agentProjectMatches) {
      return <StaffDenied message="This agent login is assigned to another project." />
    }

    const key = routeKeyFromProjectPathname(pathname, projectId)
    if (key === 'home') {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-sm text-gray-500">
          Opening live chat...
        </div>
      )
    }

    if (!key || !AGENT_ALLOWED_ROUTES.includes(key)) {
      return (
        <StaffDenied
          message="This page is not included in your agent access."
          showHomeLink
          homeHref={`/projects/${projectId}/live-chat-v2`}
        />
      )
    }

    return <>{children}</>
  }

  if (!user || !restricted) {
    return <>{children}</>
  }

  const basePath = `/projects/${projectId}`
  const atProjectRoot = pathname === basePath || pathname === `${basePath}/`
  if (
    atProjectRoot &&
    !allowed.includes('home') &&
    canOpenStaffWelcomePage(user, allowed)
  ) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-sm text-gray-500">
        Opening your home…
      </div>
    )
  }

  if (currentKey === 'staff') {
    if (canOpenStaffWelcomePage(user, allowed)) {
      return <>{children}</>
    }
    return <StaffDenied message="You do not have access to the staff home page for this project." />
  }

  if (allowed.length === 0) {
    return (
      <StaffDenied message="You do not have any routes assigned for this project. Ask an administrator to update your access." />
    )
  }

  if ((currentKey === null || !staffRouteKeyAllowed(currentKey, allowed)) && canOpenStaffWelcomePage(user, allowed)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-sm text-gray-500">
        Opening your home…
      </div>
    )
  }

  if (currentKey === null || !staffRouteKeyAllowed(currentKey, allowed)) {
    const canHome = canOpenStaffWelcomePage(user, allowed)
    return (
      <StaffDenied
        message="This page is not included in your access for this project."
        showHomeLink={canHome}
        homeHref={staffWelcomePath(projectId)}
      />
    )
  }

  return <>{children}</>
}

function StaffDenied({
  message,
  showHomeLink,
  homeHref,
}: {
  message: string
  showHomeLink?: boolean
  homeHref?: string
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <p className="max-w-md text-gray-700">{message}</p>
      {showHomeLink && homeHref ? (
        <Link href={homeHref} className="mt-6 text-sm font-medium text-green-600 hover:text-green-700">
          Go to your home page
        </Link>
      ) : null}
    </div>
  )
}
