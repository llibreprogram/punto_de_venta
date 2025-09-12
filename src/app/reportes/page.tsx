"use client"
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import AdminLayout from '@/components/AdminLayout'

type Tipo = 'dia'|'categoria'|'producto'|'hora'

export default function ReportesPage() {
  const [type, setType] = useState<Tipo>('dia')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Array<Record<string, string|number>>>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'total'|'cantidad'|'margen'>('total')
  const [top, setTop] = useState<string>('')
  const [ajustes, setAjustes] = useState<{ locale?:string; currency?:string }|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
  const params = new URLSearchParams()
    params.set('type', type)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
  if ((type==='categoria' || type==='producto') && metric) params.set('metric', metric)
  if ((type==='categoria' || type==='producto') && top.trim()) params.set('top', top.trim())
    const [r, a] = await Promise.all([
      fetch(`/api/reportes?${params.toString()}`, { cache: 'no-store' }),
      fetch('/api/ajustes', { cache: 'no-store' }).catch(()=>null as unknown as Response)
    ])
    if (!r.ok) { setRows([]); setLoading(false); return }
    setRows(await r.json())
  if (a) { try { const aj = await a.json(); setAjustes({ locale: aj?.locale, currency: aj?.currency }) } catch {} }
    setLoading(false)
  }, [type, from, to, metric, top])
  useEffect(()=>{ load() }, [load])

  const headers = useMemo(()=>{
    if (type==='dia') return ['fecha','pedidos','totalCents']
    if (type==='hora') return ['hora','pedidos','totalCents']
  if (type==='categoria') return ['categoria','cantidad','totalCents','costoCents','margenCents']
  return ['producto','cantidad','totalCents','costoCents','margenCents']
  }, [type])

  return (
    <AdminLayout title="Reportes">
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2 glass-panel p-3 rounded-lg">
        <div className="flex gap-1 p-1 rounded-lg bg-white/50 border">
          <button className={`btn text-xs ${type==='dia'?'btn-primary':''}`} onClick={()=>setType('dia')}>Por día</button>
          <button className={`btn text-xs ${type==='hora'?'btn-primary':''}`} onClick={()=>setType('hora')}>Por hora</button>
          <button className={`btn text-xs ${type==='categoria'?'btn-primary':''}`} onClick={()=>setType('categoria')}>Por categoría</button>
          <button className={`btn text-xs ${type==='producto'?'btn-primary':''}`} onClick={()=>setType('producto')}>Por producto</button>
        </div>
        {(type==='categoria' || type==='producto') && (
          <>
            <label className="grid text-sm">
              Métrica
              <select className="input" value={metric} onChange={e=>setMetric(e.target.value as 'total'|'cantidad'|'margen')}>
                <option value="total">Total</option>
                <option value="cantidad">Cantidad</option>
                <option value="margen">Margen</option>
              </select>
            </label>
            <label className="grid text-sm">
              Top N
              <input className="input" placeholder="ej. 10" value={top} onChange={e=>setTop(e.target.value)} />
            </label>
          </>
        )}
        <label className="grid text-sm">
          Desde
          <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="input" />
        </label>
        <label className="grid text-sm">
          Hasta
          <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="input" />
        </label>
        <button className="btn" onClick={load}>Aplicar</button>
  <a className="ml-auto btn" href={`/api/reportes?type=${type}${from?`&from=${encodeURIComponent(from)}`:''}${to?`&to=${encodeURIComponent(to)}`:''}${(type==='categoria'||type==='producto')?`&metric=${metric}${top?`&top=${encodeURIComponent(top)}`:''}`:''}&format=csv`} target="_blank">Exportar CSV</a>
      </div>
      <div className="glass-panel rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {headers.map(h=> (<th key={h} className="text-left p-2 capitalize">{h.replace('totalCents','total')}</th>))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-3" colSpan={headers.length}>Cargando…</td></tr> : rows.length===0 ? (
              <tr><td className="p-3" colSpan={headers.length}>Sin resultados</td></tr>
            ) : rows.map((r,i)=> (
              <tr key={i} className="border-t">
                {headers.map(h=> (
                  <td key={h} className="p-2">
                    {h==='totalCents' ? toCurrency(Number(r[h]||0), ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY) : String(r[h] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  </div>
  </AdminLayout>
  )
}
