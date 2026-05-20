/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper para formatear fechas a AAAAMMDD
function formatDateToAAAAMMDD(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

// Helper para formatear centavos a decimales con punto
function formatCentsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2)
}

// GET /api/dgii/formatos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') // "606", "607", "608", "it1"
    const periodo = searchParams.get('periodo') // Formato: "YYYY-MM" (ej: "2026-05")
    const format = searchParams.get('format') // "txt" o "json"

    if (!tipo || !periodo) {
      return NextResponse.json({ ok: false, error: 'Los parámetros tipo y periodo son obligatorios.' }, { status: 400 })
    }

    const [yearStr, monthStr] = periodo.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Fin de mes

    // Obtener RNC de Ajustes para el encabezado
    const ajustes = await prisma.ajustes.findFirst()
    const businessRnc = ajustes?.businessRnc?.replace(/[^0-9]/g, '') || '130000000'
    const periodString = `${yearStr}${monthStr}`

    // --- FORMATO 606 (COMPRAS) ---
    if (tipo === '606') {
      const compras = await prisma.registroFiscal.findMany({
        where: {
          tipo: 'COMPRA',
          fechaComprobante: {
            gte: startDate,
            lte: endDate,
          },
          estado: 'ACTIVO',
        },
        orderBy: { fechaComprobante: 'asc' },
      })

      if (format === 'txt') {
        // Generar encabezado: RNC|Periodo|CantidadRegistros
        let txt = `${businessRnc}|${periodString}|${compras.length}\n`

        compras.forEach((c) => {
          const rncProveedor = c.rncCedula
          const tipoId = c.tipoId
          const tipoGasto = c.tipoGasto || '11'
          const ncf = c.ncf
          const ncfModificado = c.ncfModificado || ''
          const fechaComprobante = formatDateToAAAAMMDD(c.fechaComprobante)
          const fechaPago = formatDateToAAAAMMDD(c.fechaPago)
          const montoFacturado = formatCentsToDecimal(c.montoFacturadoCents)
          const itebisFacturado = formatCentsToDecimal(c.itebisFacturadoCents)
          const itebisRetenido = formatCentsToDecimal(c.itebisRetenidoCents)
          const itebisSujetoProp = formatCentsToDecimal(c.itebisSujetoProporcionalidadCents)
          const itebisLlevadoCosto = formatCentsToDecimal(c.itebisLlevadoCostoCents)
          const itebisAdelantar = formatCentsToDecimal(c.itebisPorAdelantarCents)
          const itebisPercibido = formatCentsToDecimal(c.itebisPercibidoCents)
          const tipoRetIsr = c.tipoRetencionIsr || ''
          const montoRetIsr = formatCentsToDecimal(c.isrRetenidoCents)
          const isc = formatCentsToDecimal(c.impuestoSelectivoConsumoCents)
          const otrosImp = formatCentsToDecimal(c.otrosImpuestosCents)
          const propina = formatCentsToDecimal(c.propinaLegalCents)
          
          let formaPago = '02' // Transferencia por defecto
          if (c.montoEfectivoCents > 0) formaPago = '01'
          else if (c.montoCreditoCents > 0) formaPago = '04'

          txt += `${rncProveedor}|${tipoId}|${tipoGasto}|${ncf}|${ncfModificado}|${fechaComprobante}|${fechaPago}|${montoFacturado}|${itebisFacturado}|${itebisRetenido}|${itebisSujetoProp}|${itebisLlevadoCosto}|${itebisAdelantar}|${itebisPercibido}|${tipoRetIsr}|${montoRetIsr}|${isc}|${otrosImp}|${propina}|${formaPago}\n`
        })

        return new NextResponse(txt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_606_${periodString}.txt`,
          },
        })
      }

      return NextResponse.json({ ok: true, report: compras })
    }

    // --- FORMATO 607 (VENTAS) ---
    if (tipo === '607') {
      const ventas = await prisma.registroFiscal.findMany({
        where: {
          tipo: 'VENTA',
          fechaComprobante: {
            gte: startDate,
            lte: endDate,
          },
          estado: 'ACTIVO',
        },
        orderBy: { fechaComprobante: 'asc' },
      })

      if (format === 'txt') {
        // Generar encabezado: RNC|Periodo|CantidadRegistros
        let txt = `${businessRnc}|${periodString}|${ventas.length}\n`

        ventas.forEach((v) => {
          const rncCliente = v.rncCedula
          const tipoId = v.rncCedula ? v.tipoId : 3
          const ncf = v.ncf
          const ncfModificado = v.ncfModificado || ''
          const tipoIngreso = '01' // Ingresos por Operaciones
          const fechaComprobante = formatDateToAAAAMMDD(v.fechaComprobante)
          const fechaRetencion = formatDateToAAAAMMDD(v.fechaPago) // Opcional
          const montoFacturado = formatCentsToDecimal(v.montoFacturadoCents)
          const itebisFacturado = formatCentsToDecimal(v.itebisFacturadoCents)
          const itebisRetenido = formatCentsToDecimal(v.itebisRetenidoCents)
          const itebisPercibido = formatCentsToDecimal(v.itebisPercibidoCents)
          const retencionRenta = formatCentsToDecimal(v.isrRetenidoCents)
          const isrPercibido = '0.00'
          const isc = formatCentsToDecimal(v.impuestoSelectivoConsumoCents)
          const otrosImp = formatCentsToDecimal(v.otrosImpuestosCents)
          const propina = formatCentsToDecimal(v.propinaLegalCents)
          
          const efec = formatCentsToDecimal(v.montoEfectivoCents)
          const tarj = formatCentsToDecimal(v.montoTarjetaCents)
          const cred = formatCentsToDecimal(v.montoCreditoCents)
          const bonos = '0.00'
          const permuta = '0.00'
          const trans = formatCentsToDecimal(v.montoTransferenciaCents + v.otrasFormasPagoCents)

          txt += `${rncCliente}|${tipoId}|${ncf}|${ncfModificado}|${tipoIngreso}|${fechaComprobante}|${fechaRetencion}|${montoFacturado}|${itebisFacturado}|${itebisRetenido}|${itebisPercibido}|${retencionRenta}|${isrPercibido}|${isc}|${otrosImp}|${propina}|${efec}|${tarj}|${cred}|${bonos}|${permuta}|${trans}\n`
        })

        return new NextResponse(txt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_607_${periodString}.txt`,
          },
        })
      }

      return NextResponse.json({ ok: true, report: ventas })
    }

    // --- FORMATO 608 (ANULADOS) ---
    if (tipo === '608') {
      const anulados = await prisma.ncfAnulado.findMany({
        where: {
          fechaAnulacion: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { fechaAnulacion: 'asc' },
      })

      if (format === 'txt') {
        // Generar encabezado: RNC|Periodo|CantidadRegistros
        let txt = `${businessRnc}|${periodString}|${anulados.length}\n`

        anulados.forEach((a) => {
          const ncf = a.ncf
          const fechaComprobante = formatDateToAAAAMMDD(a.fechaComprobante)
          const tipoAnulacion = a.tipoAnulacion // Código DGII (01-10)
          
          txt += `${ncf}|${fechaComprobante}|${tipoAnulacion}\n`
        })

        return new NextResponse(txt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_608_${periodString}.txt`,
          },
        })
      }

      return NextResponse.json({ ok: true, report: anulados })
    }

    // --- BORRADOR DE IT-1 ---
    if (tipo === 'it1') {
      // 1. Total Ventas e ITBIS Facturado
      const totalVentas = await prisma.registroFiscal.aggregate({
        where: {
          tipo: 'VENTA',
          fechaComprobante: { gte: startDate, lte: endDate },
          estado: 'ACTIVO',
        },
        _sum: {
          montoFacturadoCents: true,
          itebisFacturadoCents: true,
          propinaLegalCents: true,
        },
      })

      // 2. Total Compras e ITBIS Adelantado
      const totalCompras = await prisma.registroFiscal.aggregate({
        where: {
          tipo: 'COMPRA',
          fechaComprobante: { gte: startDate, lte: endDate },
          estado: 'ACTIVO',
        },
        _sum: {
          montoFacturadoCents: true,
          itebisFacturadoCents: true,
          itebisPorAdelantarCents: true,
        },
      })

      const itbisFacturado = totalVentas._sum.itebisFacturadoCents || 0
      const itbisAdelantado = totalCompras._sum.itebisPorAdelantarCents || 0
      const saldoAPagar = Math.max(0, itbisFacturado - itbisAdelantado)
      const saldoAFavor = Math.max(0, itbisAdelantado - itbisFacturado)

      return NextResponse.json({
        ok: true,
        report: {
          ventas: {
            montoFacturado: totalVentas._sum.montoFacturadoCents || 0,
            itbisCobrado: itbisFacturado,
            propinaLegal: totalVentas._sum.propinaLegalCents || 0,
          },
          compras: {
            montoFacturado: totalCompras._sum.montoFacturadoCents || 0,
            itbisPagado: totalCompras._sum.itebisFacturadoCents || 0,
            itbisDeducible: itbisAdelantado,
          },
          it1: {
            totalOperaciones: totalVentas._sum.montoFacturadoCents || 0,
            itbisDevengado: itbisFacturado,
            itbisDeducible: itbisAdelantado,
            impuestoAPagar: saldoAPagar,
            saldoAFavor: saldoAFavor,
          },
          rango: { inicio: startDate, fin: endDate },
        },
      })
    }

    return NextResponse.json({ ok: false, error: 'Tipo de reporte inválido.' }, { status: 400 })
  } catch (error: any) {
    console.error('Error al generar reporte DGII:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST /api/dgii/formatos (Para reportar anulaciones manuales de NCF)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ncf, fechaComprobante, tipoAnulacion, comentario } = body

    if (!ncf || !fechaComprobante || !tipoAnulacion) {
      return NextResponse.json({ ok: false, error: 'NCF, Fecha original y Tipo de Anulación son requeridos.' }, { status: 400 })
    }

    const anulacion = await prisma.ncfAnulado.create({
      data: {
        ncf,
        fechaComprobante: new Date(fechaComprobante),
        tipoAnulacion,
        comentario,
      },
    })

    return NextResponse.json({ ok: true, anulacion })
  } catch (error: any) {
    console.error('Error al registrar anulación de NCF:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
