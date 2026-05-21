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
    const tipoReporte = searchParams.get('tipo') // "balanza", "resultados", "balance_general"
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    if (!tipoReporte) {
      return NextResponse.json({ ok: false, error: 'El parámetro tipo es obligatorio.' }, { status: 400 })
    }

    const start = fechaInicio ? new Date(fechaInicio) : new Date('2000-01-01')
    const end = fechaFin ? new Date(fechaFin) : new Date()

    const apunteFiltroFecha: any = {}
    if (tipoReporte === 'balance_general') {
      apunteFiltroFecha.transaccion = {
        fecha: { lte: end },
        estado: 'POSTEADO',
      }
    } else {
      apunteFiltroFecha.transaccion = {
        fecha: { gte: start, lte: end },
        estado: 'POSTEADO',
      }
    }

    const cuentas = await prisma.cuentaContable.findMany({
      include: {
        apuntes: { where: apunteFiltroFecha },
      },
      orderBy: { codigo: 'asc' },
    })

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
        debito: totalDebito / 100,
        credito: totalCredito / 100,
        balance: balance / 100,
      }
    })

    let csvContent = ''
    let filename = 'reporte.csv'

    const fmtNum = (num: number) => num.toFixed(2)

    if (tipoReporte === 'balanza') {
      filename = `balanza_comprobacion_${fechaInicio || 'inicio'}_${fechaFin || 'fin'}.csv`
      csvContent += 'Código,Cuenta,Tipo,Naturaleza,Débito (RD$),Crédito (RD$),Saldo Neto (RD$)\n'
      const balanza = procesarCuentas.filter((c) => c.debito > 0 || c.credito > 0 || c.balance !== 0)
      balanza.forEach(c => {
        csvContent += `"${c.codigo}","${c.nombre}","${c.tipo}","${c.naturaleza}",${fmtNum(c.debito)},${fmtNum(c.credito)},${fmtNum(c.balance)}\n`
      })
    } 
    else if (tipoReporte === 'resultados') {
      filename = `estado_resultados_${fechaInicio || 'inicio'}_${fechaFin || 'fin'}.csv`
      csvContent += 'ESTADO DE RESULTADOS (P&L)\n'
      csvContent += `Periodo: ${start.toLocaleDateString()} al ${end.toLocaleDateString()}\n\n`
      csvContent += 'Código,Cuenta,Monto (RD$)\n'

      const detalleIngresos = procesarCuentas.filter((c) => c.tipo === 'INGRESO' && c.padreId && c.balance !== 0)
      const detalleCostos = procesarCuentas.filter((c) => c.tipo === 'COSTO' && c.padreId && c.balance !== 0)
      const detalleGastos = procesarCuentas.filter((c) => c.tipo === 'GASTO' && c.padreId && c.balance !== 0)

      const totalIngresos = detalleIngresos.reduce((sum, c) => sum + c.balance, 0)
      const totalCostos = detalleCostos.reduce((sum, c) => sum + c.balance, 0)
      const totalGastos = detalleGastos.reduce((sum, c) => sum + c.balance, 0)

      csvContent += 'INGRESOS OPERACIONALES\n'
      detalleIngresos.forEach(c => {
        csvContent += `"${c.codigo}","${c.nombre}",${fmtNum(c.balance)}\n`
      })
      csvContent += `,,${fmtNum(totalIngresos)}\n\n`

      csvContent += 'COSTO DE VENTAS\n'
      detalleCostos.forEach(c => {
        csvContent += `"${c.codigo}","${c.nombre}",${fmtNum(c.balance)}\n`
      })
      csvContent += `,,${fmtNum(totalCostos)}\n`
      csvContent += `UTILIDAD BRUTA,,${fmtNum(totalIngresos - totalCostos)}\n\n`

      csvContent += 'GASTOS OPERATIVOS\n'
      detalleGastos.forEach(c => {
        csvContent += `"${c.codigo}","${c.nombre}",${fmtNum(c.balance)}\n`
      })
      csvContent += `,,${fmtNum(totalGastos)}\n`
      csvContent += `UTILIDAD NETA,,${fmtNum(totalIngresos - totalCostos - totalGastos)}\n`
    } 
    else if (tipoReporte === 'balance_general') {
      filename = `balance_general_${fechaFin || 'fin'}.csv`
      csvContent += 'BALANCE GENERAL\n'
      csvContent += `Al: ${end.toLocaleDateString()}\n\n`
      csvContent += 'Código,Cuenta,Monto (RD$)\n'

      const ingresosAcum = cuentas
        .filter((c) => c.tipo === 'INGRESO' && c.padreId)
        .reduce((sum, c) => {
          const deb = c.apuntes.reduce((s, a) => s + a.debitoCents, 0)
          const cred = c.apuntes.reduce((s, a) => s + a.creditoCents, 0)
          return sum + (cred - deb)
        }, 0)

      const costosAcum = cuentas
        .filter((c) => c.tipo === 'COSTO' && c.padreId)
        .reduce((sum, c) => {
          const deb = c.apuntes.reduce((s, a) => s + a.debitoCents, 0)
          const cred = c.apuntes.reduce((s, a) => s + a.creditoCents, 0)
          return sum + (deb - cred)
        }, 0)

      const gastosAcum = cuentas
        .filter((c) => c.tipo === 'GASTO' && c.padreId)
        .reduce((sum, c) => {
          const deb = c.apuntes.reduce((s, a) => s + a.debitoCents, 0)
          const cred = c.apuntes.reduce((s, a) => s + a.creditoCents, 0)
          return sum + (deb - cred)
        }, 0)

      const utilidadPeriodo = (ingresosAcum - (costosAcum + gastosAcum)) / 100

      const activos = procesarCuentas.filter((c) => c.tipo === 'ACTIVO' && c.padreId && c.balance !== 0)
      const pasivos = procesarCuentas.filter((c) => c.tipo === 'PASIVO' && c.padreId && c.balance !== 0)
      const patrimonio = procesarCuentas.filter((c) => c.tipo === 'PATRIMONIO' && c.padreId && c.balance !== 0)

      const totalActivos = activos.reduce((sum, c) => sum + c.balance, 0)
      const totalPasivos = pasivos.reduce((sum, c) => sum + c.balance, 0)
      const totalPatrimonio = patrimonio.reduce((sum, c) => sum + c.balance, 0) + utilidadPeriodo

      csvContent += 'ACTIVOS\n'
      activos.forEach(c => {
        csvContent += `"${c.codigo}","${c.nombre}",${fmtNum(c.balance)}\n`
      })
      csvContent += `TOTAL ACTIVOS,,${fmtNum(totalActivos)}\n\n`

      csvContent += 'PASIVOS\n'
      pasivos.forEach(c => {
        csvContent += `"${c.codigo}","${c.nombre}",${fmtNum(c.balance)}\n`
      })
      csvContent += `TOTAL PASIVOS,,${fmtNum(totalPasivos)}\n\n`

      csvContent += 'PATRIMONIO\n'
      patrimonio.forEach(c => {
        csvContent += `"${c.codigo}","${c.nombre}",${fmtNum(c.balance)}\n`
      })
      csvContent += `"3.1.02.01","Utilidad del Periodo Actual",${fmtNum(utilidadPeriodo)}\n`
      csvContent += `TOTAL PATRIMONIO,,${fmtNum(totalPatrimonio)}\n`
      csvContent += `TOTAL PASIVO + PATRIMONIO,,${fmtNum(totalPasivos + totalPatrimonio)}\n`
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error al exportar reporte:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
