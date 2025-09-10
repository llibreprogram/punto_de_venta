import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Admin only
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: idStr } = await context.params
  const id = Number(idStr)
  const body = await req.json()
  const data: Partial<{ imagenUrl: string; nombre: string; precioCents: number; costoCents: number; categoriaId: number; activo: boolean; ingredientes: string[]; extras: Array<{ nombre:string; precioCents:number }> }> = {}
  if (typeof body.imagenUrl === 'string') data.imagenUrl = body.imagenUrl
  if (typeof body.nombre === 'string') data.nombre = body.nombre
  if (typeof body.precioCents === 'number' && Number.isFinite(body.precioCents)) data.precioCents = Math.max(0, Math.round(body.precioCents))
  if (typeof body.costoCents === 'number' && Number.isFinite(body.costoCents)) data.costoCents = Math.max(0, Math.round(body.costoCents))
  if (typeof body.categoriaId === 'number' && Number.isFinite(body.categoriaId)) data.categoriaId = Math.max(1, Math.floor(body.categoriaId))
  if (Array.isArray(body.ingredientes)) data.ingredientes = body.ingredientes.filter((s:string)=>typeof s==='string')
  if (Array.isArray(body.extras)) data.extras = (body.extras as Array<{nombre:string; precioCents:number}>)
    .filter((e)=> e && typeof e.nombre==='string' && Number.isFinite(e.precioCents as number))
    .map(e=> ({ nombre: e.nombre, precioCents: Math.max(0, Math.round(Number(e.precioCents))) }))
  const producto = await prisma.producto.update({ where: { id }, data })
  return NextResponse.json(producto)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Admin only
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: idStr } = await context.params
  const id = Number(idStr)
  const producto = await prisma.producto.update({ where: { id }, data: { activo: false } })
  return NextResponse.json(producto)
}
