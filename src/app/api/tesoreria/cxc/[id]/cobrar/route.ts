import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { crearAsiento, ApunteInput } from '@/lib/accounting'

// POST /api/tesoreria/cxc/[id]/cobrar — register collection for a receivable
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { montoCents, metodoPago, referencia } = body

    if (!montoCents || montoCents <= 0 || !metodoPago) {
      return NextResponse.json({ error: 'Monto y método de pago son obligatorios.' }, { status: 400 })
    }

    const doc = await prisma.documentoPorCobrar.findUnique({ where: { id: parseInt(id) } })
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 })

    const restante = doc.montoCents - doc.cobradoCents
    if (montoCents > restante) {
      return NextResponse.json({ error: `El monto excede el saldo pendiente de RD$ ${(restante / 100).toFixed(2)}` }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.cobroCXC.create({
        data: { documentoId: doc.id, montoCents, metodoPago, referencia },
      })

      const nuevoCobrado = doc.cobradoCents + montoCents
      const nuevoEstado = nuevoCobrado >= doc.montoCents ? 'COBRADO' : 'PARCIAL'
      await tx.documentoPorCobrar.update({
        where: { id: doc.id },
        data: { cobradoCents: nuevoCobrado, estado: nuevoEstado },
      })

      // Accounting: Debit Cash/Bank, Credit CXC
      const apuntes: ApunteInput[] = []

      if (metodoPago === 'EFECTIVO') {
        apuntes.push({ cuentaCodigo: '1.1.01.01', debitoCents: montoCents, creditoCents: 0, referencia: `Cobro CXC ${doc.clienteNombre}` })
      } else {
        apuntes.push({ cuentaCodigo: '1.1.01.02', debitoCents: montoCents, creditoCents: 0, referencia: `Cobro CXC ${doc.clienteNombre}` })
      }

      apuntes.push({ cuentaCodigo: '1.1.03.01', debitoCents: 0, creditoCents: montoCents, referencia: `Cobro a ${doc.clienteNombre}` })

      await crearAsiento(
        new Date(),
        `Cobro CXC: ${doc.descripcion} - ${doc.clienteNombre}`,
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
