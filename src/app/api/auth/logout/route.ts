import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST(req: Request) {
  const token = (await req.headers.get('cookie'))?.split(';').map(s=>s.trim()).find(s=>s.startsWith('session='))?.split('=')[1]
  await destroySession(token)
  const res = NextResponse.json({ ok: true })
  const secureEnv = process.env.COOKIE_SECURE
  const useSecure = secureEnv ? secureEnv === 'true' : (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://'))
  res.cookies.set('session', '', { httpOnly: true, sameSite:'lax', secure: useSecure, expires: new Date(0), path: '/' })
  return res
}
