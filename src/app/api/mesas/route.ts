import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

async function requireAdmin(req: Request) {
  const cookie = req.headers.get('cookie') || ''
  const token = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('session='))?.split('=')[1]
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') {
    return null
  }
  return session
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  const where = all ? {} : { activa: true }
  const mesas = await prisma.mesa.findMany({ where, orderBy: { nombre: 'asc' } })
  return NextResponse.json(mesas)
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { nombre } = await req.json().catch(()=>({})) as { nombre?: string }
  const n = (nombre||'').trim()
  if (!n) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const exists = await prisma.mesa.findUnique({ where: { nombre: n } })
  if (exists) return NextResponse.json({ error: 'Ya existe' }, { status: 409 })
  const created = await prisma.mesa.create({ data: { nombre: n } })
  return NextResponse.json(created)
}

export async function PUT(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(()=>({})) as { id?: number; nombre?: string; activa?: boolean }
  if (!body.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const data: { nombre?: string; activa?: boolean } = {}
  if (typeof body.nombre === 'string') {
    const n = body.nombre.trim(); if (n) data.nombre = n
  }
  if (typeof body.activa === 'boolean') data.activa = body.activa
  const updated = await prisma.mesa.update({ where: { id: body.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  // Soft delete -> desactivar
  const updated = await prisma.mesa.update({ where: { id }, data: { activa: false } })
  return NextResponse.json(updated)
}
