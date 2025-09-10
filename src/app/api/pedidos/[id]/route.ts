import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { ItemStatus } from '@prisma/client'

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      items: { include: { producto: true } },
      pagos: true,
      mesa: true,
    }
  })
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}

type Item = { productoId: number; cantidad: number; precioCents: number; removidos?: string[]; extras?: string[]; extrasCents?: number; notas?: string }

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as {
    items: Item[]
    impuestoCents: number
    descuentoCents?: number
    pago?: { metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'; montoCents: number; referencia?: string }
  }
  if (!Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'Sin items' }, { status: 400 })
  const subtotal = body.items.reduce((a, i) => a + i.precioCents * i.cantidad, 0)
  const impuesto = Math.max(0, Math.round(body.impuestoCents || 0))
  const descuento = Math.max(0, Math.round(body.descuentoCents || 0))
  const total = subtotal + impuesto - descuento
  try {
    const result = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({ where: { id }, select: { id: true, estado: true } })
      if (!pedido) throw new Error('No encontrado')
      // Reemplazar items existentes por los nuevos
      await tx.pedidoItem.deleteMany({ where: { pedidoId: id } })
      // Obtener costos actuales para snapshot
      const ids = Array.from(new Set(body.items.map(i=>i.productoId)))
  const select = { id: true, costoCents: true } as const
  const productosRaw = await (tx.producto as unknown as { findMany: (args: { where: { id: { in: number[] } }, select: typeof select }) => Promise<Array<{ id:number; costoCents:number }>> }).findMany({ where: { id: { in: ids } }, select })
  const productos = productosRaw as Array<{ id:number; costoCents:number }>
  const costoMap = new Map(productos.map((p:{id:number;costoCents:number})=>[p.id, p.costoCents || 0]))
      await tx.pedidoItem.createMany({
        data: body.items.map(i=>({
          pedidoId: id,
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
      await tx.pedido.update({ where: { id }, data: {
        subtotalCents: subtotal,
        impuestoCents: impuesto,
        descuentoCents: descuento,
        totalCents: total,
        estado: body.pago ? 'PAGADO' : 'ABIERTO',
      }})
      let pagoId: number | undefined
      if (body.pago) {
        const pago = await tx.pago.create({ data: { pedidoId: id, metodo: body.pago.metodo, montoCents: body.pago.montoCents, referencia: body.pago.referencia } })
        pagoId = pago.id
      }
      return { pedidoId: id, pagoId, estado: body.pago ? 'PAGADO' : 'ABIERTO' as const }
    })
    // Auto imprimir cocina según ajustes
    try {
      const aj = await prisma.ajustes.findUnique({ where: { id: 1 } }) as unknown as { autoKitchenOnCreate?: boolean; autoKitchenOnReady?: boolean }
      if (result.estado === 'ABIERTO' && aj?.autoKitchenOnCreate) {
        return NextResponse.json({ ok: true, ...result, autoKitchen: true })
      }
      if (result.estado === 'PAGADO' && aj?.autoKitchenOnReady) {
        return NextResponse.json({ ok: true, ...result, autoKitchen: true })
      }
    } catch {}
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Opcional: roles (solo admin/cajero eliminan)
  if (!(session.user.rol === 'admin' || session.user.rol === 'cajero')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: { items: { select: { estado: true } } } })
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  // Si cualquier item está EN_PROCESO o LISTO, bloquear
  const bloqueado = pedido.items.some(it => it.estado === ItemStatus.EN_PROCESO || it.estado === ItemStatus.LISTO)
  if (bloqueado) {
    const msg = 'No se puede eliminar la orden porque ya está en proceso o lista.'
    return NextResponse.json({ error: msg }, { status: 409 })
  }
  await prisma.pedido.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
