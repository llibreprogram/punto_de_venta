"use client"
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { LOCALE, CURRENCY, toCurrency } from '@/lib/money'
import { useEffect, useMemo, useState } from 'react'

type PedidoRow = { id:number; numero:number; createdAt:string; totalCents:number; estado:string; subCuenta?: number | null; mesa?: { nombre: string } | null }
type PedidoDetalle = { id:number; numero:number; items: Array<{ id:number; cantidad:number; precioCents:number; totalCents:number; producto:{nombre:string}; extras?: string[]|null; removidos?: string[]|null; notas?: string|null }> }

export default function VentasPage() {
  const [data, setData] = useState<PedidoRow[]>([])
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [ajustes, setAjustes] = useState<{ locale:string; currency:string }|null>(null)
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [detalles, setDetalles] = useState<Record<number, PedidoDetalle|undefined>>({})

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/pedidos?${params.toString()}`, { cache: 'no-store' })
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(()=>{
    // initial load without filters
    const init = async () => {
      setLoading(true)
      const [resPedidos, resAjustes] = await Promise.all([
        fetch('/api/pedidos', { cache: 'no-store' }),
        fetch('/api/ajustes', { cache: 'no-store' })
      ])
      const json = await resPedidos.json()
      setData(json)
      const aj = await resAjustes.json().catch(()=>null)
      if (aj?.locale && aj?.currency) setAjustes({ locale: aj.locale, currency: aj.currency })
      setLoading(false)
    }
    init()
  }, [])

  const fmt = new Intl.DateTimeFormat(ajustes?.locale || LOCALE, { dateStyle: 'short', timeStyle: 'short' })
  const totalDia = useMemo(()=> data.reduce((a,p)=>a+p.totalCents,0), [data])

  return (
    <AdminLayout title="Ventas">
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 items-end glass-panel p-3 rounded-lg">
        <label className="grid text-sm">
          Desde
          <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="input" />
        </label>
        <label className="grid text-sm">
          Hasta
          <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="input" />
        </label>
        <button className="btn" onClick={load}>Aplicar</button>
        <button className="btn" onClick={()=>{
          const params = new URLSearchParams()
          if (from) params.set('from', from)
          if (to) params.set('to', to)
          params.set('format','csv')
          const url = `/api/pedidos?${params.toString()}`
          window.open(url, '_blank')
        }}>CSV</button>
        <div className="ml-auto text-sm">Total listado: <strong>{toCurrency(totalDia)}</strong></div>
      </div>
      <div className="glass-panel rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Mesa</th>
              <th className="text-left p-2">Sub</th>
              <th className="text-left p-2">Total</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={7}>Cargando…</td></tr>
            ) : data.length === 0 ? (
              <tr><td className="p-4" colSpan={7}>Sin resultados</td></tr>
            ) : data.map((p) => (
              <>
                <tr key={p.id} className="border-t">
                  <td className="p-2">
                    <button className="mr-2 underline" onClick={async()=>{
                      setOpen(o=>({ ...o, [p.id]: !o[p.id] }))
                      if (!detalles[p.id]) {
                        const res = await fetch(`/api/pedidos/${p.id}`, { cache: 'no-store' })
                        const json = await res.json()
                        setDetalles(d=> ({ ...d, [p.id]: { id: json.id, numero: json.numero, items: json.items } }))
                      }
                    }}>{open[p.id] ? '−' : '+'}</button>
                    {p.numero}
                  </td>
                  <td className="p-2">{fmt.format(new Date(p.createdAt))}</td>
                  <td className="p-2">{p.mesa?.nombre || ''}</td>
                  <td className="p-2">{p.mesa?.nombre ? p.subCuenta : ''}</td>
                  <td className="p-2">{toCurrency(p.totalCents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)}</td>
                  <td className="p-2">{p.estado}</td>
                  <td className="p-2"><Link className="underline" href={`/ticket/${p.id}`}>Ticket</Link></td>
                </tr>
                {open[p.id] && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="p-2">
                      <div className="text-xs grid gap-1">
                        {(detalles[p.id]?.items||[]).map((it)=> (
                          <div key={it.id} className="flex justify-between">
                            <div>
                              <div>{it.producto.nombre}</div>
                              <div className="text-[11px] text-gray-600">x{it.cantidad} · {toCurrency(it.precioCents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)}</div>
                              {!!(it.extras && it.extras.length) && (
                                <div className="text-[11px] text-green-700">Extra: {it.extras.join(', ')}</div>
                              )}
                              {!!(it.removidos && it.removidos.length) && (
                                <div className="text-[11px] text-red-600">Sin: {it.removidos.join(', ')}</div>
                              )}
                              {!!(it.notas) && (
                                <div className="text-[11px] text-gray-700">Nota: {it.notas}</div>
                              )}
                            </div>
                            <div>{toCurrency(it.totalCents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
  </div>
  </AdminLayout>
  )
}
