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

      // 1. Marcar orden como RECIBIDA
      await tx.ordenCompra.update({
        where: { id: ordenId },
        data: { estado: 'RECIBIDA' }
      })

      // 2. Por cada item, actualizar stock y registrar movimiento
      for (const item of orden.items) {
        // Asumimos que se recibe todo lo pedido por simplicidad
        await tx.ordenCompraItem.update({
          where: { id: item.id },
          data: { cantidadRecibida: item.cantidadPedida }
        })

        await tx.insumo.update({
          where: { id: item.insumoId },
          data: { stockActual: { increment: item.cantidadPedida } }
        })

        await tx.movimientoInventario.create({
          data: {
            insumoId: item.insumoId,
            tipo: 'ENTRADA',
            cantidad: item.cantidadPedida,
            razon: `Recepción Orden de Compra #${ordenId}`,
            usuarioId: session.user.id
          }
        })
      }
      return { ok: true }
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al recibir la orden' }, { status: 500 })
  }
}
