'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { calcularPrestaciones, formatRD } from '@/lib/payroll-engine'

interface Empleado {
  id: number; nombre: string; apellido: string; salarioBaseCents: number; cargo: string; fechaIngreso: string
}

const TIPO_TERMINACION_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  DESAHUCIO: { label: 'Desahucio', icon: '🔴', desc: 'El empleador termina sin causa justificada' },
  DESPIDO: { label: 'Despido', icon: '⚠️', desc: 'El empleador termina con causa justificada' },
  RENUNCIA: { label: 'Renuncia', icon: '🚶', desc: 'El empleado renuncia voluntariamente' },
  MUTUO_ACUERDO: { label: 'Mutuo Acuerdo', icon: '🤝', desc: 'Ambas partes acuerdan la terminación' },
}

export default function PrestacionesCalc({ empleados }: { empleados: Empleado[] }) {
  const [empleadoId, setEmpleadoId] = useState<number>(0)
  const [tipoTerminacion, setTipoTerminacion] = useState<'DESAHUCIO' | 'DESPIDO' | 'RENUNCIA' | 'MUTUO_ACUERDO'>('DESAHUCIO')
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split('T')[0])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultado, setResultado] = useState<any>(null)

  const selectedEmp = empleados.find(e => e.id === empleadoId)

  const handleCalcular = () => {
    if (!selectedEmp) return
    const result = calcularPrestaciones(
      selectedEmp.salarioBaseCents,
      new Date(selectedEmp.fechaIngreso),
      new Date(fechaSalida),
      tipoTerminacion
    )
    setResultado(result)
  }

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-2xl shadow-lg">🧮</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Calculadora de Prestaciones Laborales</h3>
          <p className="text-sm text-slate-500 mt-1">Simula el cálculo de prestaciones según el Código de Trabajo (Ley 16-92)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Empleado</label>
          <select className="input w-full" value={empleadoId} onChange={e => { setEmpleadoId(Number(e.target.value)); setResultado(null) }}>
            <option value={0}>Seleccionar...</option>
            {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido} — {e.cargo}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tipo de Terminación</label>
          <select className="input w-full" value={tipoTerminacion} onChange={e => { setTipoTerminacion(e.target.value as typeof tipoTerminacion); setResultado(null) }}>
            {Object.entries(TIPO_TERMINACION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">{TIPO_TERMINACION_LABELS[tipoTerminacion].desc}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fecha de Salida</label>
          <input type="date" className="input w-full" value={fechaSalida} onChange={e => { setFechaSalida(e.target.value); setResultado(null) }} />
        </div>
      </div>

      {selectedEmp && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 mb-4 flex flex-wrap gap-4 text-sm">
          <span><strong>Salario:</strong> {formatRD(selectedEmp.salarioBaseCents)}/mes</span>
          <span><strong>Ingreso:</strong> {new Date(selectedEmp.fechaIngreso).toLocaleDateString('es-DO')}</span>
        </div>
      )}

      <button onClick={handleCalcular} disabled={!selectedEmp} className="btn btn-primary w-full mb-6">
        🧮 Calcular Prestaciones
      </button>

      {resultado && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
          {/* Info */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
            Antigüedad: <strong>{resultado.detalles.antiguedadAnios} años, {resultado.detalles.antiguedadMeses % 12} meses</strong>
            &nbsp;· Salario diario: <strong>{formatRD(resultado.detalles.salarioDiarioCents)}</strong>
          </div>

          {/* Breakdown */}
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                <tr className="hover:bg-slate-50"><td className="px-4 py-3">🎄 Regalía Pascual Proporcional</td><td className="px-4 py-3 text-right font-semibold">{formatRD(resultado.regaliaProporcionalCents)}</td></tr>
                <tr className="hover:bg-slate-50"><td className="px-4 py-3">🏖️ Vacaciones ({resultado.detalles.diasVacaciones} días)</td><td className="px-4 py-3 text-right font-semibold">{formatRD(resultado.vacacionesCents)}</td></tr>
                <tr className="hover:bg-slate-50"><td className="px-4 py-3">📢 Preaviso ({resultado.preaviso.dias} días)</td><td className="px-4 py-3 text-right font-semibold">{formatRD(resultado.preaviso.montoCents)}</td></tr>
                <tr className="hover:bg-slate-50"><td className="px-4 py-3">💼 Cesantía ({resultado.cesantia.dias} días)</td><td className="px-4 py-3 text-right font-semibold">{formatRD(resultado.cesantia.montoCents)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-purple-800">💰 TOTAL PRESTACIONES</span>
              <span className="text-2xl font-extrabold text-purple-700">{formatRD(resultado.totalCents)}</span>
            </div>
          </div>

          {tipoTerminacion === 'DESPIDO' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              ⚠️ En caso de despido justificado, solo se pagan derechos adquiridos (vacaciones y regalía proporcional). No aplica cesantía ni preaviso.
            </div>
          )}
          {tipoTerminacion === 'RENUNCIA' && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
              ℹ️ En caso de renuncia, solo se pagan derechos adquiridos. No aplica cesantía.
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
