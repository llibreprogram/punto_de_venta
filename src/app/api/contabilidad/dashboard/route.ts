/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Obtener catálogo de cuentas base para mapear tipos y naturalezas
    const cuentasBase = await prisma.cuentaContable.findMany({
      select: {
        id: true,
        tipo: true,
        naturaleza: true,
        padreId: true
      }
    })
    const cuentaMap = new Map(cuentasBase.map(c => [c.id, c]))

    const aggregatePeriod = async (start: Date, end: Date) => {
      const aggregates = await prisma.apunteContable.groupBy({
        by: ['cuentaId'],
        where: {
          transaccion: {
            fecha: { gte: start, lte: end },
            estado: 'POSTEADO'
          }
        },
        _sum: {
          debitoCents: true,
          creditoCents: true
        }
      })

      let ingresos = 0, costos = 0, gastos = 0
      aggregates.forEach(agg => {
        const c = cuentaMap.get(agg.cuentaId)
        if (!c) return

        const deb = agg._sum.debitoCents || 0
        const cred = agg._sum.creditoCents || 0
        const bal = c.naturaleza === 'DEBITO' ? deb - cred : cred - deb

        if (c.tipo === 'INGRESO' && c.padreId) ingresos += bal
        if (c.tipo === 'COSTO' && c.padreId) costos += bal
        if (c.tipo === 'GASTO' && c.padreId) gastos += bal
      })

      return { ingresos, costos, gastos, utilidad: ingresos - costos - gastos }
    }

    const mesActual = await aggregatePeriod(startOfMonth, now)
    const mesAnterior = await aggregatePeriod(startOfPrevMonth, endOfPrevMonth)

    // 2. Flujo de caja — últimos 6 meses (agregado eficientemente)
    const cashFlow: Array<{ mes: string; ingresos: number; gastos: number }> = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = i === 0 ? now : new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const data = await aggregatePeriod(mStart, mEnd)
      cashFlow.push({
        mes: mStart.toLocaleDateString('es-DO', { month: 'short', year: '2-digit' }),
        ingresos: data.ingresos,
        gastos: data.costos + data.gastos,
      })
    }

    // 3. Últimos 10 asientos
    const ultimosAsientos = await prisma.transaccionContable.findMany({
      take: 10,
      orderBy: { fecha: 'desc' },
      select: {
        id: true,
        numero: true,
        fecha: true,
        descripcion: true,
        origen: true,
        apuntes: {
          select: { debitoCents: true },
        },
      },
    })

    const timeline = ultimosAsientos.map((a) => ({
      id: a.id,
      numero: a.numero,
      fecha: a.fecha,
      descripcion: a.descripcion,
      origen: a.origen || 'MANUAL',
      monto: a.apuntes.reduce((s, ap) => s + ap.debitoCents, 0),
    }))

    // 4. Alertas
    // NCF con menos de 15% de folios
    const secuencias = await prisma.secuenciaNcf.findMany({ where: { activa: true } })
    const ncfAlerts = secuencias.filter((s) => {
      const total = s.fin - s.inicio + 1
      const usado = s.actual - s.inicio + 1
      return (total - usado) / total < 0.15
    }).length

    // CXP vencidas
    const cxpVencidas = await prisma.documentoPorPagar.count({
      where: {
        estado: { not: 'PAGADO' },
        fechaVencimiento: { lt: now },
      },
    })

    // CXC vencidas
    const cxcVencidas = await prisma.documentoPorCobrar.count({
      where: {
        estado: { not: 'COBRADO' },
        fechaVencimiento: { lt: now },
      },
    })

    // 5. Totales CXP/CXC pendientes
    const cxpPendientes = await prisma.documentoPorPagar.findMany({
      where: { estado: { not: 'PAGADO' } },
      select: { montoCents: true, pagadoCents: true },
    })
    const totalCxp = cxpPendientes.reduce((s, d) => s + (d.montoCents - d.pagadoCents), 0)

    const cxcPendientes = await prisma.documentoPorCobrar.findMany({
      where: { estado: { not: 'COBRADO' } },
      select: { montoCents: true, cobradoCents: true },
    })
    const totalCxc = cxcPendientes.reduce((s, d) => s + (d.montoCents - d.cobradoCents), 0)

    return NextResponse.json({
      ok: true,
      kpis: {
        ingresosMes: mesActual.ingresos,
        gastosMes: mesActual.costos + mesActual.gastos,
        utilidadMes: mesActual.utilidad,
        margenPct: mesActual.ingresos > 0
          ? Math.round((mesActual.utilidad / mesActual.ingresos) * 100)
          : 0,
        trendIngresos: mesAnterior.ingresos > 0
          ? Math.round(((mesActual.ingresos - mesAnterior.ingresos) / mesAnterior.ingresos) * 100)
          : 0,
        trendGastos: (mesAnterior.costos + mesAnterior.gastos) > 0
          ? Math.round((((mesActual.costos + mesActual.gastos) - (mesAnterior.costos + mesAnterior.gastos)) / (mesAnterior.costos + mesAnterior.gastos)) * 100)
          : 0,
        alertas: ncfAlerts + cxpVencidas + cxcVencidas,
        ncfAlerts,
        cxpVencidas,
        cxcVencidas,
      },
      cashFlow,
      timeline,
      resumen: {
        totalCxp,
        totalCxc,
        cxpCount: cxpPendientes.length,
        cxcCount: cxcPendientes.length,
      },
    })
  } catch (error: any) {
    console.error('Error en dashboard contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
