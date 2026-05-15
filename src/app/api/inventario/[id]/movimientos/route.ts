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
  const insumoId = Number(id)
  const body = await req.json() as { tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE', cantidad: number, razon: string }
  
  if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(body.tipo)) {
    return NextResponse.json({ error: 'Tipo de movimiento inválido' }, { status: 400 })
  }
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Ajuste directo reemplaza el stock actual. Entrada suma, Salida resta.
      let updateData = {}
      let cantidadMovimiento = body.cantidad
      
      if (body.tipo === 'AJUSTE') {
        const insumo = await tx.insumo.findUnique({ where: { id: insumoId } })
        if (!insumo) throw new Error('Insumo no encontrado')
        // En ajuste, body.cantidad es el stock que queremos que quede.
        cantidadMovimiento = body.cantidad - insumo.stockActual // diferencia
        updateData = { stockActual: body.cantidad }
      } else if (body.tipo === 'ENTRADA') {
        updateData = { stockActual: { increment: body.cantidad } }
      } else if (body.tipo === 'SALIDA') {
        updateData = { stockActual: { decrement: body.cantidad } }
        cantidadMovimiento = -body.cantidad
      }

      await tx.insumo.update({
        where: { id: insumoId },
        data: updateData
      })

      const movimiento = await tx.movimientoInventario.create({
        data: {
          insumoId,
          tipo: body.tipo,
          cantidad: cantidadMovimiento,
          razon: body.razon || `Ajuste manual de tipo ${body.tipo}`,
          usuarioId: session.user.id
        }
      })
      
      return movimiento
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Error al procesar movimiento' }, { status: 500 })
  }
}
