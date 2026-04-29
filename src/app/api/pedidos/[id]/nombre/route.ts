/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = Number((await params).id)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await req.json()
    const { nombreCuenta } = body

    if (nombreCuenta === undefined) {
      return NextResponse.json({ error: 'Se requiere nombreCuenta' }, { status: 400 })
    }

    const pedido = await prisma.pedido.update({
      where: { id },
      data: {
        nombreCuenta: nombreCuenta === '' ? null : nombreCuenta
      }
    })

    return NextResponse.json(pedido)
  } catch (e: any) {
    console.error('[PATCH pedido/nombre]', e)
    return NextResponse.json({ error: e.message || 'Error al actualizar nombre de cuenta' }, { status: 500 })
  }
}
