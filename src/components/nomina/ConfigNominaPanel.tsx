'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

interface Config {
  sfsPct: number; afpPct: number; sfsPatronalPct: number; afpPatronalPct: number
  srlPct: number; infotepPct: number; topeSfsCents: number; topeAfpCents: number
  topeSrlCents: number; isrExentoCents: number; isrTramo1LimiteCents: number
  isrTramo2LimiteCents: number; isrTramo1Pct: number; isrTramo2Pct: number
  isrTramo3Pct: number; isrTramo1FijoCents: number; isrTramo2FijoCents: number
  recargoExtraDiurna: number; recargoExtraNocturna: number; recargoFeriado: number
  horasSemanales: number; horasDiarias: number
}

export default function ConfigNominaPanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/nomina/config').then(r => r.json()).then(setConfig)
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSaved(false)
    await fetch('/api/nomina/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!config) return <div className="card p-8 text-center text-slate-400">Cargando configuración...</div>

  const set = (key: keyof Config, value: number) => setConfig(c => c ? { ...c, [key]: value } : c)

  const InputField = ({ label, field, suffix, isCents }: { label: string; field: keyof Config; suffix?: string; isCents?: boolean }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <input type="number" step={isCents ? 100 : 0.01}
          className="input w-full text-sm pr-10"
          value={isCents ? (config[field] as number) / 100 : config[field]}
          onChange={e => set(field, isCents ? Math.round(Number(e.target.value) * 100) : Number(e.target.value))} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-2xl shadow-lg">⚙️</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Configuración de Nómina</h3>
          <p className="text-sm text-slate-500 mt-1">Tasas, topes y parámetros fiscales vigentes (RD 2026)</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* TSS Empleado */}
        <Section title="👤 Retenciones TSS (Empleado)">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InputField label="SFS" field="sfsPct" suffix="%" />
            <InputField label="AFP" field="afpPct" suffix="%" />
            <div className="flex items-end pb-1">
              <span className="text-sm text-slate-500">Total: <strong>{(config.sfsPct + config.afpPct).toFixed(2)}%</strong></span>
            </div>
          </div>
        </Section>

        {/* TSS Patronal */}
        <Section title="🏛️ Aportes Patronales">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InputField label="SFS Patronal" field="sfsPatronalPct" suffix="%" />
            <InputField label="AFP Patronal" field="afpPatronalPct" suffix="%" />
            <InputField label="SRL" field="srlPct" suffix="%" />
            <InputField label="INFOTEP" field="infotepPct" suffix="%" />
          </div>
        </Section>

        {/* Topes */}
        <Section title="📊 Topes de Cotización">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Tope SFS" field="topeSfsCents" suffix="RD$" isCents />
            <InputField label="Tope AFP" field="topeAfpCents" suffix="RD$" isCents />
            <InputField label="Tope SRL" field="topeSrlCents" suffix="RD$" isCents />
          </div>
        </Section>

        {/* ISR */}
        <Section title="📋 ISR - Escala Progresiva (Anual)">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InputField label="Exento hasta" field="isrExentoCents" suffix="RD$" isCents />
            <InputField label="Tramo 1 hasta" field="isrTramo1LimiteCents" suffix="RD$" isCents />
            <InputField label="Tramo 2 hasta" field="isrTramo2LimiteCents" suffix="RD$" isCents />
            <InputField label="Tasa Tramo 1" field="isrTramo1Pct" suffix="%" />
            <InputField label="Tasa Tramo 2" field="isrTramo2Pct" suffix="%" />
            <InputField label="Tasa Tramo 3" field="isrTramo3Pct" suffix="%" />
          </div>
        </Section>

        {/* Horas extras */}
        <Section title="⏰ Horas Extras">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InputField label="Recargo Diurna" field="recargoExtraDiurna" suffix="%" />
            <InputField label="Recargo Nocturna" field="recargoExtraNocturna" suffix="%" />
            <InputField label="Recargo Feriado" field="recargoFeriado" suffix="%" />
          </div>
        </Section>

        {/* Jornada */}
        <Section title="🕐 Jornada Laboral">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Horas Semanales" field="horasSemanales" suffix="hrs" />
            <InputField label="Horas Diarias" field="horasDiarias" suffix="hrs" />
          </div>
        </Section>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
        </button>
        {saved && (
          <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="text-sm text-emerald-600 font-medium">✅ Guardado</motion.span>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">{title}</h4>
      {children}
    </div>
  )
}
