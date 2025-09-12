import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { escposTicket } from '@/lib/escpos'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || (session.user.rol !== 'admin' && session.user.rol !== 'cajero'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await context.params
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(id) },
    include: { items: { include: { producto: true } } }
  })
  const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } })
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const locale = ajustes?.locale || LOCALE
  const currency = ajustes?.currency || CURRENCY
  const fecha = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(pedido.createdAt))
  const business = ajustes?.businessName || 'Mi Restaurante'
  const items = (pedido.items as unknown) as Array<{ cantidad:number; precioCents:number; totalCents:number; extras?: string[] | null; removidos?: string[] | null; notas?: string|null; producto:{ nombre:string } }>
  const mesaNombre = (pedido as { mesa?: { nombre?: string } | null }).mesa?.nombre
  const subCuenta: number | undefined = (pedido as unknown as { subCuenta?: number }).subCuenta
  const payload = escposTicket({
    business,
    numero: pedido.numero,
    fecha,
    mesa: mesaNombre,
    subCuenta,
  items: items.map(it => ({ nombre: it.producto.nombre + (Array.isArray(it.extras) && it.extras.length? `\n  + ${it.extras.join(', ')}`:'' ) + (Array.isArray(it.removidos) && it.removidos.length? `\n  - Sin: ${it.removidos.join(', ')}`:'' ) + (it.notas? `\n  * ${it.notas}`:''), cantidad: it.cantidad, unit: toCurrency(it.precioCents, locale, currency), total: toCurrency(it.totalCents, locale, currency) })),
  subtotal: toCurrency(pedido.subtotalCents, locale, currency),
  impuesto: toCurrency(pedido.impuestoCents, locale, currency),
  descuento: pedido.descuentoCents ? toCurrency(pedido.descuentoCents, locale, currency) : undefined,
  total: toCurrency(pedido.totalCents, locale, currency),
    footer: ajustes?.ticketFooter
  })
  return new NextResponse(payload, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
