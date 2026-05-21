/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)

    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cuentaCodigo = searchParams.get('cuentaCodigo')
    const fechaInicioStr = searchParams.get('fechaInicio')
    const fechaFinStr = searchParams.get('fechaFin')

    if (!cuentaCodigo) {
      return NextResponse.json({ ok: false, error: 'El código de cuenta es obligatorio.' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaContable.findUnique({
      where: { codigo: cuentaCodigo }
    })

    if (!cuenta) {
      return NextResponse.json({ ok: false, error: 'Cuenta contable no encontrada.' }, { status: 404 })
    }

    const fechaInicio = fechaInicioStr ? new Date(fechaInicioStr) : new Date('2020-01-01T00:00:00.000Z')
    const fechaFin = fechaFinStr ? new Date(fechaFinStr) : new Date()

    // 1. Calcular Saldo Inicial (previo a fechaInicio)
    const apuntesPrevios = await prisma.apunteContable.findMany({
      where: {
        cuentaId: cuenta.id,
        transaccion: {
          fecha: { lt: fechaInicio },
          estado: 'POSTEADO'
        }
      }
    })

    let sumDebitoPrevio = 0
    let sumCreditoPrevio = 0
    apuntesPrevios.forEach(ap => {
      sumDebitoPrevio += ap.debitoCents
      sumCreditoPrevio += ap.creditoCents
    })

    let saldoInicialCents = 0
    if (cuenta.naturaleza === 'DEBITO') {
      saldoInicialCents = sumDebitoPrevio - sumCreditoPrevio
    } else {
      saldoInicialCents = sumCreditoPrevio - sumDebitoPrevio
    }

    // 2. Obtener movimientos en el rango de fechas
    const apuntes = await prisma.apunteContable.findMany({
      where: {
        cuentaId: cuenta.id,
        transaccion: {
          fecha: { gte: fechaInicio, lte: fechaFin },
          estado: 'POSTEADO'
        }
      },
      include: {
        transaccion: true
      },
      orderBy: [
        { transaccion: { fecha: 'asc' } },
        { id: 'asc' }
      ]
    })

    // 3. Generar el Libro Mayor con Running Balance (saldo acumulado progresivo)
    let saldoAcumuladoCents = saldoInicialCents
    const movimientos = apuntes.map(ap => {
      const debito = ap.debitoCents
      const credito = ap.creditoCents

      if (cuenta.naturaleza === 'DEBITO') {
        saldoAcumuladoCents += (debito - credito)
      } else {
        saldoAcumuladoCents += (credito - debito)
      }

      return {
        id: ap.id,
        fecha: ap.transaccion.fecha,
        asientoId: ap.transaccion.id,
        asientoNumero: ap.transaccion.numero,
        descripcion: ap.transaccion.descripcion,
        referencia: ap.referencia || ap.transaccion.referencia || '',
        debitoCents: debito,
        creditoCents: credito,
        saldoAcumuladoCents
      }
    })

    return NextResponse.json({
      ok: true,
      cuenta: {
        id: cuenta.id,
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        naturaleza: cuenta.naturaleza,
        tipo: cuenta.tipo
      },
      rango: {
        inicio: fechaInicio,
        fin: fechaFin
      },
      saldoInicialCents,
      saldoFinalCents: saldoAcumuladoCents,
      movimientos
    })
  } catch (error: any) {
    console.error('Error al generar libro mayor:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
