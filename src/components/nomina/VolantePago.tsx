'use client'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function VolantePago({ nomina, onClose }: { nomina: any; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const emp = nomina.empleado || {}
  const [y, m, q] = (nomina.periodo || '').split('-')
  const periodoLabel = `${q === 'Q1' ? '1ra' : '2da'} Quincena — ${mounted ? new Date(Number(y), Number(m) - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }) : ''}`

  const hasPropina = (nomina.propinaCents || 0) > 0
  const totalRecibir = nomina.totalRecibirCents || (nomina.salarioNetoCents + (nomina.propinaCents || 0))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" id="volante-pago">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold">📄 Volante de Pago</h2>
              <p className="text-sm text-slate-300 mt-1">{periodoLabel}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400">Empleado:</span><br /><strong>{emp.nombre} {emp.apellido}</strong></div>
            <div><span className="text-slate-400">Cargo:</span><br /><strong>{emp.cargo}</strong></div>
            <div><span className="text-slate-400">Código:</span><br /><strong>{emp.codigo}</strong></div>
            <div><span className="text-slate-400">Cédula:</span><br /><strong>{emp.cedula}</strong></div>
          </div>
        </div>

        <div className="p-6 grid gap-5">
          {/* Ingresos Salariales */}
          <Section title="💰 Ingresos Salariales" color="emerald">
            <Row label="Salario Base (Quincenal)" value={nomina.salarioBaseCents} />
            {nomina.horasExtrasCents > 0 && <Row label="Horas Extras" value={nomina.horasExtrasCents} />}
            {nomina.comisionesCents > 0 && <Row label="Comisiones" value={nomina.comisionesCents} />}
            {nomina.bonosCents > 0 && <Row label="Bonos" value={nomina.bonosCents} />}
            {nomina.otrosIngresosCents > 0 && <Row label="Otros Ingresos" value={nomina.otrosIngresosCents} />}
            <TotalRow label="Total Devengado Salarial" value={nomina.totalDevengadoSalarialCents || nomina.totalDevengadoCents} color="text-emerald-700" />
          </Section>

          {/* Deducciones */}
          <Section title="📉 Deducciones" color="red">
            <Row label="SFS (Seguro Salud)" value={-nomina.sfsCents} negative />
            <Row label="AFP (Pensión)" value={-nomina.afpCents} negative />
            {nomina.isrCents > 0 && <Row label="ISR (Impuesto)" value={-nomina.isrCents} negative />}
            {nomina.adelantoCents > 0 && <Row label="Adelanto" value={-nomina.adelantoCents} negative />}
            {nomina.otrasDeduccionesCents > 0 && <Row label="Otras Deducciones" value={-nomina.otrasDeduccionesCents} negative />}
            <TotalRow label="Total Deducciones" value={-nomina.totalDeduccionesCents} color="text-red-600" />
          </Section>

          {/* Salario Neto */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-emerald-800">💵 SALARIO NETO</span>
              <span className="text-2xl font-extrabold text-emerald-700">{formatRD(nomina.salarioNetoCents)}</span>
            </div>
          </div>

          {/* Propina Legal - Sección Separada */}
          {hasPropina && (
            <div className="rounded-xl border-2 border-amber-300 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-amber-100 to-yellow-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🍽️</span>
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Propina Legal (Art. 228 CT)</h3>
                </div>
                <p className="text-xs text-amber-700">
                  Distribución del 10% obligatorio. No constituye salario (Art. 197 CT).
                </p>
              </div>
              <div className="px-4 py-3 bg-amber-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-800 font-medium">Propina asignada del periodo</span>
                  <span className="text-lg font-extrabold text-amber-800">{formatRD(nomina.propinaCents)}</span>
                </div>
                <p className="text-xs text-amber-600 mt-2 italic">
                  No cotiza TSS • No genera ISR • No se incluye en prestaciones laborales
                </p>
              </div>
            </div>
          )}

          {/* Total a Recibir */}
          {hasPropina && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-base font-bold">✨ TOTAL A RECIBIR</span>
                  <p className="text-xs text-blue-200 mt-0.5">Salario Neto + Propina</p>
                </div>
                <span className="text-2xl font-extrabold">{formatRD(totalRecibir)}</span>
              </div>
            </div>
          )}

          {/* Aportes Patronales */}
          <Section title="🏛️ Aportes Patronales (Información)" color="purple">
            <Row label="SFS Patronal" value={nomina.sfsPatronalCents} />
            <Row label="AFP Patronal" value={nomina.afpPatronalCents} />
            <Row label="SRL (Riesgos Laborales)" value={nomina.srlCents} />
            <Row label="INFOTEP" value={nomina.infotepCents} />
            <TotalRow label="Total Costo Patronal" value={nomina.totalPatronalCents} color="text-purple-700" />
          </Section>

          {/* Actions */}
          <div className="flex gap-2">
            <a href={`/admin/nomina/volante/${nomina.id}`} target="_blank" rel="noopener noreferrer"
              className="btn btn-primary flex-1 flex items-center justify-center gap-2">
              🖨️ Abrir para Imprimir
            </a>
            <button onClick={onClose} className="btn flex items-center justify-center gap-2 px-4">
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-${color}-100 overflow-hidden`}>
      <div className={`px-4 py-2 bg-${color}-50 text-xs font-bold text-${color}-700 uppercase tracking-wide`}>{title}</div>
      <div className="px-4 py-2 divide-y divide-slate-50">{children}</div>
    </div>
  )
}

function Row({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium ${negative ? 'text-red-500' : 'text-slate-800'}`}>{formatRD(Math.abs(value))}</span>
    </div>
  )
}

function TotalRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex justify-between py-2 text-sm font-bold border-t border-slate-100 mt-1 pt-2">
      <span className={color}>{label}</span>
      <span className={color}>{value < 0 ? '-' : ''}{formatRD(Math.abs(value))}</span>
    </div>
  )
}
