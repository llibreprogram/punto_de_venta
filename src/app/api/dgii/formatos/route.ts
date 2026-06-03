/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execPromise = promisify(exec)

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

// Helper para rellenar plantillas Excel con python
async function generateXls(tipo: string, rnc: string, period: string, records: any[]): Promise<Buffer> {
  const tempJsonPath = path.join(process.cwd(), `templates/temp_${tipo}_${Date.now()}.json`)
  const tempOutPath = path.join(process.cwd(), `templates/out_${tipo}_${Date.now()}.xls`)
  
  try {
    await fs.writeFile(tempJsonPath, JSON.stringify(records, null, 2), 'utf-8')
    const pythonScript = path.join(process.cwd(), 'scripts/fill_dgii_excel.py')
    
    // Ejecutar script
    await execPromise(`python3 "${pythonScript}" "${tipo}" "${period}" "${rnc}" "${tempJsonPath}" "${tempOutPath}"`)
    
    const buffer = await fs.readFile(tempOutPath)
    return buffer
  } finally {
    // Limpieza
    await fs.unlink(tempJsonPath).catch(() => {})
    await fs.unlink(tempOutPath).catch(() => {})
  }
}

// GET /api/dgii/formatos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') // "606", "607", "608", "it1"
    const periodo = searchParams.get('periodo') // Formato: "YYYY-MM" (ej: "2026-05")
    const format = searchParams.get('format') // "txt", "csv", "xls", "json"

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

      const mapped = compras.map((c) => {
        const rncProveedor = c.rncCedula || ''
        const tipoId = c.tipoId || 1
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
        else if (c.montoTarjetaCents > 0) formaPago = '03'
        else if (c.montoCreditoCents > 0) formaPago = '04'

        const isBien = ['04', '09', '10'].includes(tipoGasto)
        const montoServicios = isBien ? '0.00' : montoFacturado
        const montoBienes = isBien ? montoFacturado : '0.00'
        const totalMonto = montoFacturado
        const isrPercibido = '0.00'

        return {
          rncProveedor,
          tipoId,
          tipoGasto,
          ncf,
          ncfModificado,
          fechaComprobante,
          fechaPago,
          montoServicios,
          montoBienes,
          totalMonto,
          itebisFacturado,
          itebisRetenido,
          itebisSujetoProp,
          itebisLlevadoCosto,
          itebisAdelantar,
          itebisPercibido,
          tipoRetIsr,
          montoRetIsr,
          isrPercibido,
          isc,
          otrosImp,
          propina,
          formaPago
        }
      })

      if (format === 'txt') {
        let txt = `${businessRnc}|${periodString}|${mapped.length}\n`
        mapped.forEach((m) => {
          txt += `${m.rncProveedor}|${m.tipoId}|${m.tipoGasto}|${m.ncf}|${m.ncfModificado}|${m.fechaComprobante}|${m.fechaPago}|${m.montoServicios}|${m.montoBienes}|${m.totalMonto}|${m.itebisFacturado}|${m.itebisRetenido}|${m.itebisSujetoProp}|${m.itebisLlevadoCosto}|${m.itebisAdelantar}|${m.itebisPercibido}|${m.tipoRetIsr}|${m.montoRetIsr}|${m.isrPercibido}|${m.isc}|${m.otrosImp}|${m.propina}|${m.formaPago}\n`
        })

        return new NextResponse(txt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_606_${periodString}.txt`,
          },
        })
      }

      if (format === 'csv') {
        let csv = `RNC o Cédula;Tipo Identificación;Tipo de Bienes y Servicios Comprados;NCF;NCF Modificado;Fecha Comprobante;Fecha Pago;Monto Facturado en Servicios;Monto Facturado en Bienes;Total Monto Facturado;ITBIS Facturado;ITBIS Retenido;ITBIS Sujeto a Proporcionalidad;ITBIS llevado al Costo;ITBIS por Adelantar;ITBIS Percibido en Compras;Tipo de Retención en ISR;Monto Retención Renta;ISR Percibido en Compras;Impuesto Selectivo al Consumo;Otros Impuestos/Tasas;Monto Propina Legal;Forma de Pago\n`
        mapped.forEach((m) => {
          csv += `${m.rncProveedor};${m.tipoId};${m.tipoGasto};${m.ncf};${m.ncfModificado};${m.fechaComprobante};${m.fechaPago};${m.montoServicios};${m.montoBienes};${m.totalMonto};${m.itebisFacturado};${m.itebisRetenido};${m.itebisSujetoProp};${m.itebisLlevadoCosto};${m.itebisAdelantar};${m.itebisPercibido};${m.tipoRetIsr};${m.montoRetIsr};${m.isrPercibido};${m.isc};${m.otrosImp};${m.propina};${m.formaPago}\n`
        })

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_606_${periodString}.csv`,
          },
        })
      }

      if (format === 'xls' || format === 'excel') {
        const buffer = await generateXls('606', businessRnc, periodString, mapped)
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.ms-excel',
            'Content-Disposition': `attachment; filename=DGII_606_${periodString}.xls`,
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

      const mapped = ventas.map((v) => {
        const rncCliente = v.rncCedula || ''
        const tipoId = v.rncCedula ? v.tipoId : ''
        const ncf = v.ncf
        const ncfModificado = v.ncfModificado || ''
        const tipoIngreso = '01'
        const fechaComprobante = formatDateToAAAAMMDD(v.fechaComprobante)
        
        const hasRetencion = v.itebisRetenidoCents > 0 || v.isrRetenidoCents > 0
        const fechaRetencion = hasRetencion ? formatDateToAAAAMMDD(v.fechaPago || v.fechaComprobante) : ''

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
        const trans = formatCentsToDecimal(v.montoTransferenciaCents)
        const tarj = formatCentsToDecimal(v.montoTarjetaCents)
        const cred = formatCentsToDecimal(v.montoCreditoCents)
        const bonos = '0.00'
        const permuta = '0.00'
        const otras = formatCentsToDecimal(v.otrasFormasPagoCents)

        return {
          rncCliente,
          tipoId,
          ncf,
          ncfModificado,
          tipoIngreso,
          fechaComprobante,
          fechaRetencion,
          montoFacturado,
          itebisFacturado,
          itebisRetenido,
          itebisPercibido,
          retencionRenta,
          isrPercibido,
          isc,
          otrosImp,
          propina,
          efec,
          trans,
          tarj,
          cred,
          bonos,
          permuta,
          otras
        }
      })

      if (format === 'txt') {
        let txt = `${businessRnc}|${periodString}|${mapped.length}\n`
        mapped.forEach((m) => {
          txt += `${m.rncCliente}|${m.tipoId}|${m.ncf}|${m.ncfModificado}|${m.tipoIngreso}|${m.fechaComprobante}|${m.fechaRetencion}|${m.montoFacturado}|${m.itebisFacturado}|${m.itebisRetenido}|${m.itebisPercibido}|${m.retencionRenta}|${m.isrPercibido}|${m.isc}|${m.otrosImp}|${m.propina}|${m.efec}|${m.trans}|${m.tarj}|${m.cred}|${m.bonos}|${m.permuta}|${m.otras}\n`
        })

        return new NextResponse(txt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_607_${periodString}.txt`,
          },
        })
      }

      if (format === 'csv') {
        let csv = `RNC o Cédula;Tipo Identificación;NCF;NCF Modificado;Tipo de Ingreso;Fecha Comprobante;Fecha Retención;Monto Facturado;ITBIS Facturado;ITBIS Retenido por Terceros;ITBIS Percibido en Ventas;Retención Renta por Terceros;ISR Percibido en Ventas;Impuesto Selectivo al Consumo;Otros Impuestos/Tasas;Monto Propina Legal;Efectivo;Cheque/Transferencia/Depósito;Tarjeta Débito/Crédito;Venta a Crédito;Bonos o Certificados de Regalo;Permuta;Otras Formas de Ventas\n`
        mapped.forEach((m) => {
          csv += `${m.rncCliente};${m.tipoId};${m.ncf};${m.ncfModificado};${m.tipoIngreso};${m.fechaComprobante};${m.fechaRetencion};${m.montoFacturado};${m.itebisFacturado};${m.itebisRetenido};${m.itebisPercibido};${m.retencionRenta};${m.isrPercibido};${m.isc};${m.otrosImp};${m.propina};${m.efec};${m.trans};${m.tarj};${m.cred};${m.bonos};${m.permuta};${m.otras}\n`
        })

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_607_${periodString}.csv`,
          },
        })
      }

      if (format === 'xls' || format === 'excel') {
        const buffer = await generateXls('607', businessRnc, periodString, mapped)
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.ms-excel',
            'Content-Disposition': `attachment; filename=DGII_607_${periodString}.xls`,
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

      const mapped = anulados.map((a) => {
        const ncf = a.ncf
        const fechaComprobante = formatDateToAAAAMMDD(a.fechaComprobante)
        const tipoAnulacion = a.tipoAnulacion // Código DGII (01-10)

        return {
          ncf,
          fechaComprobante,
          tipoAnulacion
        }
      })

      if (format === 'txt') {
        let txt = `${businessRnc}|${periodString}|${mapped.length}\n`
        mapped.forEach((m) => {
          txt += `${m.ncf}|${m.fechaComprobante}|${m.tipoAnulacion}\n`
        })

        return new NextResponse(txt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_608_${periodString}.txt`,
          },
        })
      }

      if (format === 'csv') {
        let csv = `NCF;Fecha Comprobante;Tipo Anulación\n`
        mapped.forEach((m) => {
          csv += `${m.ncf};${m.fechaComprobante};${m.tipoAnulacion}\n`
        })

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=DGII_608_${periodString}.csv`,
          },
        })
      }

      if (format === 'xls' || format === 'excel') {
        const buffer = await generateXls('608', businessRnc, periodString, mapped)
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.ms-excel',
            'Content-Disposition': `attachment; filename=DGII_608_${periodString}.xls`,
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
