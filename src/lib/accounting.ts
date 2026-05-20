/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { prisma } from './db'
import { formatNcf } from './ncf'

/**
 * Genera el número correlativo para un asiento contable.
 * Formato: AS-YYYY-MM-XXXX
 */
export async function generarNumeroAsiento(fecha: Date, tx?: any): Promise<string> {
  const client = tx || prisma
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const prefijo = `AS-${year}-${month}-`

  // Buscar cuántos asientos existen con ese prefijo para este mes/año
  const count = await client.transaccionContable.count({
    where: {
      numero: {
        startsWith: prefijo,
      },
    },
  })

  const correlativo = String(count + 1).padStart(4, '0')
  return `${prefijo}${correlativo}`
}

export interface ApunteInput {
  cuentaCodigo: string
  debitoCents: number
  creditoCents: number
  referencia?: string
}

/**
 * Crea un asiento contable de partida doble en la base de datos.
 * Valida que la suma de Débitos sea estrictamente igual a la suma de Créditos.
 */
export async function crearAsiento(
  fecha: Date,
  descripcion: string,
  referencia: string,
  origen: string,
  apuntes: ApunteInput[],
  tx?: any
) {
  const client = tx || prisma

  // 1. Validar partida doble
  const totalDebito = apuntes.reduce((sum, item) => sum + item.debitoCents, 0)
  const totalCredito = apuntes.reduce((sum, item) => sum + item.creditoCents, 0)

  if (totalDebito !== totalCredito) {
    throw new Error(
      `Partida Doble Inválida: La suma de Débitos (RD$ ${(totalDebito / 100).toFixed(
        2
      )}) debe ser igual a la suma de Créditos (RD$ ${(totalCredito / 100).toFixed(
        2
      )}). Diferencia: RD$ ${((totalDebito - totalCredito) / 100).toFixed(2)}`
    )
  }

  // 2. Generar número correlativo
  const numero = await generarNumeroAsiento(fecha, client)

  // 3. Obtener todas las cuentas indicadas
  const codigos = apuntes.map((a) => a.cuentaCodigo)
  const cuentas = await client.cuentaContable.findMany({
    where: { codigo: { in: codigos } },
  })

  const mapaCuentas: Record<string, number> = {}
  cuentas.forEach((c: { codigo: string; id: number }) => {
    mapaCuentas[c.codigo] = c.id
  })

  // Verificar que todas las cuentas existan
  for (const a of apuntes) {
    if (!mapaCuentas[a.cuentaCodigo]) {
      throw new Error(`Error Contable: La cuenta con código ${a.cuentaCodigo} no existe en el catálogo.`)
    }
  }

  // 4. Crear la transacción y detalles
  return await client.transaccionContable.create({
    data: {
      numero,
      fecha,
      descripcion,
      referencia,
      origen,
      estado: 'POSTEADO',
      apuntes: {
        create: apuntes.map((a) => ({
          cuentaId: mapaCuentas[a.cuentaCodigo],
          debitoCents: a.debitoCents,
          creditoCents: a.creditoCents,
          referencia: a.referencia,
        })),
      },
    },
  })
}

/**
 * Registra automáticamente en contabilidad y en los registros de la DGII una venta pagada en el POS.
 */
