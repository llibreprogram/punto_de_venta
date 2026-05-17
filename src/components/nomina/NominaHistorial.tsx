'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

const ESTADO_STYLES: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-600',
  CALCULADA: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-blue-100 text-blue-700',
  PAGADA: 'bg-emerald-100 text-emerald-700',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function NominaHistorial({ onViewVolante }: { onViewVolante: (n: any) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nominas, setNominas] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [totals, setTotals] = useState<any>(null)
  const [periodoFilter, setPeriodoFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (periodoFilter) params.set('periodo', periodoFilter)
    fetch(`/api/nomina/nominas?${params}`)
      .then(r => r.json())
      .then(data => { setNominas(data.nominas || []); setTotals(data.totals) })
      .finally(() => setLoading(false))
  }, [periodoFilter])

  const periodos = [...new Set(nominas.map(n => n.periodo))].sort().reverse()

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">📋 Historial de Nóminas</h3>
        <div className="flex gap-2">
          <select className="input text-sm" value={periodoFilter} onChange={e => setPeriodoFilter(e.target.value)}>
            <option value="">Todos los periodos</option>
            {periodos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-4 gap-0 border-b border-slate-100">
          {[
            { label: 'Total Bruto', val: totals.totalDevengado, color: 'text-blue-700' },
            { label: 'Deducciones', val: totals.totalDeducciones, color: 'text-red-600' },
            { label: 'Total Neto', val: totals.totalNeto, color: 'text-emerald-700' },
            { label: 'Costo Patronal', val: totals.totalPatronal, color: 'text-purple-700' },
          ].map(t => (
            <div key={t.label} className="p-3 text-center border-r border-slate-50 last:border-0">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">{t.label}</div>
              <div className={`text-sm font-extrabold ${t.color}`}>{formatRD(t.val)}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-8"><div className="animate-shimmer h-8 rounded-lg mb-3" /><div className="animate-shimmer h-8 rounded-lg" /></div>
      ) : nominas.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-500 font-medium">No hay nóminas procesadas</p>
          <p className="text-sm text-slate-400 mt-1">Procesa tu primera nómina en la pestaña &quot;Procesar Nómina&quot;</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase">
                <th className="px-4 py-2.5 text-left">Periodo</th>
                <th className="px-4 py-2.5 text-left">Empleado</th>
                <th className="px-4 py-2.5 text-left">Estado</th>
                <th className="px-4 py-2.5 text-right">Bruto</th>
                <th className="px-4 py-2.5 text-right">TSS</th>
                <th className="px-4 py-2.5 text-right">ISR</th>
                <th className="px-4 py-2.5 text-right font-bold">Neto</th>
                <th className="px-4 py-2.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {nominas.map((n, i) => (
                <motion.tr key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{n.periodo}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{n.empleado?.nombre} {n.empleado?.apellido}</div>
                    <div className="text-xs text-slate-400">{n.empleado?.cargo}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ESTADO_STYLES[n.estado] || ''}`}>
                      {n.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatRD(n.totalDevengadoCents)}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">-{formatRD(n.sfsCents + n.afpCents)}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{n.isrCents > 0 ? `-${formatRD(n.isrCents)}` : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{formatRD(n.salarioNetoCents)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => onViewVolante(n)} className="btn text-xs px-2 py-1" title="Ver volante">📄</button>
                      <a href={`/admin/nomina/volante/${n.id}`} target="_blank" rel="noopener noreferrer" className="btn text-xs px-2 py-1" title="Imprimir">🖨️</a>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
