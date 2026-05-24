'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface Empleado {
  id: number; codigo: string; nombre: string; apellido: string; cedula: string
  cargo: string; departamento: string; salarioBaseCents: number; activo: boolean
  fechaIngreso: string; tipoContrato: string; _count?: { nominas: number }
}

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

const DEPT_COLORS: Record<string, string> = {
  Cocina: 'bg-orange-100 text-orange-700',
  Servicio: 'bg-blue-100 text-blue-700',
  Admin: 'bg-purple-100 text-purple-700',
  Operaciones: 'bg-emerald-100 text-emerald-700',
}

const CONTRATO_ICONS: Record<string, string> = {
  INDEFINIDO: '📋', TEMPORAL: '⏳', PRUEBA: '🔍',
}

export default function EmpleadoTable({ empleados, loading, onEdit, onView, onNew, onRefresh }: {
  empleados: Empleado[]; loading: boolean
  onEdit: (e: Empleado) => void; onView: (id: number) => void; onNew: () => void; onRefresh: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')

  const filtered = empleados.filter(e => {
    if (filterStatus === 'active' && !e.activo) return false
    if (filterStatus === 'inactive' && e.activo) return false
    if (filterDept && e.departamento !== filterDept) return false
    if (search) {
      const q = search.toLowerCase()
      return e.nombre.toLowerCase().includes(q) || e.apellido.toLowerCase().includes(q) ||
        e.cedula.includes(q) || e.codigo.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q)
    }
    return true
  })

  const departments = [...new Set(empleados.map(e => e.departamento))]

  const handleDeactivate = async (id: number) => {
    if (!confirm('¿Desactivar este empleado?')) return
    await fetch(`/api/nomina/empleados/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input type="text" placeholder="Buscar empleado..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-56 text-sm" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="input text-sm w-40">
            <option value="">Todos los dept.</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="segmented-control">
            {(['active', 'all', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`segmented-btn ${filterStatus === s ? 'segmented-btn-active' : ''}`}>
                {s === 'active' ? 'Activos' : s === 'all' ? 'Todos' : 'Inactivos'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onNew} className="btn btn-primary flex items-center gap-2">
          <span>➕</span> Nuevo Empleado
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-400">
          <div className="animate-shimmer h-8 rounded-lg mb-3" />
          <div className="animate-shimmer h-8 rounded-lg mb-3" />
          <div className="animate-shimmer h-8 rounded-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-slate-500 font-medium">No hay empleados</p>
          <p className="text-sm text-slate-400 mt-1">Agrega tu primer empleado para comenzar</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3 text-right">Salario Mensual</th>
                <th className="px-4 py-3 text-right">Quincenal</th>
                <th className="px-4 py-3 text-center">Nóminas</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp, i) => (
                <motion.tr key={emp.id} initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`hover:bg-slate-50/60 transition-colors ${!emp.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{emp.codigo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {emp.nombre[0]}{emp.apellido[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{emp.nombre} {emp.apellido}</div>
                        <div className="text-xs text-slate-400">{emp.cedula}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{emp.cargo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEPT_COLORS[emp.departamento] || 'bg-slate-100 text-slate-600'}`}>
                      {emp.departamento}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{CONTRATO_ICONS[emp.tipoContrato] || '📋'} {emp.tipoContrato}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatRD(emp.salarioBaseCents)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatRD(Math.round(emp.salarioBaseCents / 2))}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {emp._count?.nominas ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => onView(emp.id)} className="btn text-xs px-2 py-1 hover:bg-slate-100 hover:border-slate-200" title="Ver Ficha">👁️</button>
                      <button onClick={() => onEdit(emp)} className="btn text-xs px-2 py-1" title="Editar">✏️</button>
                      {emp.activo && (
                        <button onClick={() => handleDeactivate(emp.id)} className="btn text-xs px-2 py-1 hover:bg-red-50 hover:border-red-200" title="Desactivar">🚫</button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
        <span>{filtered.length} empleado{filtered.length !== 1 ? 's' : ''}</span>
        <span>Total nómina quincenal: <strong className="text-slate-700">{formatRD(filtered.filter(e => e.activo).reduce((s, e) => s + Math.round(e.salarioBaseCents / 2), 0))}</strong></span>
      </div>
    </div>
  )
}
