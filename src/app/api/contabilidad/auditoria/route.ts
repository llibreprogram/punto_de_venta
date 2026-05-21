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

    const { searchParams } = new URL(request.url)
    const limite = searchParams.get('limite') ? parseInt(searchParams.get('limite') || '100', 10) : 100

    const logs = await prisma.auditoriaContable.findMany({
      orderBy: { createdAt: 'desc' },
      take: limite
    })

    return NextResponse.json({ ok: true, logs })
  } catch (error: any) {
    console.error('Error al obtener log de auditoría:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
