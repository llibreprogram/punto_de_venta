import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

type Row = Record<string, string|number>

function toCSV(rows: Row[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: string|number) => {
    const s = String(v ?? '')
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"'
    return s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h=>escape(r[h] ?? '')).join(','))].join('\n')
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = (searchParams.get('type') || 'dia') as 'dia'|'categoria'|'producto'|'hora'
  const format = searchParams.get('format') || 'json'
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const top = Number(searchParams.get('top') || '')
  const metric = (searchParams.get('metric') || 'total') as 'total'|'cantidad'|'margen'
  const where: Prisma.PedidoWhereInput = {}
  if (type === 'hora') {
    // Agrupar pedidos por hora local (00-23)
    const pedidos = await prisma.pedido.findMany({ where, select: { createdAt:true, totalCents:true, id:true, numero:true } })
    const map = new Map<number, { hora:string; pedidos:number; totalCents:number }>()
    for (let h=0; h<24; h++) map.set(h, { hora: `${String(h).padStart(2,'0')}:00`, pedidos:0, totalCents:0 })
    for (const p of pedidos) {
      const d = new Date(p.createdAt)
      const hour = d.getHours()
      const cur = map.get(hour)!
      cur.pedidos += 1
      cur.totalCents += p.totalCents
    }
    const rows = Array.from(map.values()).sort((a,b)=> a.hora.localeCompare(b.hora))
    if (format === 'csv') return new NextResponse(toCSV(rows as Row[]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reporte_hora.csv"' } })
    return NextResponse.json(rows)
  }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  if (type === 'dia') {
    // Traer pedidos y agrupar en memoria por YYYY-MM-DD
    const pedidos = await prisma.pedido.findMany({ where, select: { createdAt:true, totalCents:true, id:true, numero:true } })
    const map = new Map<string, { fecha:string; pedidos:number; totalCents:number }>()
    for (const p of pedidos) {
      const d = new Date(p.createdAt)
      const key = d.toISOString().slice(0,10)
      const cur = map.get(key) || { fecha:key, pedidos:0, totalCents:0 }
      cur.pedidos += 1
      cur.totalCents += p.totalCents
      map.set(key, cur)
    }
    const rows = Array.from(map.values()).sort((a,b)=> a.fecha.localeCompare(b.fecha))
    if (format === 'csv') return new NextResponse(toCSV(rows as Row[]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reporte_dia.csv"' } })
    return NextResponse.json(rows)
  }

  if (type === 'categoria') {
    const includeCat = { producto: { include: { categoria: true } } } as unknown
    const items = await prisma.pedidoItem.findMany({
      where: { pedido: { is: where } },
      include: includeCat as { producto: { include: { categoria: true } } },
    }) as unknown as Array<{ cantidad:number; totalCents:number; costoCents?:number; producto:{ categoria?: { nombre: string } | null } }>
    const map = new Map<string, { categoria:string; cantidad:number; totalCents:number; costoCents:number; margenCents:number }>()
    for (const it of items) {
      const key = it.producto?.categoria?.nombre || 'Sin categoría'
      const cur = map.get(key) || { categoria: key, cantidad:0, totalCents:0, costoCents:0, margenCents:0 }
      cur.cantidad += it.cantidad
      cur.totalCents += it.totalCents
      cur.costoCents += (it.costoCents || 0) * it.cantidad
      cur.margenCents = cur.totalCents - cur.costoCents
      map.set(key, cur)
    }
  let rows = Array.from(map.values()).sort((a,b)=> metric==='cantidad' ? (b.cantidad - a.cantidad) : metric==='margen' ? ((b.margenCents) - (a.margenCents)) : (b.totalCents - a.totalCents))
  if (Number.isFinite(top) && top>0) rows = rows.slice(0, top)
    if (format === 'csv') return new NextResponse(toCSV(rows.map(r=>({ categoria:r.categoria, cantidad:r.cantidad, totalCents:r.totalCents, costoCents:r.costoCents, margenCents:r.margenCents })) as Row[]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reporte_categoria.csv"' } })
    return NextResponse.json(rows)
  }

  // producto
  const includeProd = { producto: { select: { id:true, nombre:true } } } as unknown
  const items = await prisma.pedidoItem.findMany({
    where: { pedido: { is: where } },
    include: includeProd as { producto: { select: { id:true, nombre:true } } },
  }) as unknown as Array<{ cantidad:number; totalCents:number; costoCents?:number; producto:{ id:number; nombre:string } }>
  const map = new Map<number, { productoId:number; producto:string; cantidad:number; totalCents:number; costoCents:number; margenCents:number }>()
  for (const it of items) {
    const id = it.producto.id
    const cur = map.get(id) || { productoId: id, producto: it.producto.nombre, cantidad:0, totalCents:0, costoCents:0, margenCents:0 }
    cur.cantidad += it.cantidad
    cur.totalCents += it.totalCents
    cur.costoCents += (it.costoCents || 0) * it.cantidad
    cur.margenCents = cur.totalCents - cur.costoCents
    map.set(id, cur)
  }
  let rows = Array.from(map.values()).sort((a,b)=> metric==='cantidad' ? (b.cantidad - a.cantidad) : metric==='margen' ? ((b.margenCents) - (a.margenCents)) : (b.totalCents - a.totalCents))
  if (Number.isFinite(top) && top>0) rows = rows.slice(0, top)
  if (format === 'csv') return new NextResponse(toCSV(rows.map(r=>({ producto:r.producto, cantidad:r.cantidad, totalCents:r.totalCents, costoCents:r.costoCents, margenCents:r.margenCents })) as Row[]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename:"reporte_producto.csv"' } })
  return NextResponse.json(rows)
}
