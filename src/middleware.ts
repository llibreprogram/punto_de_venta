import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname
  const protectedRoots = ['/', '/pos', '/ventas', '/configuracion', '/admin']
  // Public and API routes: skip auth checks
  if (pathname.startsWith('/api/')) return NextResponse.next()
  if (pathname.startsWith('/manual')) return NextResponse.next()
  let needsAuth = protectedRoots.some(p => pathname === p || pathname.startsWith(p + '/'))
  // Ticket: allow if has valid signature (?exp & ?sig); otherwise treat as protected.
  if (pathname.startsWith('/ticket/')) {
    const idStr = pathname.split('/')[2]
    const exp = Number(url.searchParams.get('exp'))
    const sig = url.searchParams.get('sig') || ''
    const idNum = Number(idStr)
    if (!Number.isNaN(idNum) && sig && exp) {
      const ok = await verifySignedTicketEdge(idNum, exp, sig)
      if (ok) needsAuth = false
      else needsAuth = true
    } else {
      needsAuth = true
    }
  }
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

async function verifySignedTicketEdge(id: number, exp: number, sig: string): Promise<boolean> {
  if (!process.env.TICKET_SIGN_SECRET) {
    // Sin secreto → nunca validar (fuerza auth) para seguridad.
    return false
  }
  const now = Math.floor(Date.now() / 1000)
  if (exp < now) return false
  if (exp - now > 86400) return false
  const payload = `${id}.${exp}`
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(process.env.TICKET_SIGN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
    const expected = base64Url(new Uint8Array(sigBuf))
    return timingSafeEqual(expected, sig)
  } catch {
    return false
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
