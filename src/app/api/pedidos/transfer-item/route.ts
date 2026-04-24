/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

type Body = {
  itemId: number
  qtyToMove: number
  targetPedidoId: number | null
  mesaId: number
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { itemId, qtyToMove, targetPedidoId, mesaId } = await req.json() as Body
    
    if (!itemId || qtyToMove <= 0 || !mesaId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } })

    const res = await prisma.$transaction(async (tx) => {
      const item = await tx.pedidoItem.findUnique({
        where: { id: itemId },
        include: { pedido: true }
      })

      if (!item || item.pedido.estado !== 'ABIERTO') {
        throw new Error('Item no existe o pedido no está abierto')
      }

      if (qtyToMove > item.cantidad) {
        throw new Error('Cantidad a mover excede la cantidad del item')
      }

      let destPedidoId = targetPedidoId

      if (!destPedidoId) {
        // Crear nuevo pedido para la mesa
        const last = await tx.pedido.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } })
        const numero = (last?.numero ?? 0) + 1

        const max = await tx.pedido.aggregate({
          _max: { subCuenta: true },
          where: { mesaId: mesaId, estado: 'ABIERTO' },
        })
        const subCuenta = (max._max.subCuenta || 0) + 1

        const nuevoPedido = await tx.pedido.create({
          data: {
            numero,
            estado: 'ABIERTO',
            mesaId,
            subCuenta,
            subtotalCents: 0,
            impuestoCents: 0,
            itebisCents: 0,
            propinaCents: 0,
            descuentoCents: 0,
            totalCents: 0,
          }
        })
        destPedidoId = nuevoPedido.id
      } else {
        const dest = await tx.pedido.findUnique({ where: { id: destPedidoId } })
        if (!dest || dest.estado !== 'ABIERTO') throw new Error('Pedido destino no válido')
      }

      // Mover el item
      if (qtyToMove === item.cantidad) {
        await tx.pedidoItem.update({
          where: { id: itemId },
          data: { pedidoId: destPedidoId }
        })
      } else {
        // Reducir original
        await tx.pedidoItem.update({
          where: { id: itemId },
          data: { 
            cantidad: item.cantidad - qtyToMove,
            totalCents: (item.cantidad - qtyToMove) * item.precioCents
          }
        })
        // Crear nuevo en destino
        await tx.pedidoItem.create({
          data: {
            pedidoId: destPedidoId,
            productoId: item.productoId,
            cantidad: qtyToMove,
            precioCents: item.precioCents,
            costoCents: item.costoCents,
            totalCents: qtyToMove * item.precioCents,
            removidos: item.removidos || undefined,
            notas: item.notas || undefined,
            extras: item.extras || undefined,
            extrasCents: item.extrasCents,
            estado: item.estado,
          }
        })
      }

      // Recalcular source y target
      const recalc = async (orderId: number) => {
        const items = await tx.pedidoItem.findMany({ where: { pedidoId: orderId } })
        if (items.length === 0) {
          await tx.pedido.delete({ where: { id: orderId } })
          return null
        }
        const subtotal = items.reduce((a, i) => a + i.precioCents * i.cantidad, 0)
        const order = await tx.pedido.findUnique({ where: { id: orderId } })
        const desc = order?.descuentoCents || 0
        const baseImp = Math.max(0, subtotal - desc)
        const itebis = Math.round(baseImp * ((ajustes?.taxPct || 0) / 100))
        const propina = Math.round(baseImp * ((ajustes?.propinaPct || 0) / 100))
        const total = baseImp + itebis + propina
        await tx.pedido.update({
          where: { id: orderId },
          data: {
            subtotalCents: subtotal,
            itebisCents: itebis,
            propinaCents: propina,
            impuestoCents: itebis + propina,
            totalCents: total
          }
        })
      }

      await recalc(item.pedidoId)
      if (item.pedidoId !== destPedidoId) {
        await recalc(destPedidoId)
      }

      return { ok: true }
    })

    return NextResponse.json(res)
  } catch (e: any) {
    console.error('[transfer-item]', e)
    return NextResponse.json({ error: e.message || 'Error al transferir' }, { status: 500 })
  }
}
