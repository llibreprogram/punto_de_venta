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
  const isProd = process.env.NODE_ENV === 'production'
  res.cookies.set('session', token, { httpOnly: true, sameSite: 'lax', secure: isProd, expires: expiresAt, path: '/' })
  return res
}
