import prisma from '@/lib/db'
import type { Prisma, OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

type Item = { productoId: number; cantidad: number; precioCents: number; removidos?: string[]; extras?: string[]; extrasCents?: number; notas?: string }
type Body = {
  tipo: 'Mostrador' | 'Mesa' | 'Delivery'
  mesaId?: number
  subCuenta?: number
  items: Item[]
  impuestoCents: number
  descuentoCents?: number
  pago?: { metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'; montoCents: number; referencia?: string }
}

export async function POST(req: Request) {
  try {
    // Require login; pagos solo para admin/cajero
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = (await req.json()) as Body
    if (!data.items?.length) return NextResponse.json({ error: 'Sin items' }, { status: 400 })
    if (data.pago && !(session.user.rol === 'admin' || session.user.rol === 'cajero')) {
      return NextResponse.json({ error: 'No autorizado para cobrar' }, { status: 403 })
    }

  const subtotal = data.items.reduce((a, i) => a + i.precioCents * i.cantidad, 0)
    const impuesto = Math.max(0, Math.round(data.impuestoCents || 0))
    const descuento = Math.max(0, Math.round(data.descuentoCents || 0))
    const total = subtotal + impuesto - descuento

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const last = await tx.pedido.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
      const numero = (last?.numero ?? 0) + 1

      // Calcular subCuenta: si es mesa y no viene, tomar siguiente
      let subCuenta = 1
      if (data.tipo === 'Mesa' && data.mesaId) {
        if (data.subCuenta && Number.isFinite(data.subCuenta) && data.subCuenta > 0) {
          subCuenta = Math.round(data.subCuenta)
        } else {
          // Buscar el max(subCuenta) existente con Prisma y sumar 1
          const max = await tx.pedido.aggregate({
            _max: { subCuenta: true },
            where: { mesaId: data.mesaId },
          })
          subCuenta = (max._max.subCuenta || 0) + 1
        }
      }
  const pedidoCreated = await tx.pedido.create({
        data: {
          numero,
          estado: data.pago ? 'PAGADO' : 'ABIERTO',
          mesaId: data.tipo === 'Mesa' && data.mesaId ? data.mesaId : null,
          subCuenta,
          subtotalCents: subtotal,
          impuestoCents: impuesto,
          descuentoCents: descuento,
          totalCents: total,
        },
        select: { id: true }
      })
  const pedidoId = pedidoCreated.id
      // Obtener costos actuales de los productos para congelarlos en el item
      const ids = Array.from(new Set(data.items.map(i=>i.productoId)))
  const select = { id: true, costoCents: true } satisfies Record<string, boolean>
  const productosRaw = await (tx.producto as unknown as { findMany: (args: { where: { id: { in: number[] } }, select: typeof select }) => Promise<Array<{ id:number; costoCents:number }>> }).findMany({ where: { id: { in: ids } }, select })
  const productos = productosRaw as Array<{ id:number; costoCents:number }>
  const costoMap = new Map(productos.map((p:{id:number;costoCents:number})=>[p.id, p.costoCents || 0]))
      await tx.pedidoItem.createMany({
        data: data.items.map(i => ({
          pedidoId: pedidoId,
          productoId: i.productoId,
          cantidad: i.cantidad,
          precioCents: i.precioCents,
          costoCents: costoMap.get(i.productoId) ?? 0,
          totalCents: i.precioCents * i.cantidad,
          removidos: i.removidos && i.removidos.length ? i.removidos : undefined,
          notas: i.notas && i.notas.trim() ? i.notas.trim() : undefined,
          extras: i.extras && i.extras.length ? i.extras : undefined,
          extrasCents: Math.max(0, Math.round(i.extrasCents || 0)),
        }))
      })

  let pagoId: number | undefined
  if (data.pago) {
        const pago = await tx.pago.create({
          data: {
            pedidoId: pedidoId,
            metodo: data.pago.metodo,
            montoCents: data.pago.montoCents,
            referencia: data.pago.referencia,
          }
        })
        pagoId = pago.id
      }
  return { pedidoId, numero, pagoId, subCuenta }
    })
    // Auto imprimir cocina al crear
    try {
      const aj = await prisma.ajustes.findUnique({ where: { id: 1 } }) as unknown as { autoKitchenOnCreate?: boolean }
      if (aj?.autoKitchenOnCreate) {
        // No enviamos a impresora aquí; devolvemos hint al cliente
        return NextResponse.json({ ok: true, ...result, autoKitchen: true })
      }
    } catch {}
  return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const estado = searchParams.get('estado') as ('ABIERTO'|'PAGADO'|'CANCELADO'|null)
  const mesaId = searchParams.get('mesaId')
  const subCuentaParam = searchParams.get('subCuenta')
  const format = searchParams.get('format')
  const where: { createdAt?: { gte?: Date; lte?: Date }; estado?: OrderStatus; mesaId?: number; subCuenta?: number } = {}
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }
  if (estado === 'ABIERTO' || estado === 'PAGADO' || estado === 'CANCELADO') where.estado = estado as OrderStatus
  if (mesaId) where.mesaId = Number(mesaId)
  if (subCuentaParam) {
    const sc = Number(subCuentaParam)
    if (Number.isFinite(sc) && sc > 0) where.subCuenta = sc
  }
  const pedidos = await prisma.pedido.findMany({
    where,
    include: { pagos: true, mesa: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  if (format === 'csv') {
    const headers = ['numero','fecha','mesa','subCuenta','subtotalCents','impuestoCents','descuentoCents','totalCents','estado']
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s
    }
    const rows = pedidos.map(p=>[
      p.numero,
      p.createdAt.toISOString(),
      p.mesa?.nombre || '',
      p.mesa ? p.subCuenta : '',
      p.subtotalCents,
      p.impuestoCents,
      p.descuentoCents,
      p.totalCents,
      p.estado
    ])
    const csv = [headers.join(','), ...rows.map(r=>r.map(escape).join(','))].join('\n')
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="pedidos.csv"' } })
  }
  return NextResponse.json(pedidos)
}
