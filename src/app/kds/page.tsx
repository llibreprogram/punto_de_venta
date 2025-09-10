"use client"
import { useEffect, useMemo, useState } from 'react'

type KItem = {
  id:number
  cantidad:number
  notas?:string|null
  removidos?: string[]|null
  extras?: string[]|null
  estado: 'PENDIENTE'|'EN_PROCESO'|'LISTO'
  pedido: { id:number; numero:number; mesa?:{nombre:string}|null }
  producto: { nombre:string }
}

export default function KDSPage() {
  const [items, setItems] = useState<KItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ocultarListos, setOcultarListos] = useState(true)
  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/kds', { cache:'no-store' })
    const json = await res.json()
    setItems(json)
    setLoading(false)
  }
  useEffect(()=>{ load(); const t=setInterval(load, 3000); return ()=>clearInterval(t) }, [])
  const grupos = useMemo(()=>{
    const byPedido = new Map<number, KItem[]>()
    for (const it of items) {
      const arr = byPedido.get(it.pedido.id) || []
      arr.push(it); byPedido.set(it.pedido.id, arr)
    }
    let entries = Array.from(byPedido.entries())
    if (ocultarListos) entries = entries.filter(([_, arr])=> arr.some(it=> it.estado!=='LISTO'))
    return entries
  }, [items, ocultarListos])

  const updateEstado = async (id:number, estado: 'PENDIENTE'|'EN_PROCESO'|'LISTO') => {
    await fetch('/api/kds', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, estado }) })
    await load()
  }

  return (
    <main className="p-4 max-w-6xl mx-auto grid gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Cocina (KDS)</h1>
        <label className="ml-auto text-sm flex items-center gap-2"><input type="checkbox" checked={ocultarListos} onChange={e=>setOcultarListos(e.target.checked)} /> Ocultar pedidos listos</label>
        <button className="btn" onClick={load} disabled={loading}>{loading?'…':'Refrescar'}</button>
      </div>
      {grupos.length===0 ? (
        <div className="text-sm">Sin pendientes</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map(([pedidoId, its])=> (
            <section key={pedidoId} className="card rounded p-3 grid gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Pedido #{its[0]?.pedido?.numero}</div>
                  {its[0]?.pedido?.mesa?.nombre && <div className="text-xs text-gray-600">Mesa: {its[0].pedido.mesa.nombre}</div>}
                </div>
                <button className="btn" onClick={async()=>{
                  // Marcar todo el pedido como LISTO
                  await Promise.all(its.map(it=> fetch('/api/kds', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: it.id, estado: 'LISTO' }) })))
                  await load()
                }}>Listo</button>
              </div>
              <div className="divide-y">
                {its.map(it=> (
                  <div key={it.id} className="py-2 grid gap-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{it.cantidad} × {it.producto.nombre}</div>
                      <select className="input" value={it.estado} onChange={e=>updateEstado(it.id, e.target.value as 'PENDIENTE'|'EN_PROCESO'|'LISTO')}>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_PROCESO">En proceso</option>
                        <option value="LISTO">Listo</option>
                      </select>
                    </div>
                    {it.extras?.length ? (<div className="text-xs text-green-700">Extra: {it.extras.join(', ')}</div>) : null}
                    {it.removidos?.length ? (<div className="text-xs text-red-600">Sin: {it.removidos.join(', ')}</div>) : null}
                    {it.notas ? (<div className="text-xs">Nota: {it.notas}</div>) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
