/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { anularAsiento } from '@/lib/accounting'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)

    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id: idStr } = await context.params
    const id = parseInt(idStr, 10)

    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: 'ID de asiento inválido' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

    const result = await anularAsiento(
      id,
      session.user.id,
      session.user.nombre,
      ip
    )

    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('Error al anular asiento contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
