import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // Subdomain detection:
  // 1. Host begins with "admin." (e.g. admin.nemafoods.mn, admin.localhost:3000)
  // 2. Or matches custom ADMIN_HOST environment variable
  const customAdminHost = process.env.ADMIN_HOST
  const isAdminSubdomain =
    host.startsWith('admin.') || (customAdminHost ? host.includes(customAdminHost) : false)

  if (isAdminSubdomain) {
    // If request is to root '/' on the admin subdomain, rewrite to '/admin'
    // so the admin dashboard appears as the root page of the subdomain.
    if (url.pathname === '/') {
      url.pathname = '/admin'
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
