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

    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()

    // ----------------------------------------------------
    // 1. Integridad Contable: Asientos Descuadrados
    // ----------------------------------------------------
    const apuntesGrouped = await prisma.apunteContable.groupBy({
      by: ['transaccionId'],
      _sum: {
        debitoCents: true,
        creditoCents: true,
      },
    })

    const transaccionesDescuadradas = []
    for (const group of apuntesGrouped) {
      const debito = group._sum.debitoCents || 0
      const credito = group._sum.creditoCents || 0
      if (debito !== credito) {
        const tx = await prisma.transaccionContable.findUnique({
          where: { id: group.transaccionId },
          select: {
            id: true,
            numero: true,
            fecha: true,
            descripcion: true,
            origen: true,
          },
        })
        if (tx) {
          transaccionesDescuadradas.push({
            id: tx.id,
            numero: tx.numero,
            fecha: tx.fecha,
            descripcion: tx.descripcion,
            origen: tx.origen || 'MANUAL',
            debito,
            credito,
            diferencia: Math.abs(debito - credito),
          })
        }
      }
    }

    // ----------------------------------------------------
    // 2. Control de Inventario: Stock Negativo o Bajo Mínimo
    // ----------------------------------------------------
    const insumosNegativos = await prisma.insumo.findMany({
      where: {
        activo: true,
        stockActual: { lt: 0 },
      },
      select: {
        id: true,
        nombre: true,
        stockActual: true,
        unidadMedida: true,
      },
      orderBy: { stockActual: 'asc' },
    })

    const insumosBajoMinimo = await prisma.insumo.findMany({
      where: {
        activo: true,
        stockActual: {
          gte: 0,
          lt: prisma.insumo.fields.stockMinimo,
        },
        stockMinimo: { gt: 0 },
      },
      select: {
        id: true,
        nombre: true,
        stockActual: true,
        stockMinimo: true,
        unidadMedida: true,
      },
      orderBy: { stockActual: 'asc' },
    })

    // ----------------------------------------------------
    // 3. Margen Comercial: Productos con Margen Negativo o Crítico
    // ----------------------------------------------------
    const todosProductos = await prisma.producto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        precioCents: true,
        costoCents: true,
        categoria: { select: { nombre: true } },
      },
    })

    const productosMargenNegativo = []
    const productosMargenCritico = [] // Entre 0% y 15%

    for (const p of todosProductos) {
      if (p.precioCents <= p.costoCents) {
        productosMargenNegativo.push({
          id: p.id,
          nombre: p.nombre,
          precioCents: p.precioCents,
          costoCents: p.costoCents,
          categoria: p.categoria.nombre,
          margenPct: p.precioCents > 0 ? Math.round(((p.precioCents - p.costoCents) / p.precioCents) * 100) : -100,
        })
      } else if (p.costoCents > 0) {
        const margenPct = ((p.precioCents - p.costoCents) / p.precioCents) * 100
        if (margenPct < 15) {
          productosMargenCritico.push({
            id: p.id,
            nombre: p.nombre,
            precioCents: p.precioCents,
            costoCents: p.costoCents,
            categoria: p.categoria.nombre,
            margenPct: Math.round(margenPct),
          })
        }
      }
    }

    // ----------------------------------------------------
    // 4. Cumplimiento Fiscal: NCFs Agotándose y Ventas sin Registro Fiscal
    // ----------------------------------------------------
    // Ventas pagadas sin Registro Fiscal asociado
    const ventasSinRegistro = await prisma.pedido.findMany({
      where: {
        estado: 'PAGADO',
        registroFiscal: { is: null },
      },
      select: {
        id: true,
        numero: true,
        ncf: true,
        ncfTipo: true,
        totalCents: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Secuencias NCF activas con menos del 20%
    const secuenciasActivas = await prisma.secuenciaNcf.findMany({
      where: { activa: true },
    })
    const secuenciasBajas = []
    for (const s of secuenciasActivas) {
      const total = s.fin - s.inicio + 1
      const consumido = s.actual - s.inicio + 1
      const restante = total - consumido
      const pctRestante = (restante / total) * 100
      if (pctRestante < 20) {
        secuenciasBajas.push({
          id: s.id,
          tipo: s.tipo,
          descripcion: s.descripcion,
          restantes: restante,
          total,
          pctRestante: Math.round(pctRestante),
        })
      }
    }

    // ----------------------------------------------------
    // 5. Control de Cartera: Deudas CXP y CXC Vencidas
    // ----------------------------------------------------
    const cxpVencidas = await prisma.documentoPorPagar.findMany({
      where: {
        estado: { not: 'PAGADO' },
        fechaVencimiento: { lt: now },
      },
      select: {
        id: true,
        descripcion: true,
        montoCents: true,
        pagadoCents: true,
        fechaVencimiento: true,
        proveedor: { select: { nombre: true } },
      },
      orderBy: { fechaVencimiento: 'asc' },
    })

    const cxcVencidas = await prisma.documentoPorCobrar.findMany({
      where: {
        estado: { not: 'COBRADO' },
        fechaVencimiento: { lt: now },
      },
      select: {
        id: true,
        descripcion: true,
        montoCents: true,
        cobradoCents: true,
        fechaVencimiento: true,
        clienteNombre: true,
      },
      orderBy: { fechaVencimiento: 'asc' },
    })

    // ----------------------------------------------------
    // Evaluación de Categorías y Calificación Global
    // ----------------------------------------------------
    // Calificación inicial de cada categoría (máximo 100)
    let scoreIntegridad = 100 - (transaccionesDescuadradas.length * 25)
    let scoreInventario = 100 - (insumosNegativos.length * 15 + insumosBajoMinimo.length * 4)
    let scoreMargen = 100 - (productosMargenNegativo.length * 20 + productosMargenCritico.length * 5)
    let scoreFiscal = 100 - (ventasSinRegistro.length * 12 + secuenciasBajas.length * 25)
    let scoreDeuda = 100 - (cxpVencidas.length * 10 + cxcVencidas.length * 10)

    // Acotar entre 0 y 100
    scoreIntegridad = Math.max(0, Math.min(100, scoreIntegridad))
    scoreInventario = Math.max(0, Math.min(100, scoreInventario))
    scoreMargen = Math.max(0, Math.min(100, scoreMargen))
    scoreFiscal = Math.max(0, Math.min(100, scoreFiscal))
    scoreDeuda = Math.max(0, Math.min(100, scoreDeuda))

    // Calificación Global (Ponderada)
    // Peso: Integridad (25%), Fiscal (25%), Margen (20%), Inventario (15%), Deuda (15%)
    const healthScore = Math.round(
      (scoreIntegridad * 0.25) +
      (scoreFiscal * 0.25) +
      (scoreMargen * 0.20) +
      (scoreInventario * 0.15) +
      (scoreDeuda * 0.15)
    )

    let healthLevel: 'OPTIMA' | 'BUENA' | 'MODERADA' | 'CRITICA' = 'OPTIMA'
    if (healthScore < 50) healthLevel = 'CRITICA'
    else if (healthScore < 75) healthLevel = 'MODERADA'
    else if (healthScore < 90) healthLevel = 'BUENA'

    // ----------------------------------------------------
    // Recomendaciones Inteligentes y Hallazgos (Findings)
    // ----------------------------------------------------
    const recommendations: string[] = []
    const findings: any[] = []

    // Findings de Integridad Contable
    if (transaccionesDescuadradas.length > 0) {
      findings.push({
        id: 'descuadres_contables',
        severity: 'ALTA',
        category: 'Integridad Contable',
        title: 'Asientos Contables Descuadrados',
        description: 'Se detectaron asientos en el Libro Diario donde los débitos y créditos no coinciden. Esto viola el principio contable de partida doble.',
        impact: 'Causa inconsistencias en el Balance General y la Balanza de Comprobación, desequilibrando la ecuación contable.',
        count: transaccionesDescuadradas.length,
        items: transaccionesDescuadradas.map(t => ({
          label: `Asiento ${t.numero}`,
          detail: `${t.descripcion} (${t.origen})`,
          value: `Diferencia: RD$ ${(t.diferencia / 100).toFixed(2)}`,
        })),
        actionLabel: 'Corregir en Libro Diario',
        actionHref: '/admin/contabilidad/asientos',
        actionType: 'link',
      })
      recommendations.push('Revisar y cuadrar los asientos contables descuadrados detectados para restablecer el equilibrio en la balanza general.')
    }

    // Findings Fiscales
    if (ventasSinRegistro.length > 0) {
      findings.push({
        id: 'ventas_sin_registro_fiscal',
        severity: 'ALTA',
        category: 'Cumplimiento Fiscal',
        title: 'Ventas del POS sin Registro Fiscal',
        description: 'Pedidos marcados como PAGADOS en el POS que no generaron registro fiscal (formato 607 para DGII) ni asiento contable.',
        impact: 'Provoca una discrepancia entre los ingresos reales del restaurante y los reportes fiscales enviados a la DGII.',
        count: ventasSinRegistro.length,
        items: ventasSinRegistro.slice(0, 10).map(v => ({
          label: `Pedido #${v.numero}`,
          detail: v.ncf ? `NCF: ${v.ncf}` : 'Sin NCF asignado',
          value: `Monto: RD$ ${(v.totalCents / 100).toFixed(2)}`,
        })),
        actionLabel: 'Reparar Registros Fiscales',
        actionHref: '#',
        actionType: 'autofix',
      })
      recommendations.push(`Ejecutar el proceso de reparación automática (autofix) para registrar fiscal y contablemente las ${ventasSinRegistro.length} ventas pendientes del POS.`)
    }

    if (secuenciasBajas.length > 0) {
      findings.push({
        id: 'ncf_agotandose',
        severity: 'ALTA',
        category: 'Cumplimiento Fiscal',
        title: 'Secuencias de NCF Agotándose',
        description: 'Lotes de comprobantes fiscales activos con menos del 20% de disponibilidad restante.',
        impact: 'Riesgo inminente de no poder facturar en el POS una vez se consuman los comprobantes disponibles.',
        count: secuenciasBajas.length,
        items: secuenciasBajas.map(s => ({
          label: `Secuencia Tipo ${s.tipo}`,
          detail: s.descripcion || 'Sin descripción',
          value: `${s.restantes} disponibles de ${s.total} (${s.pctRestante}%)`,
        })),
        actionLabel: 'Solicitar NCFs en DGII',
        actionHref: '/admin/contabilidad', // Se gestiona en la pestaña NCF
        actionType: 'link',
      })
      secuenciasBajas.forEach(s => {
        recommendations.push(`Solicitar de forma inmediata una nueva secuencia de NCF de tipo ${s.tipo} ante la DGII para evitar la interrupción de facturación.`)
      })
    }

    // Findings de Margen
    if (productosMargenNegativo.length > 0) {
      findings.push({
        id: 'margen_negativo',
        severity: 'ALTA',
        category: 'Margen Comercial',
        title: 'Productos con Margen de Ganancia Negativo',
        description: 'Productos activos cuyo costo unitario es mayor o igual al precio de venta establecido.',
        impact: 'Causa pérdidas financieras directas en cada unidad vendida de estos productos.',
        count: productosMargenNegativo.length,
        items: productosMargenNegativo.map(p => ({
          label: p.nombre,
          detail: p.categoria,
          value: `Costo: RD$ ${(p.costoCents / 100).toFixed(2)} | Precio: RD$ ${(p.precioCents / 100).toFixed(2)}`,
        })),
        actionLabel: 'Ajustar Precios',
        actionHref: '/admin/productos',
        actionType: 'link',
      })
      recommendations.push('Ajustar el precio de venta o renegociar costos de insumos para los productos con margen negativo para detener pérdidas.')
    }

    if (productosMargenCritico.length > 0) {
      findings.push({
        id: 'margen_critico',
        severity: 'MEDIA',
        category: 'Margen Comercial',
        title: 'Productos con Margen de Ganancia Crítico',
        description: 'Productos activos cuyo margen de contribución comercial es inferior al 15% recomendado.',
        impact: 'Reduce significativamente la rentabilidad general del negocio y limita la absorción de gastos operativos.',
        count: productosMargenCritico.length,
        items: productosMargenCritico.slice(0, 10).map(p => ({
          label: p.nombre,
          detail: p.categoria,
          value: `Margen: ${p.margenPct}% | Costo: RD$ ${(p.costoCents / 100).toFixed(2)}`,
        })),
        actionLabel: 'Revisar Recetas/Precios',
        actionHref: '/admin/recetario',
        actionType: 'link',
      })
      recommendations.push('Optimizar el recetario o aplicar un incremento estratégico de precios en los artículos con margen inferior al 15%.')
    }

    // Findings de Inventario
    if (insumosNegativos.length > 0) {
      findings.push({
        id: 'inventario_negativo',
        severity: 'MEDIA',
        category: 'Control de Inventario',
        title: 'Insumos con Stock Negativo',
        description: 'Materias primas clave que registran una cantidad en stock inferior a cero.',
        impact: 'Indica un desfase en el control: ventas de productos sin registrar las compras correspondientes de insumos, o mermas mal calculadas.',
        count: insumosNegativos.length,
        items: insumosNegativos.slice(0, 10).map(i => ({
          label: i.nombre,
          detail: `Medida: ${i.unidadMedida}`,
          value: `Stock: ${i.stockActual}`,
        })),
        actionLabel: 'Ajustar Inventario',
        actionHref: '/admin/inventario',
        actionType: 'link',
      })
      recommendations.push('Realizar un conteo físico e ingresar los ajustes correspondientes en los insumos que muestran stock negativo.')
    }

    if (insumosBajoMinimo.length > 0) {
      findings.push({
        id: 'inventario_bajo_minimo',
        severity: 'BAJA',
        category: 'Control de Inventario',
        title: 'Insumos por Debajo del Mínimo',
        description: 'Insumos cuyo stock actual es inferior al stock mínimo de seguridad configurado.',
        impact: 'Riesgo de quiebre de stock que impediría preparar ciertos productos del menú y afectaría el servicio.',
        count: insumosBajoMinimo.length,
        items: insumosBajoMinimo.slice(0, 10).map(i => ({
          label: i.nombre,
          detail: `Mínimo: ${i.stockMinimo} ${i.unidadMedida}`,
          value: `Actual: ${i.stockActual} ${i.unidadMedida}`,
        })),
        actionLabel: 'Crear Orden de Compra',
        actionHref: '/admin/compras',
        actionType: 'link',
      })
      recommendations.push(`Emitir órdenes de compra para los ${insumosBajoMinimo.length} insumos que se encuentran por debajo del stock de seguridad.`)
    }

    // Findings de Cartera (Deudas)
    if (cxpVencidas.length > 0) {
      findings.push({
        id: 'cxp_vencidas',
        severity: 'MEDIA',
        category: 'Control de Cartera',
        title: 'Cuentas por Pagar Vencidas',
        description: 'Facturas de proveedores que han superado su fecha de vencimiento y continúan pendientes de pago.',
        impact: 'Riesgo de suspensión de crédito por parte de proveedores y cargos por atrasos.',
        count: cxpVencidas.length,
        items: cxpVencidas.map(c => ({
          label: c.proveedor?.nombre || 'Proveedor Desconocido',
          detail: c.descripcion,
          value: `Vencimiento: ${new Date(c.fechaVencimiento!).toLocaleDateString('es-DO')} | Balance: RD$ ${((c.montoCents - c.pagadoCents) / 100).toFixed(2)}`,
        })),
        actionLabel: 'Gestionar CXP',
        actionHref: '/admin/tesoreria',
        actionType: 'link',
      })
      recommendations.push('Revisar la liquidez bancaria para saldar las facturas vencidas de proveedores y mantener buenas relaciones comerciales.')
    }

    if (cxcVencidas.length > 0) {
      findings.push({
        id: 'cxc_vencidas',
        severity: 'BAJA',
        category: 'Control de Cartera',
        title: 'Cuentas por Cobrar Vencidas',
        description: 'Facturas de clientes (créditos / cuentas por cobrar) vencidas que no han sido saldadas.',
        impact: 'Disminuye la liquidez de caja del negocio al retener capital en la calle.',
        count: cxcVencidas.length,
        items: cxcVencidas.map(c => ({
          label: c.clienteNombre,
          detail: c.descripcion,
          value: `Vencimiento: ${new Date(c.fechaVencimiento!).toLocaleDateString('es-DO')} | Balance: RD$ ${((c.montoCents - c.cobradoCents) / 100).toFixed(2)}`,
        })),
        actionLabel: 'Gestionar CXC',
        actionHref: '/admin/tesoreria',
        actionType: 'link',
      })
      recommendations.push('Iniciar gestiones de cobro con los clientes que presentan cuentas vencidas para recuperar flujo de efectivo.')
    }

    // Recomendación general si la salud es excelente
    if (healthScore >= 95 && recommendations.length === 0) {
      recommendations.push('¡Excelente! El sistema no ha detectado anomalías de consideración. Continúe con sus buenas prácticas contables e impositivas.')
    }

    // ----------------------------------------------------
    // 6. Plan de Eficiencia Contable y Comercial
    // ----------------------------------------------------
    const ordersSummary = await prisma.pedido.aggregate({
      where: { estado: 'PAGADO' },
      _count: true,
      _sum: {
        totalCents: true,
      },
    })
    const totalVentasCents = ordersSummary._sum.totalCents || 0
    const totalPedidos = ordersSummary._count || 0
    const ticketPromedio = totalPedidos > 0 ? Math.round(totalVentasCents / totalPedidos) : 0

    // Porcentaje de pagos en efectivo
    const pagosEfectivo = await prisma.pago.aggregate({
      where: { metodo: 'EFECTIVO' },
      _sum: { montoCents: true }
    })
    const totalPagos = await prisma.pago.aggregate({
      _sum: { montoCents: true }
    })
    const totalPagosCents = totalPagos._sum.montoCents || 1
    const pctEfectivo = Math.round(((pagosEfectivo._sum.montoCents || 0) / totalPagosCents) * 100)

    const efficiencyPlan: any[] = []

    // 1. Margen y Menú
    if (productosMargenNegativo.length > 0 || productosMargenCritico.length > 0) {
      efficiencyPlan.push({
        id: 'opt_menu',
        title: 'Optimización de Menú y Recetas',
        category: 'Rendimiento',
        impact: 'Alto (+10% margen)',
        icon: 'trending-up',
        description: `Se detectaron ${productosMargenNegativo.length + productosMargenCritico.length} productos con márgenes de ganancia deficientes.`,
        advice: 'Implemente control de porciones estricto en la cocina y renegocie costos con proveedores para materias primas como carnes y panes. Considere retirar platos de baja rotación y bajo margen.',
      })
    } else {
      efficiencyPlan.push({
        id: 'opt_menu_ok',
        title: 'Estrategia de Venta Cruzada',
        category: 'Crecimiento',
        impact: 'Medio (+5% ticket)',
        icon: 'trending-up',
        description: 'Sus márgenes comerciales de productos se encuentran estables y saludables.',
        advice: 'Diseñe combos premium (hamburguesa + bebida + postre) y entrene al cajero en venta sugestiva de agregados para elevar el ticket promedio.',
      })
    }

    // 2. Ticket Promedio
    if (ticketPromedio > 0 && ticketPromedio < 40000) { // Menor a RD$ 400
      efficiencyPlan.push({
        id: 'opt_ticket',
        title: 'Incrementar el Ticket Promedio',
        category: 'Ingresos',
        impact: 'Alto (+RD$ 100 por cliente)',
        icon: 'coins',
        description: `Su ticket promedio actual es de RD$ ${(ticketPromedio / 100).toFixed(2)}, el cual se considera bajo para el sector.`,
        advice: 'Lance combos de almuerzo rápido y configure agregados sugeridos en el POS (ej: extra queso, papas grandes) para incentivar la compra.',
      })
    }

    // 3. Eficiencia en Medios de Pago
    if (pctEfectivo > 60) {
      efficiencyPlan.push({
        id: 'opt_pagos',
        title: 'Reducción del Uso de Efectivo',
        category: 'Operaciones',
        impact: 'Medio (Ahorro de tiempo)',
        icon: 'credit-card',
        description: `El ${pctEfectivo}% de sus ventas se liquidan en efectivo, lo que incrementa costos y tiempos operativos.`,
        advice: 'Promueva el uso de tarjetas y transferencias instantáneas ofreciendo incentivos o agilizando las colas rápidas exclusivas para pagos digitales.',
      })
    } else {
      efficiencyPlan.push({
        id: 'opt_pagos_ok',
        title: 'Control de Arqueos de Caja',
        category: 'Seguridad',
        impact: 'Bajo (Control)',
        icon: 'shield',
        description: 'La distribución de métodos de pago es saludable, reduciendo la exposición a efectivo.',
        advice: 'Mantenga una auditoría semanal de comisiones bancarias de adquirentes para asegurar que las tasas aplicadas correspondan a lo contratado.',
      })
    }

    // 4. Inventarios e Insumos
    if (insumosNegativos.length > 0 || insumosBajoMinimo.length > 0) {
      efficiencyPlan.push({
        id: 'opt_inventario',
        title: 'Control de Desperdicios e Insumos',
        category: 'Inventario',
        impact: 'Alto (Evita pérdidas)',
        icon: 'package',
        description: `Tiene ${insumosNegativos.length} insumos en negativo y ${insumosBajoMinimo.length} por debajo del stock de seguridad.`,
        advice: 'Establezca una política de arqueo físico semanal de materia prima y configure alertas automáticas de reorden de compras para evitar paros de cocina.',
      })
    }

    // 5. Gestión del Capital de Trabajo
    if (cxpVencidas.length > 0 || cxcVencidas.length > 0) {
      efficiencyPlan.push({
        id: 'opt_capital',
        title: 'Optimización de Cuentas Pendientes',
        category: 'Finanzas',
        impact: 'Alto (+Flujo de Caja)',
        icon: 'scale',
        description: `Existen deudas vencidas con proveedores por pagar o facturas pendientes de cobro a clientes.`,
        advice: 'Implemente cobros preventivos mediante alertas de WhatsApp y negocie plazos de pago con proveedores alineados a sus picos de ventas de fin de semana.',
      })
    }

    return NextResponse.json({
      ok: true,
      healthScore,
      healthLevel,
      categories: [
        { name: 'Integridad Contable', score: scoreIntegridad, maxScore: 100, weight: '25%' },
        { name: 'Cumplimiento Fiscal', score: scoreFiscal, maxScore: 100, weight: '25%' },
        { name: 'Margen Comercial', score: scoreMargen, maxScore: 100, weight: '20%' },
        { name: 'Control de Inventario', score: scoreInventario, maxScore: 100, weight: '15%' },
        { name: 'Control de Cartera', score: scoreDeuda, maxScore: 100, weight: '15%' },
      ],
      findings,
      recommendations,
      efficiencyPlan,
    })
  } catch (error: any) {
    console.error('Error en diagnóstico contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
