'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface EmpleadoData {
  id?: number; codigo?: string; nombre?: string; apellido?: string; cedula?: string
  cargo?: string; departamento?: string; salarioBaseCents?: number; activo?: boolean
  fechaIngreso?: string; tipoContrato?: string; telefono?: string; email?: string
  banco?: string; cuentaBanco?: string; nss?: string; afpId?: string; sexo?: string
  direccion?: string; fechaNacimiento?: string; tipoSalario?: string
}

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

const STEPS = ['Personal', 'Laboral', 'Compensación', 'Seguridad Social']
const DEPARTAMENTOS = ['Cocina', 'Servicio', 'Admin', 'Operaciones', 'Limpieza', 'Delivery']
const CARGOS = ['Cocinero/a', 'Ayudante de Cocina', 'Cajero/a', 'Mesero/a', 'Barman', 'Delivery', 'Administrador/a', 'Limpieza', 'Supervisor/a']
const BANCOS = ['Popular', 'Reservas', 'BHD', 'Scotiabank', 'Santa Cruz', 'Promerica', 'Banesco', 'López de Haro', 'Caribe', 'Otro']

export default function EmpleadoForm({ empleado, onClose, salarioMinimo }: {
  empleado: EmpleadoData | null; onClose: () => void; salarioMinimo: number
}) {
  const isEdit = !!empleado?.id
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fechaIngresoVal = empleado?.fechaIngreso ? new Date(empleado.fechaIngreso).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  const fechaNacVal = empleado?.fechaNacimiento ? new Date(empleado.fechaNacimiento).toISOString().split('T')[0] : ''
  const [form, setForm] = useState<EmpleadoData>({
    nombre: '', apellido: '', cedula: '', cargo: '', departamento: 'Operaciones',
    tipoContrato: 'INDEFINIDO', salarioBaseCents: 0, tipoSalario: 'QUINCENAL',
    sexo: '', telefono: '', email: '', direccion: '', banco: '', cuentaBanco: '',
    nss: '', afpId: '',
    ...empleado,
    fechaIngreso: fechaIngresoVal,
    fechaNacimiento: fechaNacVal,
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))
  const salarioRD = (form.salarioBaseCents || 0) / 100

  const handleSave = async () => {
    setError('')
    if (!form.nombre || !form.apellido || !form.cedula || !form.cargo || !form.salarioBaseCents) {
      setError('Completa los campos obligatorios: nombre, apellido, cédula, cargo y salario')
      return
    }
    setSaving(true)
    try {
      const url = isEdit ? `/api/nomina/empleados/${empleado!.id}` : '/api/nomina/empleados'
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al guardar'); return }
      onClose()
    } finally { setSaving(false) }
  }

  const inputCls = "input w-full"
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isEdit ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{STEPS[step]} — Paso {step + 1} de {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="btn text-xs px-2 py-1">✕</button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100">
          <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatedStep step={step} currentStep={0}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Nombre *</label><input className={inputCls} value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} placeholder="Juan" /></div>
              <div><label className={labelCls}>Apellido *</label><input className={inputCls} value={form.apellido || ''} onChange={e => set('apellido', e.target.value)} placeholder="Pérez" /></div>
              <div><label className={labelCls}>Cédula *</label><input className={inputCls} value={form.cedula || ''} onChange={e => set('cedula', e.target.value)} placeholder="001-0000000-0" /></div>
              <div><label className={labelCls}>Sexo</label>
                <select className={inputCls} value={form.sexo || ''} onChange={e => set('sexo', e.target.value)}>
                  <option value="">—</option><option value="M">Masculino</option><option value="F">Femenino</option>
                </select>
              </div>
              <div><label className={labelCls}>Fecha Nacimiento</label><input type="date" className={inputCls} value={form.fechaNacimiento || ''} onChange={e => set('fechaNacimiento', e.target.value)} /></div>
              <div><label className={labelCls}>Teléfono</label><input className={inputCls} value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} placeholder="809-000-0000" /></div>
              <div className="col-span-2"><label className={labelCls}>Email</label><input type="email" className={inputCls} value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
              <div className="col-span-2"><label className={labelCls}>Dirección</label><input className={inputCls} value={form.direccion || ''} onChange={e => set('direccion', e.target.value)} /></div>
            </div>
          </AnimatedStep>

          <AnimatedStep step={step} currentStep={1}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Cargo *</label>
                <select className={inputCls} value={form.cargo || ''} onChange={e => set('cargo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Departamento</label>
                <select className={inputCls} value={form.departamento || ''} onChange={e => set('departamento', e.target.value)}>
                  {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Tipo de Contrato</label>
                <select className={inputCls} value={form.tipoContrato || ''} onChange={e => set('tipoContrato', e.target.value)}>
                  <option value="INDEFINIDO">📋 Indefinido</option>
                  <option value="TEMPORAL">⏳ Temporal</option>
                  <option value="PRUEBA">🔍 Periodo de Prueba</option>
                </select>
              </div>
              <div><label className={labelCls}>Fecha de Ingreso *</label>
                <input type="date" className={inputCls} value={form.fechaIngreso || ''} onChange={e => set('fechaIngreso', e.target.value)} />
              </div>
            </div>
          </AnimatedStep>

          <AnimatedStep step={step} currentStep={2}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Salario Mensual (RD$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">RD$</span>
                  <input type="number" className={`${inputCls} pl-12 text-lg font-bold`}
                    value={salarioRD || ''} min={0} step={100}
                    onChange={e => set('salarioBaseCents', Math.round(Number(e.target.value) * 100))} />
                </div>
                {salarioMinimo > 0 && (form.salarioBaseCents || 0) < salarioMinimo && (form.salarioBaseCents || 0) > 0 && (
                  <p className="text-xs text-red-500 mt-1">⚠️ Por debajo del salario mínimo ({formatRD(salarioMinimo)})</p>
                )}
                {form.salarioBaseCents ? (
                  <p className="text-xs text-slate-400 mt-1">Quincenal: {formatRD(Math.round(form.salarioBaseCents / 2))}</p>
                ) : null}
              </div>
              <div><label className={labelCls}>Banco</label>
                <select className={inputCls} value={form.banco || ''} onChange={e => set('banco', e.target.value)}>
                  <option value="">—</option>
                  {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Cuenta Bancaria</label>
                <input className={inputCls} value={form.cuentaBanco || ''} onChange={e => set('cuentaBanco', e.target.value)} />
              </div>
            </div>
          </AnimatedStep>

          <AnimatedStep step={step} currentStep={3}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>NSS (Seguridad Social)</label>
                <input className={inputCls} value={form.nss || ''} onChange={e => set('nss', e.target.value)} placeholder="Número de seguridad social" />
              </div>
              <div><label className={labelCls}>ID AFP</label>
                <input className={inputCls} value={form.afpId || ''} onChange={e => set('afpId', e.target.value)} placeholder="Identificador AFP" />
              </div>
            </div>
            {/* Summary */}
            {form.nombre && form.salarioBaseCents ? (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <h4 className="text-sm font-bold text-emerald-800 mb-2">📋 Resumen</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-600">Empleado:</span><span className="font-semibold">{form.nombre} {form.apellido}</span>
                  <span className="text-slate-600">Cargo:</span><span className="font-semibold">{form.cargo}</span>
                  <span className="text-slate-600">Salario mensual:</span><span className="font-semibold text-emerald-700">{formatRD(form.salarioBaseCents)}</span>
                  <span className="text-slate-600">Salario quincenal:</span><span className="font-semibold">{formatRD(Math.round(form.salarioBaseCents / 2))}</span>
                  <span className="text-slate-600">TSS estimado:</span><span className="font-semibold text-amber-700">-{formatRD(Math.round(form.salarioBaseCents * 5.91 / 100))}/mes</span>
                </div>
              </div>
            ) : null}
          </AnimatedStep>

          {error && <p className="text-sm text-red-600 mt-3 bg-red-50 px-3 py-2 rounded-lg">⚠️ {error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="btn text-sm">{step === 0 ? 'Cancelar' : '← Anterior'}</button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary text-sm">Siguiente →</button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
              {saving ? '⏳ Guardando...' : isEdit ? '💾 Actualizar' : '✅ Crear Empleado'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function AnimatedStep({ step, currentStep, children }: { step: number; currentStep: number; children: React.ReactNode }) {
  if (step !== currentStep) return null
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  )
}
