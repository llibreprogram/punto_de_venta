import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await prisma.usuario.findMany({ select: { id:true, nombre:true, email:true, rol:true, activo:true } })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { nombre, email, rol, password } = await req.json()
  if (!nombre || !email || !password) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  const exists = await prisma.usuario.findUnique({ where: { email } })
  if (exists) return NextResponse.json({ error: 'Email ya existe' }, { status: 409 })
  const user = await prisma.usuario.create({ data: { nombre, email, rol: rol || 'cajero', passwordHash: hashPassword(password) } })
  return NextResponse.json({ id: user.id })
}
