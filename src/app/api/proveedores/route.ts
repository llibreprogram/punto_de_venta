import prisma from '@/lib/db'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const proveedores = await prisma.proveedor.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      _count: { select: { insumos: true } }
    }
  })
  return NextResponse.json(proveedores)
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  try {
    const prov = await prisma.proveedor.create({
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
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 })
  }
}
