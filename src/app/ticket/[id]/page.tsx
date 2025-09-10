import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import SerialPrintButton from '@/components/SerialPrintButton'
import NetworkPrintButton from '@/components/NetworkPrintButton'
import prisma from '@/lib/db'

type AjustesRow = { id:number; updatedAt:Date; locale:string; currency:string; taxPct:number; businessName:string; ticketFooter:string; logoUrl:string; printerIp?:string|null; printerPort?:number|null; serialBaud?:number|null }

type PedidoItem = { id:number; cantidad:number; precioCents:number; totalCents:number; removidos?: string[] | null; extras?: string[] | null; notas?: string | null; producto:{ nombre:string } }
type Pedido = { id:number; numero:number; createdAt:Date; subtotalCents:number; impuestoCents:number; descuentoCents:number; totalCents:number; mesa?:{nombre:string}|null; items:PedidoItem[] }

export default async function TicketPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  const [pedido, ajustes] = await Promise.all([
    prisma.pedido.findUnique({
    where: { id },
  include: { items: { include: { producto: true } }, mesa: true }
  }) as unknown as Pedido | null,
    prisma.ajustes.findUnique({ where: { id: 1 } }) as unknown as AjustesRow | null
  ])
  if (!pedido) throw new Error('Pedido no encontrado')
  const locale = ajustes?.locale || LOCALE
  const currency = ajustes?.currency || CURRENCY
  const fecha = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(pedido.createdAt))
  const business = ajustes?.businessName || process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Mi Restaurante'
  const footer = ajustes?.ticketFooter || process.env.NEXT_PUBLIC_TICKET_FOOTER || '¡Gracias por su compra!'
  const logoUrl = ajustes?.logoUrl || process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png'
  return (
    <main className="mx-auto max-w-sm p-4 print:p-0">
      <div className="text-center grid gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="logo" className="mx-auto h-12 object-contain" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
        <h1 className="font-bold">{business}</h1>
        <div className="text-xs text-gray-600">Ticket #{pedido.numero}</div>
        <div className="text-sm text-gray-600">{fecha}</div>
      </div>
      {pedido.mesa && (
        <div className="text-sm">Mesa: {pedido.mesa.nombre}</div>
      )}
      <hr className="my-3" />
      <div className="text-sm">
  {pedido.items.map((it) => (
          <div key={it.id} className="flex justify-between">
            <div>
              <div>{it.producto.nombre}</div>
              <div className="text-xs text-gray-600">x{it.cantidad} · {toCurrency(it.precioCents, locale, currency)}</div>
              {!!(it.removidos && it.removidos.length) && (
                <div className="text-xs text-red-600">Sin: {it.removidos.join(', ')}</div>
              )}
              {!!(it.notas) && (
                <div className="text-xs text-gray-700">Nota: {it.notas}</div>
              )}
              {!!(it.extras && it.extras.length) && (
                <div className="text-xs text-green-700">Extra: {it.extras.join(', ')}</div>
              )}
            </div>
            <div>{toCurrency(it.totalCents, locale, currency)}</div>
          </div>
        ))}
      </div>
      <hr className="my-3" />
      <div className="text-sm grid gap-1">
        <div className="flex justify-between"><span>Subtotal</span><span>{toCurrency(pedido.subtotalCents, locale, currency)}</span></div>
        <div className="flex justify-between"><span>Impuesto</span><span>{toCurrency(pedido.impuestoCents, locale, currency)}</span></div>
        {pedido.descuentoCents ? (
          <div className="flex justify-between"><span>Descuento</span><span>-{toCurrency(pedido.descuentoCents, locale, currency)}</span></div>
        ) : null}
        <div className="flex justify-between font-bold"><span>Total</span><span>{toCurrency(pedido.totalCents, locale, currency)}</span></div>
      </div>
      <hr className="my-3" />
  <div className="text-xs text-gray-600 text-center">{footer}</div>
      <div className="mt-4 no-print flex flex-wrap gap-2 items-center">
        <button className="border px-3 py-2 rounded" onClick={() => window.print()}>Imprimir</button>
        <a className="border px-3 py-2 rounded" href={`/api/print/ticket/${pedido.id}`} target="_blank">Descargar ESC/POS</a>
        <SerialPrintButton payloadUrl={`/api/print/ticket/${pedido.id}`} defaultBaud={ajustes?.serialBaud ?? undefined} />
        <NetworkPrintButton payloadUrl={`/api/print/ticket/${pedido.id}`} defaultIp={ajustes?.printerIp ?? undefined} defaultPort={ajustes?.printerPort ?? undefined} />
      </div>
      <style>{`@media print {.no-print{ display:none; } body{ background:white; }}`}</style>
    </main>
  )
}
