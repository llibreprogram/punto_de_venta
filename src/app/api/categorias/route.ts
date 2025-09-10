import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const all = url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true'
  const where = all ? {} : { activa: true }
  const cats = await prisma.categoria.findMany({ where, orderBy: { nombre: 'asc' } })
  return NextResponse.json(cats)
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { nombre } = await req.json()
  const name = String(nombre || '').trim()
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const created = await prisma.categoria.create({ data: { nombre: name } })
  return NextResponse.json(created, { status: 201 })
}
