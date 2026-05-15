import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest, context: { params: Promise<{ productoId: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productoId } = await context.params
  
  const items = await prisma.recetaItem.findMany({
    where: { productoId: Number(productoId) },
    include: { insumo: true }
  })
  
  return NextResponse.json(items)
}

export async function PUT(req: NextRequest, context: { params: Promise<{ productoId: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productoId } = await context.params
  const id = Number(productoId)
  const body = await req.json() as { items: { insumoId: number, cantidadRequerida: number }[], requiereCocina?: boolean }
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (body.requiereCocina !== undefined) {
        await tx.producto.update({
          where: { id },
          data: { requiereCocina: body.requiereCocina }
        })
      }

      await tx.recetaItem.deleteMany({
        where: { productoId: id }
      })

      if (body.items && body.items.length > 0) {
        await tx.recetaItem.createMany({
          data: body.items.map(i => ({
            productoId: id,
            insumoId: i.insumoId,
            cantidadRequerida: i.cantidadRequerida
          }))
        })
      }
      return { ok: true }
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar receta' }, { status: 500 })
  }
}
