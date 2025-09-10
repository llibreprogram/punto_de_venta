"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

type Row = { id:number; numero:number; createdAt:string; subtotalCents:number; impuestoCents:number; descuentoCents:number; totalCents:number; mesa?:{nombre:string}|null }

export default function AbiertasPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [ajustes, setAjustes] = useState<{ locale?:string; currency?:string }|null>(null)
  useEffect(()=>{
    const load = async ()=>{
      const [res, a] = await Promise.all([
        fetch('/api/pedidos?estado=ABIERTO', { cache:'no-store' }),
        fetch('/api/ajustes').catch(()=>null as unknown as Response)
      ])
      const json = await res.json()
      setRows(json)
      try { const aj = a ? await a.json() : null; if (aj) setAjustes({ locale: aj.locale, currency: aj.currency }) } catch {}
    }
    load()
  }, [])
  const fmt = (cents:number)=> toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)
  return (
    <main className="p-4 max-w-3xl mx-auto grid gap-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Órdenes abiertas</h1>
        <Link href="/pos" className="ml-auto underline">Volver al POS</Link>
      </div>
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Mesa</th>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Total</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td className="p-3" colSpan={5}>No hay abiertas</td></tr>
            ) : rows.map(r=> (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.numero}</td>
                <td className="p-2">{r.mesa?.nombre || '—'}</td>
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
    </main>
  )
}
