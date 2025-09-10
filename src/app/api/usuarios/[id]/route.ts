import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession, hashPassword } from '@/lib/auth'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return null
  return session
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  const body = await req.json()
  const data: Partial<{ nombre:string; email:string; rol:string; activo:boolean; passwordHash:string }> = {}
  if (typeof body.nombre === 'string') data.nombre = body.nombre
  if (typeof body.email === 'string') data.email = body.email
  if (typeof body.rol === 'string') data.rol = body.rol
  if (typeof body.activo === 'boolean') data.activo = body.activo
  if (typeof body.password === 'string' && body.password.trim()) data.passwordHash = hashPassword(body.password)
  try {
    const u = await prisma.usuario.update({ where: { id: Number(id) }, data, select: { id:true, nombre:true, email:true, rol:true, activo:true } })
    return NextResponse.json(u)
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  // Evitar que un admin se elimine a sí mismo por accidente
  if (session.user.id === Number(id)) return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 })
  try {
    await prisma.usuario.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 400 })
  }
}
