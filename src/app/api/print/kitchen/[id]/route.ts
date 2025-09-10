import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) }, include: { items: { include: { producto: true } }, mesa: true } })
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const fecha = new Intl.DateTimeFormat('es-DO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(pedido.createdAt))
  let out = ''
  out += `PEDIDO #${pedido.numero}\n${fecha}\n`
  if (pedido.mesa?.nombre) out += `Mesa: ${pedido.mesa.nombre}\n`
  out += `------------------------------\n`
  const items = (pedido.items as unknown) as Array<{ cantidad:number; extras?:string[]|null; removidos?:string[]|null; notas?:string|null; producto:{ nombre:string } }>
  for (const it of items) {
    out += `${it.cantidad} x ${it.producto.nombre}\n`
    if (Array.isArray(it.extras) && it.extras.length) out += `  + ${it.extras.join(', ')}\n`
    if (Array.isArray(it.removidos) && it.removidos.length) out += `  - Sin: ${it.removidos.join(', ')}\n`
    if (it.notas) out += `  * ${it.notas}\n`
  }
  out += `\n\n`
  return new NextResponse(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
