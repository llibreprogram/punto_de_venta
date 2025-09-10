import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const all = url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true'
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const order = url.searchParams.get('order') || 'cat_name'
  const where = all ? {} : { activo: true }
  const productos = await prisma.producto.findMany({
    where,
    include: { categoria: true },
    orderBy: order === 'name' ? [{ nombre: 'asc' }] : [{ categoria: { nombre: 'asc' } }, { nombre: 'asc' }],
  })
  const filtered = q ? productos.filter((p:{nombre:string; categoria:{nombre:string}|null}) => (
    p.nombre.toLowerCase().includes(q) || (p.categoria?.nombre?.toLowerCase() || '').includes(q)
  )) : productos
  return NextResponse.json(filtered)
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const nombre = String(body?.nombre || '').trim()
  let precioCents = Number(body?.precioCents || 0)
  let costoCents = Number(body?.costoCents || 0)
  const ingredientes = Array.isArray(body?.ingredientes) ? body.ingredientes.filter((s:string)=>typeof s==='string') : undefined
  const extras = Array.isArray(body?.extras)
    ? (body.extras as Array<{nombre:string; precioCents:number}> )
        .filter((e: {nombre:string; precioCents:number}) => e && typeof e.nombre==='string' && Number.isFinite(e.precioCents as number))
        .map((e: {nombre:string; precioCents:number}) => ({ nombre: e.nombre, precioCents: Math.max(0, Math.round(Number(e.precioCents))) }))
    : undefined
  if (!Number.isFinite(precioCents)) precioCents = 0
  if (!Number.isFinite(costoCents)) costoCents = 0
  precioCents = Math.max(0, Math.round(precioCents))
  costoCents = Math.max(0, Math.round(costoCents))
  if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  let categoriaId: number | null = null
  if (typeof body?.categoriaId === 'number' && Number.isFinite(body.categoriaId)) {
    categoriaId = Math.max(1, Math.floor(body.categoriaId))
    const exists = await prisma.categoria.findUnique({ where: { id: categoriaId } })
    if (!exists) categoriaId = null
  }
  if (!categoriaId) {
    const cat = await prisma.categoria.findFirst()
    if (!cat) return NextResponse.json({ error: 'No hay categorías' }, { status: 400 })
    categoriaId = cat.id
  }
  const p = await prisma.producto.create({ data: ({ nombre, precioCents, costoCents, categoriaId, ingredientes, extras } as unknown) as { nombre:string; precioCents:number; costoCents:number; categoriaId:number; ingredientes?: string[]; extras?: Array<{ nombre:string; precioCents:number }> } })
  return NextResponse.json(p, { status: 201 })
}
