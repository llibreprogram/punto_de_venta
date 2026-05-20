import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/tesoreria/cxc — list accounts receivable
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')

    const where: any = {}
    if (estado && estado !== 'TODOS') where.estado = estado

    const docs = await prisma.documentoPorCobrar.findMany({
      where,
      include: { cobros: { orderBy: { fecha: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    })

    const totalPendienteCents = docs.filter(d => d.estado !== 'COBRADO').reduce((s, d) => s + (d.montoCents - d.cobradoCents), 0)
    const now = new Date()
    const totalCobradoMesCents = docs.reduce((s, d) => {
      return s + d.cobros.filter(c => c.fecha.getMonth() === now.getMonth() && c.fecha.getFullYear() === now.getFullYear()).reduce((ss, c) => ss + c.montoCents, 0)
    }, 0)

    return NextResponse.json({ docs, totalPendienteCents, totalCobradoMesCents })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tesoreria/cxc — create receivable document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clienteNombre, clienteRnc, clienteTelefono, descripcion, ncf, montoCents, fechaVencimiento, pedidoId } = body

    if (!clienteNombre || !descripcion || !montoCents || montoCents <= 0) {
      return NextResponse.json({ error: 'Cliente, descripción y monto son obligatorios.' }, { status: 400 })
    }

    const doc = await prisma.documentoPorCobrar.create({
      data: {
        clienteNombre,
        clienteRnc,
        clienteTelefono,
        descripcion,
        ncf,
        montoCents: parseInt(montoCents),
        pedidoId: pedidoId ? parseInt(pedidoId) : null,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      },
    })

    return NextResponse.json(doc)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