export async function registrarVentaContabilidad(pedidoId: number): Promise<any> {
  return await prisma.$transaction(async (tx) => {
    // 1. Obtener pedido completo con pagos y usuario
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { pagos: true, usuario: true },
    })

    if (!pedido) throw new Error(`Pedido #${pedidoId} no encontrado.`)
    if (pedido.estado !== 'PAGADO') {
      throw new Error(`El pedido #${pedido.numero} no puede contabilizarse porque no está PAGADO.`)
    }

    // Si ya existe un registro fiscal de venta para este pedido, ignorar
    const regExistente = await tx.registroFiscal.findUnique({
      where: { pedidoId },
    })
    if (regExistente) return regExistente

    // 2. Determinar NCF
    // Por defecto si no tiene NCF asignado, le asignamos Consumo (B02)
    let ncfAsignado = pedido.ncf
    let ncfTipo = pedido.ncfTipo || 'B02'

    if (!ncfAsignado) {
      // Buscar secuencia activa
      const secuencia = await tx.secuenciaNcf.findFirst({
        where: { tipo: ncfTipo, activa: true },
      })
      if (!secuencia) {
        throw new Error(`No hay secuencias de NCF activas para el tipo ${ncfTipo}`)
      }
      
      const nuevoActual = secuencia.actual + 1
      await tx.secuenciaNcf.update({
        where: { id: secuencia.id },
        data: { actual: nuevoActual },
      })
      
      ncfAsignado = formatNcf(secuencia.prefijo, secuencia.tipoCodigo, nuevoActual)
      
      // Actualizar el Pedido
      await tx.pedido.update({
        where: { id: pedidoId },
        data: { ncf: ncfAsignado, ncfTipo },
      })
    }

    // 3. Crear Registro Fiscal de Venta (para reporte 607)
    // Desglosar formas de pago
    let efec = 0
    let tarj = 0
    let trans = 0
    let otros = 0

    pedido.pagos.forEach((p) => {
      if (p.metodo === 'EFECTIVO') efec += p.montoCents
      else if (p.metodo === 'TARJETA') tarj += p.montoCents
      else if (p.metodo === 'TRANSFERENCIA') trans += p.montoCents
      else otros += p.montoCents
    })

    // RNC por defecto si no es Crédito Fiscal (Consumo general RNC/Cédula es opcional, usamos vacío o 224001144 como genérico)
    // Si el usuario requiere Crédito Fiscal, debió llenar el RNC en el cliente, por ejemplo en notas o asociarlo.
    // Buscamos si hay RNC en notas o usamos un valor vacío.
    let rncCedula = ''
    let tipoId = 3 // Otros / Consumidor Final
    if (ncfTipo === 'B01') {
      // Intentar extraer RNC de notas del pedido o ajustes
      // Formato esperado en notas: "RNC: 101XXXXXX" o similar
      const match = pedido.notas?.match(/RNC:\s*(\d{9,11})/i)
      if (match) {
        rncCedula = match[1]
        tipoId = rncCedula.length === 9 ? 1 : 2
      } else {
        rncCedula = '130000000' // Genérico temporal si no se especificó para evitar fallos
        tipoId = 1
      }
    }

    const regFiscal = await tx.registroFiscal.create({
      data: {
        tipo: 'VENTA',
        rncCedula,
        tipoId,
        ncf: ncfAsignado,
        fechaComprobante: pedido.createdAt,
        montoFacturadoCents: pedido.subtotalCents - pedido.descuentoCents,
        itebisFacturadoCents: pedido.itebisCents || pedido.impuestoCents,
        propinaLegalCents: pedido.propinaCents,
        montoEfectivoCents: efec,
        montoTarjetaCents: tarj,
        montoTransferenciaCents: trans,
        otrasFormasPagoCents: otros,
        pedidoId: pedido.id,
      },
    })

    // 4. Crear Asiento de Diario
    const apuntes: ApunteInput[] = []
    
    // Débito a Caja y Bancos (Efectivo va a Caja Chica, Tarjeta/Transferencia va a Banco)
    if (efec > 0) {
      apuntes.push({
        cuentaCodigo: '1.1.01.01', // Caja Chica / General
        debitoCents: efec,
        creditoCents: 0,
        referencia: `Venta POS Pedido #${pedido.numero} - Efectivo`,
      })
    }
    if (tarj + trans + otros > 0) {
      apuntes.push({
        cuentaCodigo: '1.1.01.02', // Banco Popular
        debitoCents: tarj + trans + otros,
        creditoCents: 0,
        referencia: `Venta POS Pedido #${pedido.numero} - Tarjeta/Transf`,
      })
    }

    // Crédito a Ventas (Ingresos)
    const netoVenta = pedido.subtotalCents - pedido.descuentoCents
    if (netoVenta > 0) {
      apuntes.push({
        cuentaCodigo: '4.1.01.01', // Ventas de Alimentos y Bebidas
        debitoCents: 0,
        creditoCents: netoVenta,
        referencia: `Ingreso Neto Pedido #${pedido.numero}`,
      })
    }

    // Crédito a ITBIS Cobrado (Impuestos por pagar)
    const itebis = pedido.itebisCents || pedido.impuestoCents
    if (itebis > 0) {
      apuntes.push({
        cuentaCodigo: '2.1.02.01', // ITBIS por Pagar
        debitoCents: 0,
        creditoCents: itebis,
        referencia: `ITBIS Cobrado Pedido #${pedido.numero}`,
      })
    }

    // Crédito a Propina Legal 10% por pagar
    if (pedido.propinaCents > 0) {
      apuntes.push({
        cuentaCodigo: '2.1.02.02', // Propina Legal 10% por Pagar
        debitoCents: 0,
        creditoCents: pedido.propinaCents,
        referencia: `Propina de Ley 10% Pedido #${pedido.numero}`,
      })
    }

    // Crear el Asiento
    await crearAsiento(
      pedido.createdAt,
      `Venta POS Correlativa Pedido #${pedido.numero} NCF ${ncfAsignado}`,
      `Pedido #${pedido.numero}`,
      'POS',
      apuntes,
      tx
    )

    return regFiscal
  })
}

