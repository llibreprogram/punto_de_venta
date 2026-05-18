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
  propinaDistribucion: string // JSON string
}

interface PropinaDistribucion {
  [key: string]: number
}

export default function ConfigNominaPanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [propinaCategories, setPropinaCategories] = useState<PropinaDistribucion>({})
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    fetch('/api/nomina/config').then(r => r.json()).then(data => {
      setConfig(data)
      // Parse propinaDistribucion
      try {
        const dist = JSON.parse(data.propinaDistribucion || '{}')
        setPropinaCategories(dist)
      } catch {
        setPropinaCategories({ Servicio: 40, Cocina: 35, Barra: 15, Auxiliar: 10 })
      }
    })
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSaved(false)
    
    // Save with propinaDistribucion as JSON string
    const payload = {
      ...config,
      propinaDistribucion: JSON.stringify(propinaCategories),
    }
    
    await fetch('/api/nomina/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!config) return <div className="card p-8 text-center text-slate-400">Cargando configuración...</div>

  const set = (key: keyof Config, value: number) => setConfig(c => c ? { ...c, [key]: value } : c)

  const totalPropinaPct = Object.values(propinaCategories).reduce((a, b) => a + b, 0)
  const propinaValid = Math.abs(totalPropinaPct - 100) < 0.01

  const handlePropinaChange = (cat: string, value: number) => {
    setPropinaCategories(prev => ({ ...prev, [cat]: value }))
  }

  const handleRemoveCategory = (cat: string) => {
    setPropinaCategories(prev => {
      const next = { ...prev }
      delete next[cat]
      return next
    })
  }

  const handleAddCategory = () => {
    if (!newCatName.trim() || propinaCategories[newCatName]) return
    setPropinaCategories(prev => ({ ...prev, [newCatName.trim()]: 0 }))
    setNewCatName('')
  }

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
        {/* Propina Distribution - Featured first */}
        <Section title="🍽️ Distribución de Propinas (Art. 228 CT)">
          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-3">
              Define qué porcentaje del pool de propinas recibe cada departamento. 
              Personal administrativo y gerencial está excluido por ley.
              Los porcentajes deben sumar <strong>100%</strong>.
            </p>
            
            <div className="grid gap-2">
              {Object.entries(propinaCategories).map(([cat, pct]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 w-24">{cat}</span>
                  <div className="relative flex-1">
                    <input type="number" min={0} max={100} step={1}
                      className="input w-full text-sm pr-8"
                      value={pct}
                      onChange={e => handlePropinaChange(cat, Number(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                  <button onClick={() => handleRemoveCategory(cat)}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-1" title="Eliminar">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div className="flex items-center gap-2 mt-3">
              <input type="text" className="input text-sm flex-1" placeholder="Nueva categoría..."
                value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory() }} />
              <button onClick={handleAddCategory} disabled={!newCatName.trim()}
                className="btn text-sm px-3 py-1.5">+ Agregar</button>
            </div>

            {/* Total indicator */}
            <div className={`mt-3 p-2 rounded-lg text-sm font-bold text-center ${
              propinaValid 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              Total: {totalPropinaPct}% {propinaValid ? '✅' : '⚠️ Debe sumar 100%'}
            </div>
          </div>
        </Section>

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
        <button onClick={handleSave} disabled={saving || !propinaValid} className="btn btn-primary">
          {saving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
        </button>
        {saved && (
          <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="text-sm text-emerald-600 font-medium">✅ Guardado</motion.span>
        )}
        {!propinaValid && (
          <span className="text-sm text-red-500 font-medium">⚠️ Los % de propinas deben sumar 100%</span>
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
