/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipoReporte = searchParams.get('tipo') // "balanza", "resultados", "balance_general"
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    if (!tipoReporte) {
      return NextResponse.json({ ok: false, error: 'El parámetro tipo es obligatorio.' }, { status: 400 })
    }

    const start = fechaInicio ? new Date(fechaInicio) : new Date('2000-01-01')
    const end = fechaFin ? new Date(fechaFin) : new Date()

    // Configurar el filtro de fecha para los apuntes
    const apunteFiltroFecha: any = {}
    if (tipoReporte === 'balance_general') {
      // El balance general es acumulado hasta la fecha de corte (fechaFin)
      apunteFiltroFecha.transaccion = {
        fecha: {
          lte: end,
        },
        estado: 'POSTEADO',
      }
    } else {
      // Balanza y Estado de Resultados se filtran por rango de fechas
      apunteFiltroFecha.transaccion = {
        fecha: {
          gte: start,
          lte: end,
        },
        estado: 'POSTEADO',
      }
    }

    // 1. OBTENER TODAS LAS CUENTAS CON SUS APUNTES FILTRADOS
    const cuentas = await prisma.cuentaContable.findMany({
      include: {
        apuntes: {
          where: apunteFiltroFecha,
        },
      },
      orderBy: { codigo: 'asc' },
    })

    // Helper para procesar saldos
    const procesarCuentas = cuentas.map((c) => {
      const totalDebito = c.apuntes.reduce((sum, a) => sum + a.debitoCents, 0)
      const totalCredito = c.apuntes.reduce((sum, a) => sum + a.creditoCents, 0)
      const balance = c.naturaleza === 'DEBITO' ? totalDebito - totalCredito : totalCredito - totalDebito

      return {
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        tipo: c.tipo,
        naturaleza: c.naturaleza,
        padreId: c.padreId,
        debito: totalDebito,
        credito: totalCredito,
        balance, // saldo neto
      }
    })

    // --- REPORTE: BALANZA DE COMPROBACIÓN ---
    if (tipoReporte === 'balanza') {
      // Retornar todas las cuentas con saldo o que tengan movimientos
      const balanza = procesarCuentas.filter((c) => c.debito > 0 || c.credito > 0 || c.balance !== 0)
      return NextResponse.json({ ok: true, report: balanza })
    }

    // --- REPORTE: ESTADO DE RESULTADOS (P&L) ---
    if (tipoReporte === 'resultados') {
      const ingresos = procesarCuentas.filter((c) => c.tipo === 'INGRESO' && !c.padreId)
      const costos = procesarCuentas.filter((c) => c.tipo === 'COSTO' && !c.padreId)
      const gastos = procesarCuentas.filter((c) => c.tipo === 'GASTO' && !c.padreId)

      // Detalle de cuentas hijas con movimiento para desglose
      const detalleIngresos = procesarCuentas.filter((c) => c.tipo === 'INGRESO' && c.padreId && c.balance !== 0)
      const detalleCostos = procesarCuentas.filter((c) => c.tipo === 'COSTO' && c.padreId && c.balance !== 0)
      const detalleGastos = procesarCuentas.filter((c) => c.tipo === 'GASTO' && c.padreId && c.balance !== 0)

      const totalIngresos = detalleIngresos.reduce((sum, c) => sum + c.balance, 0)
      const totalCostos = detalleCostos.reduce((sum, c) => sum + c.balance, 0)
      const totalGastos = detalleGastos.reduce((sum, c) => sum + c.balance, 0)

      const utilidadBruta = totalIngresos - totalCostos
      const utilidadNeta = utilidadBruta - totalGastos

      // Calcular Periodo Anterior Equivalente
      const durationMs = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - durationMs)
      const prevEnd = new Date(start.getTime() - 1)

      const prevCuentas = await prisma.cuentaContable.findMany({
        include: {
          apuntes: {
            where: {
              transaccion: {
                fecha: {
                  gte: prevStart,
                  lte: prevEnd,
                },
                estado: 'POSTEADO',
              },
            },
          },
        },
      })

      const prevProcesarCuentas = prevCuentas.map((c) => {
        const totalDebito = c.apuntes.reduce((sum, a) => sum + a.debitoCents, 0)
        const totalCredito = c.apuntes.reduce((sum, a) => sum + a.creditoCents, 0)
        const balance = c.naturaleza === 'DEBITO' ? totalDebito - totalCredito : totalCredito - totalDebito
        return { tipo: c.tipo, padreId: c.padreId, balance }
      })

      const prevDetalleIngresos = prevProcesarCuentas.filter((c) => c.tipo === 'INGRESO' && c.padreId && c.balance !== 0)
      const prevDetalleCostos = prevProcesarCuentas.filter((c) => c.tipo === 'COSTO' && c.padreId && c.balance !== 0)
      const prevDetalleGastos = prevProcesarCuentas.filter((c) => c.tipo === 'GASTO' && c.padreId && c.balance !== 0)

      const prevTotalIngresos = prevDetalleIngresos.reduce((sum, c) => sum + c.balance, 0)
      const prevTotalCostos = prevDetalleCostos.reduce((sum, c) => sum + c.balance, 0)
      const prevTotalGastos = prevDetalleGastos.reduce((sum, c) => sum + c.balance, 0)

      const prevUtilidadBruta = prevTotalIngresos - prevTotalCostos
      const prevUtilidadNeta = prevUtilidadBruta - prevTotalGastos

      return NextResponse.json({
        ok: true,
        report: {
          ingresos: { total: totalIngresos, cuentas: detalleIngresos },
          costos: { total: totalCostos, cuentas: detalleCostos },
          gastos: { total: totalGastos, cuentas: detalleGastos },
          utilidadBruta,
          utilidadNeta,
          rango: { inicio: start, fin: end },
          prevPeriodo: {
            ingresos: prevTotalIngresos,
            costos: prevTotalCostos,
            gastos: prevTotalGastos,
            utilidadBruta: prevUtilidadBruta,
            utilidadNeta: prevUtilidadNeta
          }
        },
      })
    }

    // --- REPORTE: BALANCE GENERAL ---
    if (tipoReporte === 'balance_general') {
      // 1. Obtener los ingresos y egresos acumulados hasta la fecha para calcular la Utilidad del Periodo
      const ingresosAcum = cuentas
        .filter((c) => c.tipo === 'INGRESO' && c.padreId)
        .reduce((sum, c) => {
          const deb = c.apuntes.reduce((s, a) => s + a.debitoCents, 0)
          const cred = c.apuntes.reduce((s, a) => s + a.creditoCents, 0)
          return sum + (cred - deb) // naturaleza crédito
        }, 0)

      const costosAcum = cuentas
        .filter((c) => c.tipo === 'COSTO' && c.padreId)
        .reduce((sum, c) => {
          const deb = c.apuntes.reduce((s, a) => s + a.debitoCents, 0)
          const cred = c.apuntes.reduce((s, a) => s + a.creditoCents, 0)
          return sum + (deb - cred) // naturaleza débito
        }, 0)

      const gastosAcum = cuentas
        .filter((c) => c.tipo === 'GASTO' && c.padreId)
        .reduce((sum, c) => {
          const deb = c.apuntes.reduce((s, a) => s + a.debitoCents, 0)
          const cred = c.apuntes.reduce((s, a) => s + a.creditoCents, 0)
          return sum + (deb - cred) // naturaleza débito
        }, 0)

      const utilidadPeriodoCents = ingresosAcum - (costosAcum + gastosAcum)

      // 2. Agrupar cuentas de Activo, Pasivo y Patrimonio
      const activos = procesarCuentas.filter((c) => c.tipo === 'ACTIVO' && c.padreId && c.balance !== 0)
      const pasivos = procesarCuentas.filter((c) => c.tipo === 'PASIVO' && c.padreId && c.balance !== 0)
      const patrimonio = procesarCuentas.filter((c) => c.tipo === 'PATRIMONIO' && c.padreId && c.balance !== 0)

      const totalActivos = activos.reduce((sum, c) => sum + c.balance, 0)
      const totalPasivos = pasivos.reduce((sum, c) => sum + c.balance, 0)
      const totalPatrimonioCuentas = patrimonio.reduce((sum, c) => sum + c.balance, 0)
      const totalPatrimonio = totalPatrimonioCuentas + utilidadPeriodoCents

      return NextResponse.json({
        ok: true,
        report: {
          activos: { total: totalActivos, cuentas: activos },
          pasivos: { total: totalPasivos, cuentas: pasivos },
          patrimonio: {
            total: totalPatrimonio,
            cuentas: [
              ...patrimonio,
              {
                id: -99,
                codigo: '3.1.02.01',
                nombre: 'Utilidad del Periodo Actual',
                tipo: 'PATRIMONIO',
                naturaleza: 'CREDITO',
                balance: utilidadPeriodoCents,
              },
            ],
          },
          cuadre: totalActivos === totalPasivos + totalPatrimonio,
          diferencia: totalActivos - (totalPasivos + totalPatrimonio),
          corte: end,
        },
      })
    }

    return NextResponse.json({ ok: false, error: 'Tipo de reporte inválido.' }, { status: 400 })
  } catch (error: any) {
    console.error('Error al generar reporte financiero:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