/**
 * Registra en contabilidad y en los registros de la DGII (606) una compra de insumos recibida.
 */
export async function registrarCompraContabilidad(
  ordenId: number,
  params: {
    rncProveedor: string
    ncf: string
    tipoGasto: string
    itebisFacturadoCents: number
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO'
  }
): Promise<any> {
  return await prisma.$transaction(async (tx) => {
    // 1. Obtener la orden de compra
    const orden = await tx.ordenCompra.findUnique({
      where: { id: ordenId },
      include: { items: true },
    })

    if (!orden) throw new Error(`Orden de Compra #${ordenId} no encontrada.`)
    if (orden.estado !== 'RECIBIDA') {
      throw new Error(`La Orden de Compra #${ordenId} debe estar en estado RECIBIDA para contabilizarse.`)
    }

    // Validar RNC
    const tipoId = params.rncProveedor.replace(/[^0-9]/g, '').length === 9 ? 1 : 2

    // 2. Crear Registro Fiscal (606)
    const regFiscal = await tx.registroFiscal.create({
      data: {
        tipo: 'COMPRA',
        rncCedula: params.rncProveedor,
        tipoId,
        tipoGasto: params.tipoGasto,
        ncf: params.ncf,
        fechaComprobante: orden.updatedAt,
        montoFacturadoCents: orden.totalCents - params.itebisFacturadoCents,
        itebisFacturadoCents: params.itebisFacturadoCents,
        itebisPorAdelantarCents: params.itebisFacturadoCents, // Todo es deducible por defecto
        montoEfectivoCents: params.metodoPago === 'EFECTIVO' ? orden.totalCents : 0,
        montoTransferenciaCents: params.metodoPago === 'TRANSFERENCIA' ? orden.totalCents : 0,
        montoCreditoCents: params.metodoPago === 'CREDITO' ? orden.totalCents : 0,
        ordenCompraId: orden.id,
      },
    })

    // Actualizar orden con NCF y RNC
    await tx.ordenCompra.update({
      where: { id: ordenId },
      data: {
        ncf: params.ncf,
        ncfTipo: params.ncf.substring(0, 3),
      },
    })

    // 3. Crear Asiento Contable
    const apuntes: ApunteInput[] = []
    const costoNeto = orden.totalCents - params.itebisFacturadoCents

    // Débito a Inventario de Insumos (Activo)
    apuntes.push({
      cuentaCodigo: '1.1.04.01', // Inventario de Insumos
      debitoCents: costoNeto,
      creditoCents: 0,
      referencia: `Compra de Insumos Orden #${ordenId} Neto`,
    })

    // Débito a ITBIS Pagado / Adelantado (Activo/Pasivo Neto)
    if (params.itebisFacturadoCents > 0) {
      apuntes.push({
        cuentaCodigo: '2.1.02.01', // ITBIS por Pagar (cuenta neta)
        debitoCents: params.itebisFacturadoCents,
        creditoCents: 0,
        referencia: `ITBIS Pagado en Compra NCF ${params.ncf}`,
      })
    }

    // Crédito a Contrapartida (Caja, Banco o CXP)
    if (params.metodoPago === 'EFECTIVO') {
      apuntes.push({
        cuentaCodigo: '1.1.01.01', // Caja Chica
        debitoCents: 0,
        creditoCents: orden.totalCents,
        referencia: `Pago en Efectivo Compra NCF ${params.ncf}`,
      })
    } else if (params.metodoPago === 'TRANSFERENCIA') {
      apuntes.push({
        cuentaCodigo: '1.1.01.02', // Banco Popular
        debitoCents: 0,
        creditoCents: orden.totalCents,
        referencia: `Transferencia Banco Popular Compra NCF ${params.ncf}`,
      })
    } else {
      apuntes.push({
        cuentaCodigo: '2.1.01.01', // Cuentas por Pagar Proveedores
        debitoCents: 0,
        creditoCents: orden.totalCents,
        referencia: `Compra a Crédito Proveedor NCF ${params.ncf}`,
      })
    }

    // Crear el Asiento
    await crearAsiento(
      orden.updatedAt,
      `Compra de Insumos Orden #${ordenId} NCF ${params.ncf}`,
      `Orden Compra #${ordenId}`,
      'COMPRAS',
      apuntes,
      tx
    )

    return regFiscal
  })
}

