import prisma from '@/lib/db'

export type SugerenciaCompra = {
  insumoId: number
  nombre: string
  unidadMedida: string
  stockActual: number
  stockMinimo: number
  proveedorId: number | null
  proveedorNombre: string | null
  costoCents: number
  consumoDiarioPromedio: number
  diasVidaUtil: number
  cantidadSugerida: number
  totalEstimadoCents: number
  razonSugerencia: string
}

export async function generarSugerenciasCompra(): Promise<SugerenciaCompra[]> {
  // 1. Obtener todos los insumos activos
  const todos = await prisma.insumo.findMany({
    where: { activo: true },
    include: { proveedor: true }
  })

  // Obtener todas las recetas de productos activos
  const recetaItems = await prisma.recetaItem.findMany({
    where: {
      producto: { activo: true },
      insumo: { activo: true }
    }
  })

  // Calcular el máximo requerido en receta por cada insumo
  const maxRequeridoPorInsumo: Record<number, number> = {}
  for (const item of recetaItems) {
    maxRequeridoPorInsumo[item.insumoId] = Math.max(
      maxRequeridoPorInsumo[item.insumoId] || 0,
      item.cantidadRequerida
    )
  }

  // Filtrar insumos que están por debajo de su stock mínimo efectivo
  const insumos = todos.filter(i => {
    const maxReceta = maxRequeridoPorInsumo[i.id] || 0
    const effectiveMin = Math.max(i.stockMinimo, maxReceta)
    return i.stockActual <= effectiveMin
  })

  const sugerencias: SugerenciaCompra[] = []
  
  // Fecha de hace 30 días para calcular el ritmo de consumo (Burn Rate)
  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)

  for (const insumo of insumos) {
    const maxReceta = maxRequeridoPorInsumo[insumo.id] || 0
    const effectiveMin = Math.max(insumo.stockMinimo, maxReceta)

    // 2. Calcular velocidad de consumo (Burn Rate)
    // Buscamos todas las "SALIDAS" en los últimos 30 días
    const salidas = await prisma.movimientoInventario.aggregate({
      _sum: { cantidad: true },
      where: {
        insumoId: insumo.id,
        tipo: 'SALIDA',
        createdAt: { gte: hace30Dias }
      }
    })

    // La cantidad en base de datos de SALIDA es negativa, por lo que tomamos valor absoluto
    const totalConsumido30d = Math.abs(salidas._sum.cantidad || 0)
    const consumoDiarioPromedio = totalConsumido30d / 30

    // Si no hay consumo histórico, sugerimos comprar lo necesario para volver al mínimo + 20%
    let cantidadSugerida = 0
    let razonSugerencia = ''

    if (consumoDiarioPromedio === 0) {
      cantidadSugerida = (effectiveMin * 1.2) - insumo.stockActual
      razonSugerencia = maxReceta > insumo.stockMinimo
        ? 'Requerido en receta activa sin historial de consumo.'
        : 'Sin historial de consumo. Sugerencia basada en Stock Mínimo.'
    } else {
      // 3. Cálculo JIT: Meta de cobertura de 7 días (1 semana)
      const diasCoberturaMeta = 7
      let metaInventario = Math.max(consumoDiarioPromedio * diasCoberturaMeta, effectiveMin * 1.2)

      // 4. Restricción estricta de caducidad (Vida Útil)
      // Nunca comprar más de lo que se consume en el 80% de su vida útil.
      // PERO: Nunca bajar de stockMinimo, porque si estamos por debajo hay que reabastecer sí o sí.
      const limiteCaducidad = consumoDiarioPromedio * (insumo.diasVidaUtil * 0.8)

      if (metaInventario > limiteCaducidad) {
        metaInventario = Math.max(limiteCaducidad, effectiveMin)
        razonSugerencia = `Limitado por caducidad (${insumo.diasVidaUtil} días). Evita merma.`
      } else {
        razonSugerencia = `Basado en ritmo de consumo: ${consumoDiarioPromedio.toFixed(2)} ${insumo.unidadMedida}/día.`
      }

      cantidadSugerida = metaInventario - insumo.stockActual
    }

    // Asegurarnos de que no sea negativo y redondear
    cantidadSugerida = Math.max(0, Math.ceil(cantidadSugerida * 100) / 100)

    if (cantidadSugerida > 0) {
      sugerencias.push({
        insumoId: insumo.id,
        nombre: insumo.nombre,
        unidadMedida: insumo.unidadMedida,
        stockActual: insumo.stockActual,
        stockMinimo: effectiveMin,
        proveedorId: insumo.proveedorId,
        proveedorNombre: insumo.proveedor?.nombre || 'Sin Proveedor Asignado',
        costoCents: insumo.costoCents,
        consumoDiarioPromedio,
        diasVidaUtil: insumo.diasVidaUtil,
        cantidadSugerida,
        totalEstimadoCents: insumo.costoCents * cantidadSugerida,
        razonSugerencia
      })
    }
  }

  return sugerencias
}
