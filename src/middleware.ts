import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname
  const protectedRoots = ['/', '/pos', '/ventas', '/ticket', '/configuracion', '/admin']
  const needsAuth = protectedRoots.some(p => pathname === p || pathname.startsWith(p + '/'))
  const token = req.cookies.get('session')?.value
  if (pathname.startsWith('/login')) {
    // Siempre permitir la página de login, aunque exista una cookie obsoleta
    return NextResponse.next()
  }
  if (!needsAuth) return NextResponse.next()
  if (!token) return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(pathname), req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/pos', '/ventas', '/ticket/:path*', '/configuracion/:path*', '/admin/:path*']
}
