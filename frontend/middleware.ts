import { NextRequest, NextResponse } from 'next/server'

type DomainType = 'admin' | 'app' | 'support' | 'healthcare' | 'public'

const ADMIN_ONLY_PREFIXES = ['/dashboard/superadmin']
const SUPPORT_ONLY_PREFIXES = ['/dashboard/support']
const APP_ONLY_PREFIXES = ['/dashboard/features']

function isHealthcarePath(pathname: string): boolean {
  return pathname.startsWith('/dashboard/healthcare') || pathname.includes('/healthcare')
}

function isAppOnlyPath(pathname: string): boolean {
  return pathname.startsWith('/dashboard/features') || (pathname.startsWith('/projects') && !isHealthcarePath(pathname))
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.startsWith('127.')
}

function detectDomainFromRequest(request: NextRequest): DomainType {
  const hostname = request.nextUrl.hostname.toLowerCase()

  if (hostname.startsWith('admin.') || hostname === '187.127.147.166') return 'admin'
  if (hostname.startsWith('app.')) return 'app'
  if (hostname.startsWith('support.')) return 'support'
  if (hostname.startsWith('healthcare.')) return 'healthcare'

  if (isLocalHost(hostname)) {
    const override = request.nextUrl.searchParams.get('domain')
    if (override === 'admin' || override === 'support' || override === 'app' || override === 'healthcare') {
      return override
    }
    return 'app'
  }

  if (!hostname.includes('.') || hostname.split('.').length === 2) {
    return 'public'
  }

  return 'app'
}

function getRequiredDomainForPath(pathname: string): Exclude<DomainType, 'public'> | null {
  if (ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'admin'
  if (SUPPORT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'support'
  if (isHealthcarePath(pathname)) return 'healthcare'
  if (isAppOnlyPath(pathname)) return 'app'
  return null
}

function applyDomainToHostname(hostname: string, targetDomain: Exclude<DomainType, 'public'>): string {
  if (hostname.startsWith('admin.') || hostname.startsWith('app.') || hostname.startsWith('support.') || hostname.startsWith('healthcare.')) {
    return hostname.replace(/^(admin|app|support|healthcare)\./, `${targetDomain}.`)
  }

  if (!hostname.includes('.') || hostname.split('.').length === 2) {
    return `${targetDomain}.${hostname}`
  }

  return hostname
}

function redirectToDomain(request: NextRequest, targetDomain: Exclude<DomainType, 'public'>) {
  const url = request.nextUrl.clone()
  const hostname = request.nextUrl.hostname.toLowerCase()

  if (isLocalHost(hostname)) {
    url.searchParams.set('domain', targetDomain)
    return NextResponse.redirect(url)
  }

  url.hostname = applyDomainToHostname(hostname, targetDomain)
  return NextResponse.redirect(url)
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const requiredDomain = getRequiredDomainForPath(pathname)
  const currentDomain = detectDomainFromRequest(request)

  if (requiredDomain && currentDomain !== requiredDomain) {
    return redirectToDomain(request, requiredDomain)
  }

  // Prevent obvious cross-domain route usage even if path-specific checks don't catch it first.
  if (currentDomain === 'admin' && isAppOnlyPath(pathname)) {
    return redirectToDomain(request, 'app')
  }

  if (currentDomain === 'support' && isAppOnlyPath(pathname)) {
    return redirectToDomain(request, 'app')
  }

  if (currentDomain === 'healthcare' && isAppOnlyPath(pathname)) {
    return redirectToDomain(request, 'app')
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
