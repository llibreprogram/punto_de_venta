/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

"use client"
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useToast, useConfirm } from '@/components/ui/Providers'
import { Folder, FolderOpen, FileText, Plus, Search, ChevronRight, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Cuenta = {
  id: number
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  activa: boolean
  padreId: number | null
  subCuentas?: Cuenta[]
}

export default function CatalogCuentasPage() {
  const [cuentasTree, setCuentasTree] = useState<Cuenta[]>([])
  const [cuentasList, setCuentasList] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({
    1: true, // Expandir raíces por defecto
    13: true, // Pasivos
    25: true, // Patrimonio
    29: true, // Ingresos
    33: true, // Costos
    37: true // Gastos
  })

  // Estado para nueva cuenta
  const [showNew, setShowNew] = useState(false)
  const [newCodigo, setNewCodigo] = useState('')
  const [newNombre, setNewNombre] = useState('')
  const [newPadreId, setNewPadreId] = useState<string>('')
  const [newTipo, setNewTipo] = useState('ACTIVO')
  const [newNaturaleza, setNewNaturaleza] = useState('DEBITO')

  const { push } = useToast()
  const { confirm } = useConfirm()

  const loadCuentas = async () => {
    try {
      setLoading(true)
      const [resTree, resList] = await Promise.all([
        fetch('/api/contabilidad/cuentas?tree=true'),
        fetch('/api/contabilidad/cuentas')
      ])
      
      const dataTree = await resTree.json()
      const dataList = await resList.json()

      if (dataTree.ok) setCuentasTree(dataTree.cuentas)
      if (dataList.ok) setCuentasList(dataList.cuentas)
    } catch (error) {
      console.error(error)
      push('No se pudieron cargar las cuentas', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCuentas()
  }, [])

  const toggleNode = (id: number) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCreate = async () => {
    const code = newCodigo.trim()
    const name = newNombre.trim()
    if (!code || !name) {
      push('El código y nombre son obligatorios', 'error')
      return
    }

    try {
      const res = await fetch('/api/contabilidad/cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: code,
          nombre: name,
          padreId: newPadreId ? parseInt(newPadreId, 10) : null,
          tipo: newTipo,
          naturaleza: newNaturaleza
        })
      })

      const data = await res.json()
      if (data.ok) {
        push('Cuenta contable creada con éxito', 'success')
        setShowNew(false)
        setNewCodigo('')
        setNewNombre('')
        setNewPadreId('')
        await loadCuentas()
      } else {
        push(data.error || 'No se pudo crear la cuenta', 'error')
      }
    } catch (err) {
      console.error(err)
      push('Error en el servidor', 'error')
    }
  }

  const handleOpenAddSub = (parent: Cuenta) => {
    setNewPadreId(String(parent.id))
    setNewTipo(parent.tipo)
    setNewNaturaleza(parent.naturaleza)
    
    // Autocompletar sugerencia de código (ej: Padre es "1.1", sugerimos "1.1.0X")
    const siblings = parent.subCuentas || []
    if (siblings.length > 0) {
      const lastCode = siblings[siblings.length - 1].codigo
      const parts = lastCode.split('.')
      const lastNum = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastNum)) {
        parts[parts.length - 1] = String(lastNum + 1).padStart(2, '0')
        setNewCodigo(parts.join('.'))
      } else {
        setNewCodigo(`${parent.codigo}.01`)
      }
    } else {
      setNewCodigo(`${parent.codigo}.01`)
    }
    setShowNew(true)
  }

  // Filtrado de cuentas list
  const filteredCuentasList = cuentasList.filter(
    (c) =>
      c.nombre.toLowerCase().includes(q.toLowerCase()) ||
      c.codigo.includes(q) ||
      c.tipo.toLowerCase().includes(q.toLowerCase())
  )

  // Renderizar un nodo del árbol recursivamente
  const renderTreeNode = (node: Cuenta, depth = 0) => {
    const isParent = node.subCuentas && node.subCuentas.length > 0
    const isExpanded = !!expandedNodes[node.id]
    
    // Si hay búsqueda, verificar si este nodo o algún hijo coincide
    const matchesSearch = (n: Cuenta): boolean => {
      if (n.nombre.toLowerCase().includes(q.toLowerCase()) || n.codigo.includes(q)) return true
      if (n.subCuentas && n.subCuentas.length > 0) {
        return n.subCuentas.some(matchesSearch)
      }
      return false
    }

    if (q && !matchesSearch(node)) return null

    return (
      <div key={node.id} className="select-none">
        <div
          style={{ paddingLeft: `${depth * 1.5}rem` }}
          className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-800/40 rounded-lg transition-colors border-b border-slate-800/20 group"
        >
          <div className="flex items-center gap-2">
            {isParent ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700/50"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            {isParent ? (
              isExpanded ? (
                <FolderOpen className="text-amber-500" size={18} />
              ) : (
                <Folder className="text-amber-500" size={18} />
              )
            ) : (
              <FileText className="text-slate-400" size={18} />
            )}

            <span className="font-mono text-indigo-400 font-semibold text-sm">{node.codigo}</span>
            <span className="text-sm font-medium text-slate-100">{node.nombre}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              {node.tipo}
            </span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                node.naturaleza === 'DEBITO'
                  ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400'
                  : 'bg-indigo-950/40 border-indigo-900 text-indigo-400'
              }`}
            >
              {node.naturaleza}
            </span>
            <button
              onClick={() => handleOpenAddSub(node)}
              className="opacity-0 group-hover:opacity-100 btn p-1 hover:bg-slate-700/50 rounded transition-opacity"
              title="Añadir Subcuenta"
            >
              <Plus size={14} className="text-indigo-400" />
            </button>
          </div>
        </div>

        {isParent && isExpanded && (
          <div className="grid">
            {node.subCuentas!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <AdminLayout
      title="Catálogo de Cuentas"
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              className="input pl-9 w-64"
              placeholder="Buscar por código o nombre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button onClick={() => {
            setNewPadreId('')
            setNewCodigo('')
            setShowNew(true)
          }} className="btn btn-primary flex items-center gap-1">
            <Plus size={16} /> Nueva Cuenta
          </button>
        </div>
      }
    >
      <div className="grid gap-4">
        {/* Leyenda */}
        <div className="flex gap-4 text-xs muted px-2">
          <div className="flex items-center gap-1.5">
            <Folder size={14} className="text-amber-500" /> Cuentas Control / Padres
          </div>
          <div className="flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" /> Cuentas de Detalle / Auxiliares
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-sm muted animate-pulse">Cargando catálogo contable…</div>
            </div>
          ) : cuentasTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-sm muted mb-2">No hay cuentas contables registradas.</div>
              <button onClick={() => setShowNew(true)} className="btn btn-primary">
                Inicializar Catálogo
              </button>
            </div>
          ) : q ? (
            // Si hay búsqueda activa, mostramos una lista plana para mejor legibilidad
            <div className="grid gap-1">
              {filteredCuentasList.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-800/40 rounded-lg border-b border-slate-800/20"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="text-slate-400" size={16} />
                    <span className="font-mono text-indigo-400 font-semibold text-sm">{c.codigo}</span>
                    <span className="text-sm font-medium text-slate-100">{c.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {c.tipo}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                        c.naturaleza === 'DEBITO'
                          ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400'
                          : 'bg-indigo-950/40 border-indigo-900 text-indigo-400'
                      }`}
                    >
                      {c.naturaleza}
                    </span>
                  </div>
                </div>
              ))}
              {filteredCuentasList.length === 0 && (
                <div className="text-center py-10 muted text-sm">No se encontraron coincidencias.</div>
              )}
            </div>
          ) : (
            // Estructura de árbol estándar
            <div className="grid">
              {cuentasTree.map((root) => renderTreeNode(root, 0))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Cuenta */}
      <AnimatePresence>
        {showNew && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border border-slate-700/60 rounded-3xl p-6 w-full max-w-md grid gap-4 shadow-2xl bg-slate-900/95"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100">
                  {newPadreId ? 'Crear Subcuenta / Auxiliar' : 'Crear Cuenta Principal'}
                </h3>
                <button
                  onClick={() => {
                    setShowNew(false)
                    setNewPadreId('')
                    setNewCodigo('')
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Si tiene padre seleccionado, mostrarlo */}
              {newPadreId && (
                <div className="bg-indigo-950/30 border border-indigo-900/50 p-3 rounded-xl text-xs flex justify-between items-center text-slate-300">
                  <div>
                    <span className="muted">Padre:</span>{' '}
                    <span className="font-mono text-indigo-400 font-semibold">
                      {cuentasList.find((c) => c.id === parseInt(newPadreId))?.codigo}
                    </span>{' '}
                    - {cuentasList.find((c) => c.id === parseInt(newPadreId))?.nombre}
                  </div>
                  <span className="text-[9px] font-bold bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded uppercase">
                    Heredado
                  </span>
                </div>
              )}

              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-300">Código Contable</span>
                  <input
                    className="input font-mono"
                    placeholder="Ej: 1.1.01.03"
                    value={newCodigo}
                    onChange={(e) => setNewCodigo(e.target.value)}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-300">Nombre de la Cuenta</span>
                  <input
                    className="input"
                    placeholder="Ej: Banco BHD León"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                  />
                </label>

                {!newPadreId && (
                  <>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-300">Tipo de Cuenta</span>
                      <select
                        className="input"
                        value={newTipo}
                        onChange={(e) => setNewTipo(e.target.value)}
                      >
                        <option value="ACTIVO">Activo</option>
                        <option value="PASIVO">Pasivo</option>
                        <option value="PATRIMONIO">Patrimonio</option>
                        <option value="INGRESO">Ingreso</option>
                        <option value="COSTO">Costo</option>
                        <option value="GASTO">Gasto</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-300">Naturaleza</span>
                      <select
                        className="input"
                        value={newNaturaleza}
                        onChange={(e) => setNewNaturaleza(e.target.value)}
                      >
                        <option value="DEBITO">Débito (Suma en Debe)</option>
                        <option value="CREDITO">Crédito (Suma en Haber)</option>
                      </select>
                    </label>
                  </>
                )}

                {newPadreId && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="muted block">Tipo</span>
                      <span className="font-semibold text-slate-200">{newTipo}</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="muted block">Naturaleza</span>
                      <span className="font-semibold text-slate-200">{newNaturaleza}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  className="btn"
                  onClick={() => {
                    setShowNew(false)
                    setNewPadreId('')
                    setNewCodigo('')
                  }}
                >
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleCreate}>
                  Crear Cuenta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
