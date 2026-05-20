import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { crearAsiento, ApunteInput } from '@/lib/accounting'

// POST /api/tesoreria/cxp/[id]/pagar — register payment for a payable
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { montoCents, metodoPago, referencia } = body

    if (!montoCents || montoCents <= 0 || !metodoPago) {
      return NextResponse.json({ error: 'Monto y método de pago son obligatorios.' }, { status: 400 })
    }

    const doc = await prisma.documentoPorPagar.findUnique({
      where: { id: parseInt(id) },
      include: { proveedor: true },
    })
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 })

    const restante = doc.montoCents - doc.pagadoCents
    if (montoCents > restante) {
      return NextResponse.json({ error: `El monto excede el saldo pendiente de RD$ ${(restante / 100).toFixed(2)}` }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Create payment record
      await tx.pagoCXP.create({
        data: { documentoId: doc.id, montoCents, metodoPago, referencia },
      })

      // Update document
      const nuevoPagado = doc.pagadoCents + montoCents
      const nuevoEstado = nuevoPagado >= doc.montoCents ? 'PAGADO' : 'PARCIAL'
      await tx.documentoPorPagar.update({
        where: { id: doc.id },
        data: { pagadoCents: nuevoPagado, estado: nuevoEstado },
      })

      // Create accounting entry: Debit CXP / Credit Bank or Cash
      const apuntes: ApunteInput[] = [
        { cuentaCodigo: '2.1.01.01', debitoCents: montoCents, creditoCents: 0, referencia: `Pago CXP ${doc.descripcion}` },
      ]

      if (metodoPago === 'EFECTIVO') {
        apuntes.push({ cuentaCodigo: '1.1.01.01', debitoCents: 0, creditoCents: montoCents, referencia: `Pago Efectivo a ${doc.proveedor?.nombre || 'Proveedor'}` })
      } else {
        apuntes.push({ cuentaCodigo: '1.1.01.02', debitoCents: 0, creditoCents: montoCents, referencia: `Pago Bancario a ${doc.proveedor?.nombre || 'Proveedor'}` })
      }

      await crearAsiento(
        new Date(),
        `Pago CXP: ${doc.descripcion}`,
        referencia || '',
        'TESORERIA',
        apuntes,
        tx
      )
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
