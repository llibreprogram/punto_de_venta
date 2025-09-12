"use client"
import AdminLayout from '@/components/AdminLayout'
import SerialPrintButton from '@/components/SerialPrintButton'
import NetworkPrintButton from '@/components/NetworkPrintButton'
import { CopySignedLinkButton } from '@/components/CopySignedLinkButton'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import type { TicketPedido, TicketAjustes } from './page'
import { useEffect, useMemo } from 'react'

export default function TicketClient({ pedido, ajustes }: { pedido: TicketPedido; ajustes: TicketAjustes }) {
  const locale = ajustes?.locale || LOCALE
  const currency = ajustes?.currency || CURRENCY
  const fecha = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(pedido.createdAt))
  const business = ajustes?.businessName || process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Mi Restaurante'
  const footer = ajustes?.ticketFooter || process.env.NEXT_PUBLIC_TICKET_FOOTER || '¡Gracias por su compra!'
  const logoUrl = ajustes?.logoUrl || process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png'
  const { minimal, autoPrint } = useMemo(() => {
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const hasSig = !!sp?.get('sig') && !!sp?.get('exp')
    const printFlag = sp?.get('print') === '1'
    return { minimal: hasSig || printFlag, autoPrint: printFlag }
  }, [])

  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 100)
      return () => clearTimeout(t)
    }
  }, [autoPrint])
  return (
    <AdminLayout title={`Ticket #${pedido.numero}`} minimal={minimal}>
      <div className="mx-auto max-w-sm p-4 print:p-0">
        <div className="text-center grid gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="logo" className="mx-auto h-12 object-contain" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
          <h1 className="font-bold">{business}</h1>
          <div className="text-xs text-gray-600">Ticket #{pedido.numero}{pedido.mesa?` • Mesa ${pedido.mesa.nombre}${pedido.subCuenta?` C${pedido.subCuenta}`:''}`:''}</div>
          <div className="text-sm text-gray-600">{fecha}</div>
        </div>
        {pedido.mesa && (
          <div className="text-sm">Mesa: {pedido.mesa.nombre}{pedido.subCuenta?` / C${pedido.subCuenta}`:''}</div>
        )}
        <hr className="my-3" />
        <div className="text-sm">
          {pedido.items.map(it => (
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
          <CopySignedLinkButton id={pedido.id} />
        </div>
        <style>{`@media print {.no-print{ display:none; } body{ background:white; }}`}</style>
      </div>
    </AdminLayout>
  )
}
