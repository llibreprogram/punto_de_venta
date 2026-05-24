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
import { registrarVentaContabilidad } from '@/lib/accounting'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)

    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    // Buscar pedidos pagados que no tienen registro fiscal
    const pedidosPendientes = await prisma.pedido.findMany({
      where: {
        estado: 'PAGADO',
        registroFiscal: { is: null },
      },
      select: {
        id: true,
        numero: true,
      },
      orderBy: { id: 'asc' }, // Procesar los más antiguos primero
    })

    if (pedidosPendientes.length === 0) {
      return NextResponse.json({
        ok: true,
        totalFixed: 0,
        message: 'No hay pedidos pendientes de registro fiscal.',
      })
    }

    let totalFixed = 0
    const successes: string[] = []
    const errors: string[] = []

    for (const pedido of pedidosPendientes) {
      try {
        await registrarVentaContabilidad(pedido.id)
        totalFixed++
        successes.push(`Pedido #${pedido.numero} corregido con éxito.`)
      } catch (err: any) {
        console.error(`Error al corregir Pedido #${pedido.numero}:`, err)
        errors.push(`Pedido #${pedido.numero}: ${err.message || 'Error desconocido'}`)
      }
    }

    // Registrar en la auditoría contable general
    await prisma.auditoriaContable.create({
      data: {
        entidad: 'NCF',
        entidadId: 0,
        accion: 'MODIFICAR',
        detalle: `Autofix ejecutado. Correcciones exitosas: ${totalFixed}/${pedidosPendientes.length}. Errores: ${errors.length}`,
        usuarioId: session.user.id,
        usuarioNombre: session.user.nombre,
      },
    })

    return NextResponse.json({
      ok: true,
      totalFixed,
      totalPending: pedidosPendientes.length,
      successes,
      errors,
    })
  } catch (error: any) {
    console.error('Error en autofix de diagnóstico contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
