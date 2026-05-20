/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { prisma } from './db'

export { validarCedula, validarRnc, validarDocumentoIdentidad } from './ncf-client'

/**
 * Formatea un número correlativo con el prefijo de NCF y el tipo de comprobante.
 * Soporta serie física "B" (8 dígitos) y electrónica "E" (10 dígitos).
 */
export function formatNcf(prefijo: string, tipoCodigo: string, numero: number): string {
  const padding = prefijo === 'E' ? 10 : 8
  const numeroStr = String(numero).padStart(padding, '0')
  return `${prefijo}${tipoCodigo}${numeroStr}`
}

/**
 * Genera el siguiente NCF de una secuencia activa en la base de datos de manera segura y concurrente.
 */
export async function consumirSiguienteNcf(tipo: string): Promise<{ ncf: string; secuenciaId: number }> {
  return await prisma.$transaction(async (tx) => {
    const secuencia = await tx.secuenciaNcf.findFirst({
      where: { tipo, activa: true },
    })

    if (!secuencia) {
      throw new Error(`No se encontró una secuencia de NCF activa para el tipo: ${tipo}`)
    }

    // Validar fecha de vencimiento
    if (new Date() > secuencia.vencimiento) {
      throw new Error(`La secuencia de NCF (${tipo}) ha vencido el ${secuencia.vencimiento.toLocaleDateString()}`)
    }

    // Validar si quedan disponibles
    if (secuencia.actual >= secuencia.fin) {
      throw new Error(`La secuencia de NCF (${tipo}) se ha agotado. Último asignado: ${secuencia.actual}`)
    }

    const nuevoActual = secuencia.actual + 1

    // Actualizar el valor actual en la secuencia
    await tx.secuenciaNcf.update({
      where: { id: secuencia.id },
      data: { actual: nuevoActual },
    })

    const ncfGenerado = formatNcf(secuencia.prefijo, secuencia.tipoCodigo, nuevoActual)

    return {
      ncf: ncfGenerado,
      secuenciaId: secuencia.id,
    }
  })
}
