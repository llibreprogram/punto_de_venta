import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/tesoreria/bancos — list bank accounts with calculated balance
export async function GET() {
  try {
    const cuentas = await prisma.cuentaBancaria.findMany({
      include: {
        cuentaContable: true,
        movimientos: { orderBy: { fecha: 'desc' }, take: 50 },
      },
      orderBy: { nombre: 'asc' },
    })

    // Calculate balance for each account from movements
    const result = await Promise.all(
      cuentas.map(async (c) => {
        const agg = await prisma.movimientoBanco.aggregate({
          where: { cuentaBancariaId: c.id, tipo: { in: ['DEPOSITO', 'TRANSFERENCIA_IN', 'COBRO_CXC'] } },
          _sum: { montoCents: true },
        })
        const aggOut = await prisma.movimientoBanco.aggregate({
          where: { cuentaBancariaId: c.id, tipo: { in: ['RETIRO', 'TRANSFERENCIA_OUT', 'PAGO_CXP'] } },
          _sum: { montoCents: true },
        })
        const saldoCents = (agg._sum.montoCents || 0) - (aggOut._sum.montoCents || 0)
        return { ...c, saldoCents }
      })
    )

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tesoreria/bancos — create bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, banco, tipoCuenta, numeroCuenta, cuentaContableId } = body

    if (!nombre || !banco || !tipoCuenta || !cuentaContableId) {
      return NextResponse.json({ error: 'Nombre, banco, tipo y cuenta contable son obligatorios.' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaBancaria.create({
      data: { nombre, banco, tipoCuenta, numeroCuenta, cuentaContableId: parseInt(cuentaContableId) },
      include: { cuentaContable: true },
    })

    return NextResponse.json(cuenta)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/tesoreria/bancos — toggle active
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id } })
    if (!cuenta) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    await prisma.cuentaBancaria.update({
      where: { id },
      data: { activa: !cuenta.activa },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
