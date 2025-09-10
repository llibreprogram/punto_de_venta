import prisma from '@/lib/db'
import type { Prisma, OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

type Item = { productoId: number; cantidad: number; precioCents: number; removidos?: string[]; extras?: string[]; extrasCents?: number; notas?: string }
type Body = {
  tipo: 'Mostrador' | 'Mesa' | 'Delivery'
  mesaId?: number
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

      const pedido = await tx.pedido.create({
        data: {
          numero,
          mesaId: data.tipo === 'Mesa' ? data.mesaId ?? null : null,
          subtotalCents: subtotal,
          impuestoCents: impuesto,
          descuentoCents: descuento,
          totalCents: total,
          estado: data.pago ? 'PAGADO' : 'ABIERTO',
        },
      })
      // Obtener costos actuales de los productos para congelarlos en el item
      const ids = Array.from(new Set(data.items.map(i=>i.productoId)))
  const select = { id: true, costoCents: true } satisfies Record<string, boolean>
  const productosRaw = await (tx.producto as unknown as { findMany: (args: { where: { id: { in: number[] } }, select: typeof select }) => Promise<Array<{ id:number; costoCents:number }>> }).findMany({ where: { id: { in: ids } }, select })
  const productos = productosRaw as Array<{ id:number; costoCents:number }>
  const costoMap = new Map(productos.map((p:{id:number;costoCents:number})=>[p.id, p.costoCents || 0]))
      await tx.pedidoItem.createMany({
        data: data.items.map(i => ({
          pedidoId: pedido.id,
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
            pedidoId: pedido.id,
            metodo: data.pago.metodo,
            montoCents: data.pago.montoCents,
            referencia: data.pago.referencia,
          }
        })
        pagoId = pago.id
      }
      return { pedidoId: pedido.id, numero, pagoId }
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
  const where: { createdAt?: { gte?: Date; lte?: Date }; estado?: OrderStatus; mesaId?: number } = {}
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }
  if (estado === 'ABIERTO' || estado === 'PAGADO' || estado === 'CANCELADO') where.estado = estado as OrderStatus
  if (mesaId) where.mesaId = Number(mesaId)
  const pedidos = await prisma.pedido.findMany({
    where,
    include: { pagos: true, mesa: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(pedidos)
}
