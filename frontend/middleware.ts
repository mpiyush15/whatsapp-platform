import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  
  // Detect subdomain
  let domain = 'app'
  if (host.includes('admin.')) {
    domain = 'admin'
  } else if (host.includes('localhost') && !host.includes('admin')) {
    domain = 'app'
  }
  
  // Set header for backend + internal use
  const response = NextResponse.next()
  response.headers.set('X-App-Domain', domain)
  
  return response
}

export const config = {
  matcher: ['/((?!_next|static|favicon|api).*)']
}
