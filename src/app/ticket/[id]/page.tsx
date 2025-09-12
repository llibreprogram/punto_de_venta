import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import prisma from '@/lib/db'
import TicketClient from './ticketClient'

type AjustesRow = { id:number; updatedAt:Date; locale:string; currency:string; taxPct:number; businessName:string; ticketFooter:string; logoUrl:string; printerIp?:string|null; printerPort?:number|null; serialBaud?:number|null }
type PedidoItem = { id:number; cantidad:number; precioCents:number; totalCents:number; removidos?: string[] | null; extras?: string[] | null; notas?: string | null; producto:{ nombre:string } }
type Pedido = { id:number; numero:number; createdAt:Date; subtotalCents:number; impuestoCents:number; descuentoCents:number; totalCents:number; mesa?:{nombre:string}|null; subCuenta?:number; items:PedidoItem[] }

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id: idStr } = await params
  const sp = await searchParams
  const id = Number(idStr)
  const [pedido, ajustes] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id },
      include: { items: { include: { producto: true } }, mesa: true }
    }) as unknown as Pedido | null,
    prisma.ajustes.findUnique({ where: { id: 1 } }) as unknown as AjustesRow | null
  ])
  if (!pedido) {
    // Si no existe el pedido mostramos 404 (mejor que error 500)
    notFound()
  }
  // Audit access (non-blocking best-effort)
  const signed = !!sp?.sig && !!sp?.exp
  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
    await prisma.ticketAccess.create({ data: { pedidoId: id, signed, ip: ip ?? undefined } })
  } catch {}
  return <TicketClient pedido={pedido} ajustes={ajustes} />
}

// Server component delega la UI interactiva a un client component para evitar errores Edge.

// Types reusados en client
export type TicketPedido = Pedido
export type TicketAjustes = AjustesRow | null

