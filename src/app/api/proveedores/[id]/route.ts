import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const body = await req.json()
  try {
    const prov = await prisma.proveedor.update({
      where: { id: Number(id) },
      data: {
        nombre: body.nombre,
        contacto: body.contacto,
        telefono: body.telefono,
        email: body.email,
        diasEntrega: Number(body.diasEntrega) || 1
      }
    })
    return NextResponse.json(prov)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  try {
    await prisma.proveedor.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 })
  }
}
