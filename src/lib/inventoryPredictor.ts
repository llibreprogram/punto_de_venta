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
  // 1. Obtener insumos que están por debajo o igual al stock mínimo y que tienen proveedor asignado
  const todos = await prisma.insumo.findMany({
    where: { activo: true },
    include: { proveedor: true }
  })
  const insumos = todos.filter(i => i.stockActual <= i.stockMinimo)

  const sugerencias: SugerenciaCompra[] = []
  
  // Fecha de hace 30 días para calcular el ritmo de consumo (Burn Rate)
  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)

  for (const insumo of insumos) {
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
      cantidadSugerida = (insumo.stockMinimo * 1.2) - insumo.stockActual
      razonSugerencia = 'Sin historial de consumo. Sugerencia basada en Stock Mínimo.'
    } else {
      // 3. Cálculo JIT: Meta de cobertura de 7 días (1 semana)
      const diasCoberturaMeta = 7
      let metaInventario = consumoDiarioPromedio * diasCoberturaMeta

      // 4. Restricción estricta de caducidad (Vida Útil)
      // Nunca comprar más de lo que se consume en el 80% de su vida útil.
      const limiteCaducidad = consumoDiarioPromedio * (insumo.diasVidaUtil * 0.8)

      if (metaInventario > limiteCaducidad) {
        metaInventario = limiteCaducidad
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
        stockMinimo: insumo.stockMinimo,
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
