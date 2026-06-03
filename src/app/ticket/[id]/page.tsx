import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import prisma from '@/lib/db'
import TicketClient from './ticketClient'

type AjustesRow = { id:number; updatedAt:Date; locale:string; currency:string; taxPct:number; propinaPct?:number; businessName:string; businessAddress?:string|null; businessRnc?:string|null; businessPhone?:string|null; ticketFooter:string; logoUrl:string; printerIp?:string|null; printerPort?:number|null; serialBaud?:number|null }
type PedidoItem = { id:number; cantidad:number; precioCents:number; totalCents:number; removidos?: string[] | null; extras?: string[] | null; notas?: string | null; producto:{ nombre:string } }
type Pedido = { id:number; numero:number; tipo?:string|null; createdAt:Date; subtotalCents:number; impuestoCents:number; itebisCents:number; propinaCents:number; descuentoCents:number; totalCents:number; mesa?:{nombre:string}|null; subCuenta?:number; nombreCuenta?:string|null; ncf?:string|null; ncfTipo?:string|null; notas?:string|null; items:PedidoItem[]; pagos?: Array<{ id:number; metodo:string; montoCents:number; referencia?:string|null }> }

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id: idStr } = await params
  const sp = await searchParams
  const id = Number(idStr)
  if (!Number.isFinite(id)) notFound()
  const [pedido, ajustes] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id },
      include: { items: { include: { producto: true } }, mesa: true, pagos: true }
    }) as unknown as Pedido | null,
    prisma.ajustes.findUnique({ where: { id: 1 } }) as unknown as AjustesRow | null
  ])
  if (!pedido) {
    // Si no existe el pedido mostramos 404 (mejor que error 500)
    notFound()
  }
  // Audit access (non-blocking best-effort)
  const hasSig = !!sp?.sig && !!sp?.exp
  const printFlag = sp?.print === '1'
  const minimal = hasSig || printFlag
  const autoPrint = printFlag

  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
    await prisma.ticketAccess.create({ data: { pedidoId: id, signed: hasSig, ip: ip ?? undefined } })
  } catch {}
  return <TicketClient pedido={pedido} ajustes={ajustes} minimal={minimal} autoPrint={autoPrint} />
}

// Server component delega la UI interactiva a un client component para evitar errores Edge.

// Types reusados en client
export type TicketPedido = Pedido
export type TicketAjustes = AjustesRow | null

