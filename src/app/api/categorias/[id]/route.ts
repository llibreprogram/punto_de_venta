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
  
  if (typeof body.nombre === 'string') {
    const name = body.nombre.trim()
    if (!name) return NextResponse.json({ error: 'Nombre no puede estar vacío' }, { status: 400 })
    
    // Check for duplicates (case insensitive in memory for SQLite compatibility)
    const existing = await prisma.categoria.findMany()
    if (existing.some(c => c.id !== id && c.nombre.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: 'Ya existe una categoría con este nombre' }, { status: 400 })
    }
    data.nombre = name
  }
  
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
