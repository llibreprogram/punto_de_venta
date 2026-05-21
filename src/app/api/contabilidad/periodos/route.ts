/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cerrarPeriodoContable } from '@/lib/accounting'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

// GET /api/contabilidad/periodos
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)

    if (!session) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const periodos = await prisma.periodoCerrado.findMany({
      orderBy: { periodo: 'desc' }
    })

    return NextResponse.json({ ok: true, periodos })
  } catch (error: any) {
    console.error('Error al obtener periodos cerrados:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST /api/contabilidad/periodos
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)

    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { periodo } = body

    if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
      return NextResponse.json({ ok: false, error: 'El período es obligatorio y debe tener formato YYYY-MM' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

    const result = await cerrarPeriodoContable(
      periodo,
      session.user.id,
      session.user.nombre,
      ip
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error al cerrar período contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
