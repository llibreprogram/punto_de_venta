import prisma from '@/lib/db'
import { ItemStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET() {
  // Cocina/KDS: listar items pendientes/en proceso
  // Requerir sesión (cualquier rol autenticado)
  // Nota: si deseas permitir KDS público en red local, crea un token específico.
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.pedidoItem.findMany({
    where: { estado: { in: [ItemStatus.PENDIENTE, ItemStatus.EN_PROCESO] } },
    include: { pedido: { include: { mesa: true } }, producto: true },
    orderBy: [{ pedidoId: 'desc' }, { id: 'asc' }],
    take: 500,
  })
  return NextResponse.json(items)
}

export async function PUT(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const id = Number(body?.id)
  const estado = String(body?.estado)
  if (!id || !['PENDIENTE','EN_PROCESO','LISTO'].includes(estado)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const status = estado as keyof typeof ItemStatus
  const updated = await prisma.pedidoItem.update({ where: { id }, data: { estado: ItemStatus[status] } })
  return NextResponse.json(updated)
}
