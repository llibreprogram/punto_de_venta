'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generarPeriodoQuincenal } from '@/lib/payroll-engine'

interface Empleado {
  id: number; codigo: string; nombre: string; apellido: string; salarioBaseCents: number; cargo: string; departamento: string
}

interface PropinaDistribucion {
  empleadoId: number
  nombre: string
  categoria: string
  porcentajeCategoria: number
  montoCents: number
}

interface PropinaData {
  totalPropinaCents: number
  totalPedidos: number
  configuracionDistribucion: Record<string, number>
  distribucionEmpleados: PropinaDistribucion[]
  empleadosExcluidos: { id: number; nombre: string; cargo: string; razon: string }[]
}

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

type ProcessStep = 'config' | 'propinas' | 'processing' | 'results'

export default function NominaProcessor({ empleados, onComplete }: {
  empleados: Empleado[]; onComplete: () => void
}) {
  const [processStep, setProcessStep] = useState<ProcessStep>('config')
  const [periodo, setPeriodo] = useState(generarPeriodoQuincenal(new Date()))
  const [progress, setProgress] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')
  const [propinaData, setPropinaData] = useState<PropinaData | null>(null)
  const [loadingPropinas, setLoadingPropinas] = useState(false)
  const [incluirPropinas, setIncluirPropinas] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const loadPropinas = async () => {
    setLoadingPropinas(true)
    setError('')
    try {
      const res = await fetch(`/api/nomina/propinas?periodo=${periodo}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error cargando propinas')
      setPropinaData(data)
      setProcessStep('propinas')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoadingPropinas(false)
    }
  }

  const handleProcess = async () => {
    setProcessStep('processing')
    setError('')
    setProgress(0)

    // Animate progress
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 3, 90))
    }, 100)

    try {
      // Build propinas distribution map
      const propinasDistribuidas: Record<number, number> = {}
      if (incluirPropinas && propinaData) {
        for (const d of propinaData.distribucionEmpleados) {
          propinasDistribuidas[d.empleadoId] = d.montoCents
        }
      }

      const res = await fetch('/api/nomina/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo, propinasDistribuidas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')
      clearInterval(interval)
      setProgress(100)
      setResults(data)
      setTimeout(() => setProcessStep('results'), 500)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setProcessStep('config')
    }
  }

  const handleAprobar = async (estado: string) => {
    await fetch(`/api/nomina/periodos/${periodo}/aprobar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    onComplete()
    setProcessStep('config')
    setResults(null)
    setPropinaData(null)
  }

  // Parse period for display
  const [y, m, q] = periodo.split('-')
  const periodoLabel = `${q === 'Q1' ? '1ra' : '2da'} Quincena — ${mounted ? new Date(Number(y), Number(m) - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }) : ''}`

  return (
    <div className="card p-6">
      {processStep === 'config' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg">⚡</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Procesar Nómina Quincenal</h3>
              <p className="text-sm text-slate-500 mt-1">Calcula automáticamente TSS, ISR, aportes patronales y propinas para todos los empleados activos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Periodo</label>
              <select className="input w-full" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                {generatePeriodoOptions().map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">📅 {periodoLabel}</p>
            </div>
            <div className="flex flex-col justify-end">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="text-xs text-blue-600 font-medium">Empleados a procesar</div>
                <div className="text-2xl font-extrabold text-blue-800">{empleados.length}</div>
              </div>
            </div>
          </div>

          {/* Propinas Toggle */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Propina Legal 10% (Art. 228 CT)</h4>
                  <p className="text-xs text-amber-700 mt-0.5">Calcular y distribuir propinas recaudadas del periodo</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={incluirPropinas} onChange={e => setIncluirPropinas(e.target.checked)}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">Vista previa</div>
            <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
              {empleados.map(emp => (
                <div key={emp.id} className="px-4 py-2 flex justify-between items-center text-sm">
                  <span className="text-slate-700">{emp.nombre} {emp.apellido} <span className="text-slate-400">— {emp.cargo}</span></span>
                  <span className="font-semibold text-slate-600">{formatRD(Math.round(emp.salarioBaseCents / 2))}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">⚠️ {error}</p>}

          <button onClick={incluirPropinas ? loadPropinas : handleProcess}
            disabled={empleados.length === 0 || loadingPropinas}
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
            {loadingPropinas ? '⏳ Calculando propinas...' : incluirPropinas ? '🍽️ Calcular Propinas y Nómina' : '⚡ Calcular Nómina'}
            {!loadingPropinas && ` (${empleados.length} empleados)`}
          </button>
        </motion.div>
      )}

      {/* Propinas Step */}
      {processStep === 'propinas' && propinaData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-2xl shadow-lg">🍽️</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Distribución de Propinas — {periodoLabel}</h3>
              <p className="text-sm text-slate-500 mt-1">
                Propinas recaudadas de <strong>{propinaData.totalPedidos}</strong> pedidos. Distribución según Art. 228 del Código de Trabajo.
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-bold text-amber-800">Total Propinas Recaudadas</span>
                <p className="text-xs text-amber-600 mt-0.5">{propinaData.totalPedidos} pedidos en el periodo</p>
              </div>
              <span className="text-2xl font-extrabold text-amber-900">{formatRD(propinaData.totalPropinaCents)}</span>
            </div>
          </div>

          {/* Distribution by category */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Object.entries(propinaData.configuracionDistribucion).map(([cat, pct]) => {
              const montoCat = Math.round(propinaData.totalPropinaCents * (pct as number) / 100)
              const empsEnCat = propinaData.distribucionEmpleados.filter(d => d.categoria === cat)
              return (
                <div key={cat} className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">{cat}</div>
                  <div className="text-lg font-extrabold text-slate-800">{pct}%</div>
                  <div className="text-sm font-semibold text-amber-700">{formatRD(montoCat)}</div>
                  <div className="text-xs text-slate-400">{empsEnCat.length} empleado(s)</div>
                </div>
              )
            })}
          </div>

          {/* Per-employee distribution */}
          <div className="rounded-xl border border-slate-100 overflow-hidden mb-6">
            <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
              Asignación por Empleado
            </div>
            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {propinaData.distribucionEmpleados.map(d => (
                <div key={d.empleadoId} className="px-4 py-2 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-slate-700 font-medium">{d.nombre}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">{d.categoria}</span>
                  </div>
                  <span className="font-bold text-amber-800">{formatRD(d.montoCents)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Excluded employees */}
          {propinaData.empleadosExcluidos.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden mb-6">
              <div className="px-4 py-2 bg-red-50 text-xs font-semibold text-red-600 uppercase">
                ⚠️ Empleados Excluidos (Art. 228 CT)
              </div>
              <div className="divide-y divide-slate-50">
                {propinaData.empleadosExcluidos.map(e => (
                  <div key={e.id} className="px-4 py-2 flex justify-between items-center text-sm">
                    <span className="text-slate-500">{e.nombre} — {e.cargo}</span>
                    <span className="text-xs text-red-500">{e.razon}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal note */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 mb-6">
            <strong>📋 Nota Legal:</strong> La propina del 10% no constituye salario (Art. 197 CT). 
            No cotiza TSS (SFS/AFP), no genera ISR, y no se incluye en el cálculo de prestaciones laborales.
            El empleador actúa solo como recaudador.
          </div>

          <div className="flex gap-3">
            <button onClick={handleProcess} className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-base">
              ⚡ Procesar Nómina con Propinas
            </button>
            <button onClick={() => { setProcessStep('config'); setPropinaData(null) }} className="btn px-4">
              ← Volver
            </button>
          </div>
        </motion.div>
      )}

      {processStep === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <motion.span className="text-3xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>⚙️</motion.span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Procesando Nómina...</h3>
          <p className="text-sm text-slate-500 mb-6">Calculando TSS, ISR, aportes patronales{incluirPropinas ? ' y propinas' : ''}</p>
          <div className="w-full max-w-xs mx-auto h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">{Math.round(progress)}%</p>
        </motion.div>
      )}

      {processStep === 'results' && results && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">✅</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Nómina Calculada</h3>
              <p className="text-sm text-slate-500">{periodoLabel} — {results.total} empleados</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {(() => {
              const totals = results.resultados.reduce((acc: { bruto: number; neto: number; patronal: number; propinas: number }, r: { nomina: { totalDevengadoSalarialCents: number; salarioNetoCents: number; totalPatronalCents: number; propinaCents: number } }) => ({
                bruto: acc.bruto + r.nomina.totalDevengadoSalarialCents,
                neto: acc.neto + r.nomina.salarioNetoCents,
                patronal: acc.patronal + r.nomina.totalPatronalCents,
                propinas: acc.propinas + (r.nomina.propinaCents || 0),
              }), { bruto: 0, neto: 0, patronal: 0, propinas: 0 })
              return (
                <>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <div className="text-xs text-blue-500 font-medium">Total Bruto</div>
                    <div className="text-lg font-extrabold text-blue-800">{formatRD(totals.bruto)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <div className="text-xs text-emerald-500 font-medium">Total Neto</div>
                    <div className="text-lg font-extrabold text-emerald-800">{formatRD(totals.neto)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                    <div className="text-xs text-amber-500 font-medium">🍽️ Propinas</div>
                    <div className="text-lg font-extrabold text-amber-800">{formatRD(totals.propinas)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center">
                    <div className="text-xs text-purple-500 font-medium">Costo Patronal</div>
                    <div className="text-lg font-extrabold text-purple-800">{formatRD(totals.patronal)}</div>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Detail Table */}
          <div className="rounded-xl border border-slate-100 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-3 py-2 text-left">Empleado</th>
                  <th className="px-3 py-2 text-right">Bruto</th>
                  <th className="px-3 py-2 text-right">TSS</th>
                  <th className="px-3 py-2 text-right">ISR</th>
                  <th className="px-3 py-2 text-right">🍽️ Propina</th>
                  <th className="px-3 py-2 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.resultados.map((r: { empleado: { id: number; nombre: string; apellido: string }; nomina: { totalDevengadoSalarialCents: number; sfsCents: number; afpCents: number; isrCents: number; salarioNetoCents: number; propinaCents: number; totalRecibirCents: number } }) => (
                  <tr key={r.empleado.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium">{r.empleado.nombre} {r.empleado.apellido}</td>
                    <td className="px-3 py-2 text-right">{formatRD(r.nomina.totalDevengadoSalarialCents)}</td>
                    <td className="px-3 py-2 text-right text-red-500">-{formatRD(r.nomina.sfsCents + r.nomina.afpCents)}</td>
                    <td className="px-3 py-2 text-right text-red-500">{r.nomina.isrCents > 0 ? `-${formatRD(r.nomina.isrCents)}` : '—'}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{r.nomina.propinaCents > 0 ? formatRD(r.nomina.propinaCents) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatRD(r.nomina.totalRecibirCents || r.nomina.salarioNetoCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleAprobar('APROBADA')} className="btn flex-1 text-sm bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
              ✅ Aprobar
            </button>
            <button onClick={() => handleAprobar('PAGADA')} className="btn btn-primary flex-1 text-sm">
              💵 Marcar como Pagada
            </button>
            <button onClick={() => { setProcessStep('config'); setResults(null); setPropinaData(null) }} className="btn text-sm">
              Volver
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function generatePeriodoOptions() {
  const options = []
  const now = new Date()
  for (let i = -2; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const monthName = d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
    options.push({ value: `${y}-${m}-Q1`, label: `1ra Quincena — ${monthName}` })
    options.push({ value: `${y}-${m}-Q2`, label: `2da Quincena — ${monthName}` })
  }
  return options
}
