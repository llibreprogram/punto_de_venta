import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { crearAsiento, ApunteInput } from '@/lib/accounting'

// GET /api/tesoreria/bancos/[id]/movimientos
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const movimientos = await prisma.movimientoBanco.findMany({
      where: { cuentaBancariaId: parseInt(id) },
      orderBy: { fecha: 'desc' },
      take: 100,
    })
    return NextResponse.json(movimientos)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tesoreria/bancos/[id]/movimientos — deposit, withdraw, transfer
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tipo, montoCents, descripcion, referencia, cuentaDestinoId } = body

    if (!tipo || !montoCents || montoCents <= 0) {
      return NextResponse.json({ error: 'Tipo y monto son obligatorios.' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaBancaria.findUnique({
      where: { id: parseInt(id) },
      include: { cuentaContable: true },
    })
    if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      const apuntes: ApunteInput[] = []

      if (tipo === 'DEPOSITO') {
        // Deposit: money goes IN to bank, OUT from cash
        await tx.movimientoBanco.create({
          data: { cuentaBancariaId: cuenta.id, tipo: 'DEPOSITO', montoCents, descripcion: descripcion || 'Depósito', referencia },
        })
        apuntes.push(
          { cuentaCodigo: cuenta.cuentaContable.codigo, debitoCents: montoCents, creditoCents: 0, referencia: `Depósito ${cuenta.nombre}` },
          { cuentaCodigo: '1.1.01.01', debitoCents: 0, creditoCents: montoCents, referencia: 'Salida de Caja por Depósito' }
        )
      } else if (tipo === 'RETIRO') {
        // Withdraw: money goes OUT from bank, IN to cash
        await tx.movimientoBanco.create({
          data: { cuentaBancariaId: cuenta.id, tipo: 'RETIRO', montoCents, descripcion: descripcion || 'Retiro', referencia },
        })
        apuntes.push(
          { cuentaCodigo: '1.1.01.01', debitoCents: montoCents, creditoCents: 0, referencia: 'Entrada a Caja por Retiro' },
          { cuentaCodigo: cuenta.cuentaContable.codigo, debitoCents: 0, creditoCents: montoCents, referencia: `Retiro de ${cuenta.nombre}` }
        )
      } else if (tipo === 'TRANSFERENCIA' && cuentaDestinoId) {
        // Transfer between bank accounts
        const destino = await tx.cuentaBancaria.findUnique({
          where: { id: parseInt(cuentaDestinoId) },
          include: { cuentaContable: true },
        })
        if (!destino) throw new Error('Cuenta destino no encontrada.')

        await tx.movimientoBanco.create({
          data: { cuentaBancariaId: cuenta.id, tipo: 'TRANSFERENCIA_OUT', montoCents, descripcion: descripcion || `Transferencia a ${destino.nombre}`, referencia },
        })
        await tx.movimientoBanco.create({
          data: { cuentaBancariaId: destino.id, tipo: 'TRANSFERENCIA_IN', montoCents, descripcion: descripcion || `Transferencia desde ${cuenta.nombre}`, referencia },
        })

        apuntes.push(
          { cuentaCodigo: destino.cuentaContable.codigo, debitoCents: montoCents, creditoCents: 0, referencia: `Transferencia IN desde ${cuenta.nombre}` },
          { cuentaCodigo: cuenta.cuentaContable.codigo, debitoCents: 0, creditoCents: montoCents, referencia: `Transferencia OUT a ${destino.nombre}` }
        )
      } else {
        throw new Error('Tipo de movimiento no válido.')
      }

      // Create accounting entry
      await crearAsiento(
        new Date(),
        descripcion || `Movimiento bancario: ${tipo}`,
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
