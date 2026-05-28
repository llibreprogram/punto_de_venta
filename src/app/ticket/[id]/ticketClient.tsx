"use client"
import AdminLayout from '@/components/AdminLayout'
import SerialPrintButton from '@/components/SerialPrintButton'
import NetworkPrintButton from '@/components/NetworkPrintButton'
import { CopySignedLinkButton } from '@/components/CopySignedLinkButton'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import type { TicketPedido, TicketAjustes } from './page'
import { useEffect, useMemo } from 'react'

export default function TicketClient({ 
  pedido, 
  ajustes, 
  minimal, 
  autoPrint 
}: { 
  pedido: TicketPedido; 
  ajustes: TicketAjustes; 
  minimal: boolean; 
  autoPrint: boolean; 
}) {
  const locale = ajustes?.locale || LOCALE
  const currency = ajustes?.currency || CURRENCY
  const fecha = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(pedido.createdAt))
  const business = ajustes?.businessName || process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Mi Restaurante'
  const footer = ajustes?.ticketFooter || process.env.NEXT_PUBLIC_TICKET_FOOTER || '¡Gracias por su compra!'
  const logoUrl = ajustes?.logoUrl || process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png'

  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 100)
      return () => clearTimeout(t)
    }
  }, [autoPrint])

  const parsedCliente = useMemo(() => {
    if (!pedido.notas) return null
    const rncMatch = pedido.notas.match(/RNC:\s*(\d+)/i)
    const nombreMatch = pedido.notas.match(/Nombre:\s*(.*)/i)
    if (!rncMatch) return null
    return {
      rnc: rncMatch[1],
      nombre: nombreMatch ? nombreMatch[1].trim() : ''
    }
  }, [pedido.notas])

  const qrUrl = useMemo(() => {
    if (!pedido.ncf || !ajustes?.businessRnc) return null
    const rncEmisor = ajustes.businessRnc.replace(/\D/g, '')
    const ncf = pedido.ncf
    const total = (pedido.totalCents / 100).toFixed(2)
    const dateObj = new Date(pedido.createdAt)
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    const fechaEmision = `${day}-${month}-${year}`
    const isCreditoFiscal = pedido.ncfTipo === 'B01' || pedido.ncf.startsWith('E31')
    
    if (isCreditoFiscal) {
      const rncComprador = parsedCliente?.rnc?.replace(/\D/g, '') || '22400005391'
      return `https://ecf.dgii.gov.do/ecf/ConsultaTimbre?RncEmisor=${rncEmisor}&RncComprador=${rncComprador}&eNCF=${ncf}&MontoTotal=${total}&FechaEmision=${fechaEmision}&CodigoSeguridad=e6a7c3`
    } else {
      return `https://fc.dgii.gov.do/eCF/ConsultaTimbreFC?RncEmisor=${rncEmisor}&eNCF=${ncf}&MontoTotal=${total}&CodigoSeguridad=e6a7c3`
    }
  }, [pedido, ajustes, parsedCliente])
  return (
    <AdminLayout title={`Ticket #${pedido.numero}`} minimal={minimal}>
      <div className="mx-auto max-w-sm p-4 print:p-0">
        <div className="text-center grid gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="logo" className="mx-auto h-12 object-contain" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
          <h1 className="font-bold">{business}</h1>
          {ajustes?.businessRnc && <div className="text-xs text-gray-700">RNC: {ajustes.businessRnc}</div>}
          {ajustes?.businessAddress && <div className="text-xs text-gray-700">{ajustes.businessAddress}</div>}
          {ajustes?.businessPhone && <div className="text-xs text-gray-700">Tel: {ajustes.businessPhone}</div>}
          <div className="text-xs text-gray-600 mt-1">Ticket #{pedido.numero}{pedido.mesa?` • Mesa ${pedido.mesa.nombre}${pedido.nombreCuenta ? ` • ${pedido.nombreCuenta}` : (pedido.subCuenta?` C${pedido.subCuenta}`:'')}`:''}</div>
          <div className="text-sm text-gray-600" suppressHydrationWarning>{fecha}</div>
          {pedido.ncf && (
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-left font-mono grid gap-1">
              <div className="font-bold text-center text-slate-800 border-b border-slate-200/60 pb-1.5 mb-1">
                {pedido.ncfTipo === 'B01' ? 'FACTURA DE CRÉDITO FISCAL' : 'CONSUMIDOR FINAL'}
              </div>
              <div><span className="font-semibold text-slate-600">NCF:</span> {pedido.ncf}</div>
              {parsedCliente && (
                <>
                  <div><span className="font-semibold text-slate-600">RNC/Cédula:</span> {parsedCliente.rnc}</div>
                  {parsedCliente.nombre && (
                    <div><span className="font-semibold text-slate-600">Razón Social:</span> {parsedCliente.nombre}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {pedido.mesa && (
          <div className="text-sm font-bold mt-2">Mesa: {pedido.mesa.nombre}{pedido.nombreCuenta ? ` / ${pedido.nombreCuenta}` : (pedido.subCuenta?` / C${pedido.subCuenta}`:'')}</div>
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
          {pedido.itebisCents > 0 && (
            <div className="flex justify-between"><span>ITBIS</span><span>{toCurrency(pedido.itebisCents, locale, currency)}</span></div>
          )}
          {pedido.propinaCents > 0 && (
            <div className="flex justify-between"><span>Propina</span><span>{toCurrency(pedido.propinaCents, locale, currency)}</span></div>
          )}
          {!pedido.itebisCents && !pedido.propinaCents && pedido.impuestoCents > 0 && (
            <div className="flex justify-between"><span>Impuesto</span><span>{toCurrency(pedido.impuestoCents, locale, currency)}</span></div>
          )}
          {pedido.descuentoCents ? (
            <div className="flex justify-between"><span>Descuento</span><span>-{toCurrency(pedido.descuentoCents, locale, currency)}</span></div>
          ) : null}
          <div className="flex justify-between font-bold"><span>Total</span><span>{toCurrency(pedido.totalCents, locale, currency)}</span></div>
        </div>
        
        {pedido.pagos && pedido.pagos.length > 0 && (
          <div className="text-[11px] text-gray-600 mt-2 border-t border-dashed pt-2 grid gap-1">
            {pedido.pagos.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>Método de Pago: <span className="font-semibold">{p.metodo}</span></span>
                {p.referencia && (
                  <span className="font-mono">Conf: <span className="font-bold">{p.referencia}</span></span>
                )}
              </div>
            ))}
          </div>
        )}

         <hr className="my-3" />
        <div className="text-xs text-gray-600 text-center">{footer}</div>
        
        {qrUrl && (
          <div className="mt-4 pt-4 border-t border-dashed border-gray-300 flex flex-col items-center gap-1.5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}`} 
              alt="Código QR DGII e-CF" 
              className="w-28 h-28 border p-1 bg-white rounded"
            />
            <div className="text-[9px] text-gray-500 font-mono leading-tight">
              <span className="font-bold">COMPROBANTE FISCAL ELECTRÓNICO</span>
              <br />
              Tecnología e-CF - Validación Oficial DGII
              <br />
              Código Seg: <span className="font-bold">e6a7c3</span>
            </div>
          </div>
        )}

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
