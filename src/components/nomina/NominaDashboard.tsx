'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KPICard } from '@/components/admin/KPICard'
import EmpleadoTable from './EmpleadoTable'
import EmpleadoForm from './EmpleadoForm'
import NominaProcessor from './NominaProcessor'
import NominaHistorial from './NominaHistorial'
import PrestacionesCalc from './PrestacionesCalc'
import ConfigNominaPanel from './ConfigNominaPanel'
import VolantePago from './VolantePago'
import EmpleadoDetailModal from './EmpleadoDetailModal'

type Tab = 'empleados' | 'procesar' | 'historial' | 'prestaciones' | 'config'

interface EmpleadoData {
  id: number; codigo: string; nombre: string; apellido: string; cedula: string
  cargo: string; departamento: string; salarioBaseCents: number; activo: boolean
  fechaIngreso: string; tipoContrato: string; _count?: { nominas: number }
  telefono?: string; email?: string; banco?: string; cuentaBanco?: string
  nss?: string; afpId?: string; sexo?: string; direccion?: string
  fechaNacimiento?: string; tipoSalario?: string; fechaSalida?: string
}

interface MetaData {
  total: number; totalActivos: number; clasificacion: string; salarioMinimoCents: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface NominaData { id: number; periodo: string; estado: string; empleadoId: number; [key: string]: any }

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'empleados', label: 'Empleados', icon: '👥' },
  { key: 'procesar', label: 'Procesar Nómina', icon: '⚡' },
  { key: 'historial', label: 'Historial', icon: '📋' },
  { key: 'prestaciones', label: 'Prestaciones', icon: '🧮' },
  { key: 'config', label: 'Configuración', icon: '⚙️' },
]

const CLASIFICACION_LABELS: Record<string, string> = {
  MICRO: '🏠 Microempresa (≤10)',
  PEQUENA: '🏪 Pequeña (11-50)',
  MEDIANA: '🏢 Mediana (51-150)',
  GRANDE: '🏭 Grande (151+)',
}

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

export default function NominaDashboard() {
  const [tab, setTab] = useState<Tab>('empleados')
  const [empleados, setEmpleados] = useState<EmpleadoData[]>([])
  const [meta, setMeta] = useState<MetaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEmpleado, setEditingEmpleado] = useState<EmpleadoData | null>(null)
  const [selectedNomina, setSelectedNomina] = useState<NominaData | null>(null)
  const [viewingEmpleadoId, setViewingEmpleadoId] = useState<number | null>(null)

  const loadEmpleados = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/nomina/empleados')
      const data = await res.json()
      setEmpleados(data.empleados || [])
      setMeta(data.meta || null)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadEmpleados() }, [loadEmpleados])

  const totalNominaCents = empleados.filter(e => e.activo).reduce((s, e) => s + Math.round(e.salarioBaseCents / 2), 0)
  const costoPatronalEstimado = Math.round(totalNominaCents * 0.16)

  const handleEdit = (emp: EmpleadoData) => { setEditingEmpleado(emp); setShowForm(true) }
  const handleNew = () => { setEditingEmpleado(null); setShowForm(true) }
  const handleFormClose = () => { setShowForm(false); setEditingEmpleado(null); loadEmpleados() }

  return (
    <div className="grid gap-5">
      {/* Classification Badge */}
      {meta && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
          <span className="text-sm font-semibold text-indigo-700">
            {CLASIFICACION_LABELS[meta.clasificacion] || meta.clasificacion}
          </span>
          <span className="text-xs text-indigo-500">
            Salario mínimo: {formatRD(meta.salarioMinimoCents)}
          </span>
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Nómina Quincenal" value={formatRD(totalNominaCents)} icon={<span className="text-xl">💵</span>} accent="green" />
        <KPICard title="Empleados Activos" value={meta?.totalActivos ?? '—'} icon={<span className="text-xl">👥</span>} accent="blue" />
        <KPICard title="Costo Patronal Est." value={formatRD(costoPatronalEstimado)} icon={<span className="text-xl">🏛️</span>} accent="purple" />
        <KPICard title="Nómina Mensual" value={formatRD(totalNominaCents * 2)} icon={<span className="text-xl">📊</span>} accent="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`chip text-xs ${tab === t.key ? 'chip-active' : ''}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          
          {tab === 'empleados' && (
            <EmpleadoTable empleados={empleados} loading={loading} onEdit={handleEdit}
              onView={(id) => setViewingEmpleadoId(id)}
              onNew={handleNew} onRefresh={loadEmpleados} />
          )}
          {tab === 'procesar' && (
            <NominaProcessor empleados={empleados.filter(e => e.activo)} onComplete={loadEmpleados} />
          )}
          {tab === 'historial' && (
            <NominaHistorial onViewVolante={(n: NominaData) => setSelectedNomina(n)} />
          )}
          {tab === 'prestaciones' && (
            <PrestacionesCalc empleados={empleados.filter(e => e.activo)} />
          )}
          {tab === 'config' && <ConfigNominaPanel />}
        </motion.div>
      </AnimatePresence>

      {/* Employee Form Modal */}
      <AnimatePresence>
        {showForm && (
          <EmpleadoForm empleado={editingEmpleado} onClose={handleFormClose}
            salarioMinimo={meta?.salarioMinimoCents || 0} />
        )}
      </AnimatePresence>

      {/* Volante de Pago Modal */}
      <AnimatePresence>
        {selectedNomina && (
          <VolantePago nomina={selectedNomina} onClose={() => setSelectedNomina(null)} />
        )}
      </AnimatePresence>

      {/* Employee Detail Modal */}
      <AnimatePresence>
        {viewingEmpleadoId !== null && (
          <EmpleadoDetailModal 
            empleadoId={viewingEmpleadoId} 
            onClose={() => setViewingEmpleadoId(null)}
            onViewVolante={(n) => {
              setViewingEmpleadoId(null)
              setSelectedNomina(n)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
