import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST(req: Request) {
  const token = (await req.headers.get('cookie'))?.split(';').map(s=>s.trim()).find(s=>s.startsWith('session='))?.split('=')[1]
  await destroySession(token)
  const res = NextResponse.json({ ok: true })
  const isProd = process.env.NODE_ENV === 'production'
  res.cookies.set('session', '', { httpOnly: true, sameSite:'lax', secure: isProd, expires: new Date(0), path: '/' })
  return res
}
