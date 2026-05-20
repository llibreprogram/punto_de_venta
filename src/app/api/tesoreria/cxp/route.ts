import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/tesoreria/cxp — list accounts payable
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const proveedorId = searchParams.get('proveedorId')

    const where: any = {}
    if (estado && estado !== 'TODOS') where.estado = estado
    if (proveedorId) where.proveedorId = parseInt(proveedorId)

    const docs = await prisma.documentoPorPagar.findMany({
      where,
      include: { proveedor: true, pagos: { orderBy: { fecha: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    })

    // Summary
    const totalPendienteCents = docs.filter(d => d.estado !== 'PAGADO').reduce((s, d) => s + (d.montoCents - d.pagadoCents), 0)
    const totalPagadoMesCents = docs.reduce((s, d) => {
      const now = new Date()
      return s + d.pagos.filter(p => p.fecha.getMonth() === now.getMonth() && p.fecha.getFullYear() === now.getFullYear()).reduce((ss, p) => ss + p.montoCents, 0)
    }, 0)

    const vencidos = docs.filter(d => d.estado !== 'PAGADO' && d.fechaVencimiento && new Date(d.fechaVencimiento) < new Date()).length

    return NextResponse.json({ docs, totalPendienteCents, totalPagadoMesCents, vencidos })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tesoreria/cxp — create payable document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { proveedorId, categoria, descripcion, ncf, montoCents, fechaVencimiento, facturaEscaneadaUrl } = body

    if (!descripcion || !montoCents || montoCents <= 0) {
      return NextResponse.json({ error: 'Descripción y monto son obligatorios.' }, { status: 400 })
    }

    const doc = await prisma.documentoPorPagar.create({
      data: {
        proveedor: proveedorId ? { connect: { id: parseInt(proveedorId) } } : undefined,
        categoria: categoria || 'OTROS',
        descripcion,
        ncf,
        montoCents: parseInt(montoCents),
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        facturaEscaneadaUrl: facturaEscaneadaUrl || null,
      },
      include: { proveedor: true },
    })

    return NextResponse.json(doc)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