/**
 * Registra el asiento contable por el pago de la nómina de un periodo.
 */
export async function registrarNominaContabilidad(nominaId: number): Promise<any> {
  return await prisma.$transaction(async (tx) => {
    // 1. Obtener la nómina con el empleado
    const nomina = await tx.nomina.findUnique({
      where: { id: nominaId },
      include: { empleado: true },
    })

    if (!nomina) throw new Error(`Nómina #${nominaId} no encontrada.`)
    if (nomina.estado !== 'PAGADA') {
      throw new Error(`La nómina del empleado debe estar PAGADA para contabilizarse.`)
    }

    // Si ya tiene un asiento contable asociado, salir
    if (nomina.transaccionId) return

    // 2. Definir apuntes contables
    const apuntes: ApunteInput[] = []

    // A) DÉBITOS (Gastos)
    // Gasto de Sueldos y Salarios
    apuntes.push({
      cuentaCodigo: '6.1.01.01', // Gasto Sueldos
      debitoCents: nomina.salarioBaseCents + nomina.horasExtrasCents + nomina.comisionesCents + nomina.bonosCents + nomina.otrosIngresosCents,
      creditoCents: 0,
      referencia: `Sueldo Devengado ${nomina.empleado.nombre} ${nomina.empleado.apellido} Periodo ${nomina.periodo}`,
    })

    // Gasto de TSS Patronal (Aporte del empleador)
    const tssPatronal = nomina.sfsPatronalCents + nomina.afpPatronalCents + nomina.srlCents
    if (tssPatronal > 0) {
      apuntes.push({
        cuentaCodigo: '6.1.01.02', // Gasto TSS Patronal
        debitoCents: tssPatronal,
        creditoCents: 0,
        referencia: `Aportes Patronales TSS ${nomina.empleado.nombre} ${nomina.empleado.apellido}`,
      })
    }

    // Gasto de INFOTEP Patronal (Aporte 1% del empleador)
    if (nomina.infotepCents > 0) {
      apuntes.push({
        cuentaCodigo: '6.1.01.03', // Gasto INFOTEP
        debitoCents: nomina.infotepCents,
        creditoCents: 0,
        referencia: `Aporte Patronal INFOTEP 1% ${nomina.empleado.nombre}`,
      })
    }

    // B) CRÉDITOS (Salida de dinero y Retenciones por pagar)
    // Retención TSS por Pagar (SFS + AFP del empleado + TSS Patronal completo)
    const totalTssPorPagar = (nomina.sfsCents + nomina.afpCents) + tssPatronal
    if (totalTssPorPagar > 0) {
      apuntes.push({
        cuentaCodigo: '2.1.03.01', // Retenciones TSS por Pagar
        debitoCents: 0,
        creditoCents: totalTssPorPagar,
        referencia: `Retenciones y Aportes TSS Periodo ${nomina.periodo}`,
      })
    }

    // Retención ISR por Pagar
    if (nomina.isrCents > 0) {
      apuntes.push({
        cuentaCodigo: '2.1.03.02', // Retenciones ISR por Pagar
        debitoCents: 0,
        creditoCents: nomina.isrCents,
        referencia: `ISR Retenido ${nomina.empleado.nombre} Periodo ${nomina.periodo}`,
      })
    }

    // INFOTEP por Pagar
    if (nomina.infotepCents > 0) {
      apuntes.push({
        cuentaCodigo: '2.1.03.03', // Retenciones INFOTEP por Pagar
        debitoCents: 0,
        creditoCents: nomina.infotepCents,
        referencia: `INFOTEP por Pagar Periodo ${nomina.periodo}`,
      })
    }

    // Salida de Banco (Neto a pagar al empleado)
    apuntes.push({
      cuentaCodigo: '1.1.01.02', // Banco Popular
      debitoCents: 0,
      creditoCents: nomina.totalRecibirCents,
      referencia: `Transferencia Sueldo Neto ${nomina.empleado.nombre} ${nomina.empleado.apellido}`,
    })

    // 3. Crear asiento contable
    const asiento = await crearAsiento(
      nomina.fechaPago || new Date(),
      `Pago de Nómina ${nomina.empleado.nombre} ${nomina.empleado.apellido} (${nomina.periodo})`,
      `Nomina #${nominaId}`,
      'NOMINA',
      apuntes,
      tx
    )

    // 4. Vincular la nómina con el asiento
    await tx.nomina.update({
      where: { id: nominaId },
      data: { transaccionId: asiento.id },
    })

    return asiento
  })
}
