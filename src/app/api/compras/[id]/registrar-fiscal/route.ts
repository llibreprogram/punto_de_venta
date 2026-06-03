/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { registrarCompraContabilidad } from '@/lib/accounting'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)
    
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const ordenId = Number(id)

    if (isNaN(ordenId)) {
      return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 })
    }

    const body = await req.json()
    const { rncProveedor, ncf, tipoGasto, itebisFacturadoCents, metodoPago } = body

    if (!rncProveedor || !ncf || !tipoGasto || !metodoPago) {
      return NextResponse.json(
        { error: 'RNC de Proveedor, NCF, Tipo de Gasto y Método de Pago son obligatorios.' },
        { status: 400 }
      )
    }

    if (!['EFECTIVO', 'TRANSFERENCIA', 'CREDITO'].includes(metodoPago)) {
      return NextResponse.json(
        { error: 'Método de pago no válido.' },
        { status: 400 }
      )
    }

    const result = await registrarCompraContabilidad(ordenId, {
      rncProveedor: rncProveedor.trim(),
      ncf: ncf.trim(),
      tipoGasto,
      itebisFacturadoCents: parseInt(itebisFacturadoCents) || 0,
      metodoPago
    })

    return NextResponse.json({ ok: true, report: result })
  } catch (error: any) {
    console.error(`Error al registrar fiscalmente la compra:`, error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
