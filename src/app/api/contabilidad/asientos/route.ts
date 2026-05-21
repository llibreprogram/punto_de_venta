/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { crearAsiento, isPeriodClosed } from '@/lib/accounting'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

// GET /api/contabilidad/asientos
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')
    const origen = searchParams.get('origen')

    const whereClause: any = {}

    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      }
    }

    if (origen) {
      whereClause.origen = origen
    }

    const asientos = await prisma.transaccionContable.findMany({
      where: whereClause,
      include: {
        apuntes: {
          include: {
            cuenta: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
    })

    return NextResponse.json({ ok: true, asientos })
  } catch (error: any) {
    console.error('Error al obtener asientos contables:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST /api/contabilidad/asientos
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { fecha, descripcion, referencia, origen, apuntes } = body

    if (!fecha || !descripcion || !apuntes || !Array.isArray(apuntes) || apuntes.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Fecha, descripción y apuntes (lista) son campos obligatorios.' },
        { status: 400 }
      )
    }

    const targetDate = new Date(fecha)

    // Validar período cerrado antes de llamar a crearAsiento
    if (await isPeriodClosed(targetDate)) {
      const year = targetDate.getFullYear()
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      return NextResponse.json(
        { ok: false, error: `El período ${year}-${month} está cerrado. No se permiten registrar nuevos asientos.` },
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

    const asientoCreado = await crearAsiento(
      targetDate,
      descripcion,
      referencia || '',
      origen || 'MANUAL',
      apuntes,
      undefined,
      {
        usuarioId: session.user.id,
        usuarioNombre: session.user.nombre,
        ip
      }
    )

    return NextResponse.json({ ok: true, asiento: asientoCreado })
  } catch (error: any) {
    console.error('Error al crear asiento contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }
}
