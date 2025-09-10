import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 })
  const user = await prisma.usuario.findUnique({ where: { email } })
  if (!user || !user.activo || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }
  const { token, expiresAt } = await createSession(user.id)
  const res = NextResponse.json({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol })
  // Evitar problema de login loop en entornos LAN sin HTTPS: permitir desactivar secure.
  const secureEnv = process.env.COOKIE_SECURE
  const useSecure = secureEnv ? secureEnv === 'true' : (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://'))
  res.cookies.set('session', token, { httpOnly: true, sameSite: 'lax', secure: useSecure, expires: expiresAt, path: '/' })
  return res
}
