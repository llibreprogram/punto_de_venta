"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useToast, useConfirm } from '@/components/ui/Providers'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

type Row = { id:number; numero:number; subCuenta?:number; createdAt:string; subtotalCents:number; impuestoCents:number; descuentoCents:number; totalCents:number; mesa?:{nombre:string}|null }

export default function AbiertasPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [ajustes, setAjustes] = useState<{ locale?:string; currency?:string }|null>(null)
  const [error, setError] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [auto, setAuto] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, a] = await Promise.all([
        fetch('/api/pedidos?estado=ABIERTO', { cache:'no-store' }),
        fetch('/api/ajustes').catch(()=>null as unknown as Response)
      ])
      if (!res.ok) {
        const txt = await res.text().catch(()=> '')
        setError('Error cargando órdenes abiertas'+ (txt ? ': '+txt : ''))
        setRows([])
      } else {
        const json = await res.json()
        if (Array.isArray(json)) setRows(json)
        else setRows([])
      }
      try { const aj = a ? await a.json() : null; if (aj) setAjustes({ locale: aj.locale, currency: aj.currency }) } catch {}
    } catch (e) {
      setError('Error de red al cargar')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])
  useEffect(()=>{
    if (!auto) return
    const id = setInterval(()=>{ load() }, 5000)
    return ()=> clearInterval(id)
  }, [auto])
  const fmt = (cents:number)=> toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)
  const { push } = useToast()
  const { confirm } = useConfirm()
  return (
    <AdminLayout title="Órdenes abiertas">
      <div className="p-4 max-w-3xl mx-auto grid gap-3">
      <div className="flex flex-wrap items-center gap-3 glass-panel p-3 rounded-lg">
        <h1 className="text-lg font-semibold">Órdenes abiertas</h1>
        <span className="text-sm text-gray-600">{loading ? 'Cargando…' : `${rows.length} abiertas`}</span>
        {error && <span className="text-sm text-red-600">{error}</span>}
  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} /> Auto</label>
  <button onClick={load} className="border rounded px-3 py-1 text-sm disabled:opacity-50" disabled={loading}>{loading ? '...' : 'Refrescar'}</button>
        <button onClick={async()=>{
          try {
            const res = await fetch('/api/pedidos/merge-duplicados', { method:'POST' })
            const json = await res.json()
            if (json?.ok) {
              push('Fusionadas órdenes duplicadas', 'success')
              load()
            } else {
              push('Sin fusiones disponibles', 'info')
            }
          } catch { push('Error al fusionar', 'error') }
        }} className="btn text-sm">Fusionar duplicados</button>
        <Link href="/pos" className="ml-auto underline">Volver al POS</Link>
      </div>
      <div className="glass-panel rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Mesa</th>
              <th className="text-left p-2">SubCuenta</th>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Total</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={6}>Cargando…</td></tr>
            ) : rows.length===0 ? (
              <tr><td className="p-3" colSpan={6}>{error ? 'Error' : 'No hay abiertas'}</td></tr>
            ) : rows.map(r=> (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.numero}</td>
                <td className="p-2">{r.mesa?.nombre || '—'}</td>
                <td className="p-2">{r.subCuenta || 1}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-2">{fmt(r.totalCents)}</td>
                <td className="p-2">
                  <Link href={`/pos?load=${r.id}`} className="underline">Abrir en POS</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
  </AdminLayout>
  )
}
