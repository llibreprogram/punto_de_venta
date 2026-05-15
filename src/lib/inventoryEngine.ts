import prisma from '@/lib/db'

/**
 * Descuenta del inventario los insumos requeridos por un PedidoItem basado en su receta.
 * Retorna true si fue exitoso, false si falló o si ya había sido descontado.
 */
export async function descontarInventarioParaItem(pedidoItemId: number, usuarioId?: number, razon?: string): Promise<boolean> {
  try {
    const item = await prisma.pedidoItem.findUnique({
      where: { id: pedidoItemId },
      include: {
        producto: {
          include: {
            recetaItems: true
          }
        }
      }
    })

    if (!item) return false
    if (item.inventarioDescontado) return false // Evitar doble descuento
    if (item.producto.recetaItems.length === 0) {
      // El producto no tiene receta, pero lo marcamos como procesado
      await prisma.pedidoItem.update({
        where: { id: pedidoItemId },
        data: { inventarioDescontado: true }
      })
      return true
    }

    // Procesar todos los insumos en una transacción
    await prisma.$transaction(async (tx) => {
      for (const receta of item.producto.recetaItems) {
        const cantidadARestar = receta.cantidadRequerida * item.cantidad

        // Restar stock
        await tx.insumo.update({
          where: { id: receta.insumoId },
          data: {
            stockActual: {
              decrement: cantidadARestar
            }
          }
        })

        // Registrar movimiento
        await tx.movimientoInventario.create({
          data: {
            insumoId: receta.insumoId,
            tipo: 'SALIDA',
            cantidad: -cantidadARestar,
            razon: razon || `Venta Pedido #${item.pedidoId}`,
            usuarioId: usuarioId
          }
        })
      }

      // Marcar item como descontado
      await tx.pedidoItem.update({
        where: { id: pedidoItemId },
        data: { inventarioDescontado: true }
      })
    })

    return true
  } catch (error) {
    console.error('[InventoryEngine] Error descontando inventario para item', pedidoItemId, error)
    return false
  }
}
