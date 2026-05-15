import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const ordenId = Number(id)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.findUnique({
        where: { id: ordenId },
        include: { items: true }
      })

      if (!orden || orden.estado === 'RECIBIDA') {
        throw new Error('Orden no válida o ya recibida')
      }

      const body = await req.json()
      const itemsRecibidos: { id: number, cantidadRecibida: number }[] = body?.itemsRecibidos || []
      const recibidosMap = new Map(itemsRecibidos.map(i => [i.id, i.cantidadRecibida]))

      let nuevoTotalCents = 0

      // 2. Por cada item, actualizar stock y registrar movimiento
      for (const item of orden.items) {
        const qtyToReceive = recibidosMap.get(item.id) ?? item.cantidadPedida
        
        // Si no se recibe nada de este item, saltamos el stock
        if (qtyToReceive > 0) {
          await tx.insumo.update({
            where: { id: item.insumoId },
            data: { 
              stockActual: { increment: qtyToReceive },
              // Bonus: Actualizar el costo base del inventario con el costo unitario de esta orden (cotización nueva)
              costoCents: item.costoUnitarioCents 
            }
          })

          await tx.movimientoInventario.create({
            data: {
              insumoId: item.insumoId,
              tipo: 'ENTRADA',
              cantidad: qtyToReceive,
              razon: `Recepción Orden de Compra #${ordenId}`,
              usuarioId: session.user.id
            }
          })
        }

        // Registrar qué cantidad real se recibió
        await tx.ordenCompraItem.update({
          where: { id: item.id },
          data: { 
            cantidadRecibida: qtyToReceive,
            totalCents: qtyToReceive * item.costoUnitarioCents
          }
        })

        nuevoTotalCents += (qtyToReceive * item.costoUnitarioCents)
      }

      // 1. Marcar orden como RECIBIDA y ajustar total final
      await tx.ordenCompra.update({
        where: { id: ordenId },
        data: { 
          estado: 'RECIBIDA',
          totalCents: nuevoTotalCents
        }
      })

      return { ok: true }
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al recibir la orden' }, { status: 500 })
  }
}
