import prisma from '@/lib/db'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const insumos = await prisma.insumo.findMany({
    orderBy: { nombre: 'asc' }
  })
  return NextResponse.json(insumos)
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  try {
    const insumo = await prisma.insumo.create({
      data: {
        nombre: body.nombre,
        unidadMedida: body.unidadMedida,
        costoCents: Number(body.costoCents) || 0,
        stockActual: Number(body.stockActual) || 0,
        stockMinimo: Number(body.stockMinimo) || 0,
        proveedorId: body.proveedorId || null,
        diasVidaUtil: Number(body.diasVidaUtil) || 365
      }
    })
    
    // Registrar el movimiento inicial
    if (insumo.stockActual > 0) {
      await prisma.movimientoInventario.create({
        data: {
          insumoId: insumo.id,
          tipo: 'ENTRADA',
          cantidad: insumo.stockActual,
          razon: 'Inventario inicial',
          usuarioId: session.user.id
        }
      })
    }
    
    return NextResponse.json(insumo)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear insumo' }, { status: 500 })
  }
}
