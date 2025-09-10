import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

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
  const { id: idStr } = await context.params
  const id = Number(idStr)
  const body = await req.json()
  const data: Partial<{ nombre: string; activa: boolean }> = {}
  if (typeof body.nombre === 'string') data.nombre = body.nombre
  if (typeof body.activa === 'boolean') data.activa = body.activa
  const cat = await prisma.categoria.update({ where: { id }, data })
  return NextResponse.json(cat)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: idStr } = await context.params
  const id = Number(idStr)
  const cat = await prisma.categoria.update({ where: { id }, data: { activa: false } })
  return NextResponse.json(cat)
}
