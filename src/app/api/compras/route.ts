import prisma from '@/lib/db'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ordenes = await prisma.ordenCompra.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      proveedor: true,
      items: true
    }
  })
  return NextResponse.json(ordenes)
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { 
    proveedorId: number, 
    items: { insumoId: number, cantidadPedida: number, costoUnitarioCents: number }[] 
  }
  
  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'La orden debe tener items' }, { status: 400 })
  }

  try {
    const total = body.items.reduce((acc, i) => acc + (i.cantidadPedida * i.costoUnitarioCents), 0)
    
    // Calcular fecha esperada
    const prov = await prisma.proveedor.findUnique({ where: { id: body.proveedorId } })
    const fechaEsperada = new Date()
    fechaEsperada.setDate(fechaEsperada.getDate() + (prov?.diasEntrega || 1))

    const orden = await prisma.ordenCompra.create({
      data: {
        proveedorId: body.proveedorId,
        totalCents: total,
        fechaEsperada,
        items: {
          create: body.items.map(i => ({
            insumoId: i.insumoId,
            cantidadPedida: i.cantidadPedida,
            costoUnitarioCents: i.costoUnitarioCents,
            totalCents: i.cantidadPedida * i.costoUnitarioCents
          }))
        }
      }
    })
    return NextResponse.json(orden)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al crear la orden' }, { status: 500 })
  }
}
