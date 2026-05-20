/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

"use client"
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useToast } from '@/components/ui/Providers'
import { Plus, Trash2, Calendar, FileText, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Cuenta = {
  id: number
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
}

type Apunte = {
  id?: number
  cuentaId: number
  cuentaCodigo: string
  cuentaNombre: string
  debito: string // Guardado como string para edición fluida
  credito: string
  referencia: string
}

type Asiento = {
  id: number
  numero: string
  fecha: string
  descripcion: string
  referencia: string | null
  origen: string | null
  estado: string
  apuntes: Array<{
    id: number
    debitoCents: number
    creditoCents: number
    referencia: string | null
    cuenta: Cuenta
  }>
}

export default function AsientosContablesPage() {
  const [asientos, setAsientos] = useState<Asiento[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  // Filtros
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0])
  const [filtroOrigen, setFiltroOrigen] = useState('')

  // Estado para nuevo asiento
  const [newFecha, setNewFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [newDescripcion, setNewDescripcion] = useState('')
  const [newReferencia, setNewReferencia] = useState('')
  const [newApuntes, setNewApuntes] = useState<Apunte[]>([
    { cuentaId: 0, cuentaCodigo: '', cuentaNombre: '', debito: '', credito: '', referencia: '' },
    { cuentaId: 0, cuentaCodigo: '', cuentaNombre: '', debito: '', credito: '', referencia: '' }
  ])

  // Búsqueda de cuentas activa por fila
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { push } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (fechaInicio) params.set('fechaInicio', `${fechaInicio}T00:00:00Z`)
      if (fechaFin) params.set('fechaFin', `${fechaFin}T23:59:59Z`)
      if (filtroOrigen) params.set('origen', filtroOrigen)

      const [resAsientos, resCuentas] = await Promise.all([
        fetch(`/api/contabilidad/asientos?${params.toString()}`),
        fetch('/api/contabilidad/cuentas')
      ])

      const dataA = await resAsientos.json()
      const dataC = await resCuentas.json()

      if (dataA.ok) setAsientos(dataA.asientos)
      if (dataC.ok) setCuentas(dataC.cuentas)
    } catch (err) {
      console.error(err)
      push('Error al cargar la información', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [fechaInicio, fechaFin, filtroOrigen])

  // Cálculos de balance
  const sumDebits = newApuntes.reduce((sum, a) => sum + (parseFloat(a.debito) || 0), 0)
  const sumCredits = newApuntes.reduce((sum, a) => sum + (parseFloat(a.credito) || 0), 0)
  const isBalanced = Math.abs(sumDebits - sumCredits) < 0.001 && sumDebits > 0
  const difference = sumDebits - sumCredits

  const addApunteRow = () => {
    setNewApuntes((prev) => [
      ...prev,
      { cuentaId: 0, cuentaCodigo: '', cuentaNombre: '', debito: '', credito: '', referencia: '' }
    ])
  }

  const removeApunteRow = (index: number) => {
    if (newApuntes.length <= 2) {
      push('Un asiento contable requiere al menos 2 movimientos.', 'error')
      return
    }
    setNewApuntes((prev) => prev.filter((_, i) => i !== index))
  }

  const updateApunteField = (index: number, field: keyof Apunte, value: any) => {
    setNewApuntes((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const updated = { ...row, [field]: value }
        
        // Regla: si escribe en débito, limpiar crédito de esa celda y viceversa
        if (field === 'debito' && value) {
          updated.credito = ''
        } else if (field === 'credito' && value) {
          updated.debito = ''
        }
        return updated
      })
    )
  }

  const handleSelectCuenta = (index: number, c: Cuenta) => {
    setNewApuntes((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, cuentaId: c.id, cuentaCodigo: c.codigo, cuentaNombre: c.nombre }
          : row
      )
    )
    setActiveSearchIndex(null)
    setSearchQuery('')
  }

  const handlePost = async () => {
    if (!isBalanced) {
      push('El asiento contable debe estar balanceado (Diferencia = 0).', 'error')
      return
    }
    if (!newDescripcion.trim()) {
      push('La descripción del asiento es obligatoria.', 'error')
      return
    }

    // Validar que todas las filas tengan cuenta seleccionada
    const invalidRow = newApuntes.find((a) => !a.cuentaCodigo)
    if (invalidRow) {
      push('Todas las líneas deben tener una cuenta seleccionada.', 'error')
      return
    }

    const payload = {
      fecha: newFecha,
      descripcion: newDescripcion.trim(),
      referencia: newReferencia.trim(),
      origen: 'MANUAL',
      apuntes: newApuntes.map((a) => ({
        cuentaCodigo: a.cuentaCodigo,
        debitoCents: Math.round((parseFloat(a.debito) || 0) * 100),
        creditoCents: Math.round((parseFloat(a.credito) || 0) * 100),
        referencia: a.referencia.trim() || undefined
      }))
    }

    try {
      const res = await fetch('/api/contabilidad/asientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.ok) {
        push('Asiento contable posteado con éxito', 'success')
        setShowNew(false)
        setNewDescripcion('')
        setNewReferencia('')
        setNewApuntes([
          { cuentaId: 0, cuentaCodigo: '', cuentaNombre: '', debito: '', credito: '', referencia: '' },
          { cuentaId: 0, cuentaCodigo: '', cuentaNombre: '', debito: '', credito: '', referencia: '' }
        ])
        await loadData()
      } else {
        push(data.error || 'No se pudo registrar el asiento', 'error')
      }
    } catch (err) {
      console.error(err)
      push('Error en el servidor', 'error')
    }
  }

  // Filtrado de cuentas en autocompletado
  const filteredCuentasSearch = cuentas.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.codigo.startsWith(searchQuery)
  )

  return (
    <AdminLayout
      title="Libro Diario"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar size={14} /> Rango:
          </div>
          <input
            type="date"
            className="input text-xs w-36 py-1.5"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <span className="muted text-xs">a</span>
          <input
            type="date"
            className="input text-xs w-36 py-1.5"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
          <select
            className="input text-xs py-1.5"
            value={filtroOrigen}
            onChange={(e) => setFiltroOrigen(e.target.value)}
          >
            <option value="">Todos los Orígenes</option>
            <option value="MANUAL">Manual</option>
            <option value="POS">Ventas POS</option>
            <option value="COMPRAS">Compras (606)</option>
            <option value="NOMINA">Nómina</option>
          </select>
          <button
            onClick={() => setShowNew(true)}
            className="btn btn-primary flex items-center gap-1"
          >
            <Plus size={16} /> Crear Asiento
          </button>
        </div>
      }
    >
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-sm muted animate-pulse">Cargando libro diario…</div>
          </div>
        ) : asientos.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center muted text-sm">
            No se encontraron asientos contables en el rango seleccionado.
          </div>
        ) : (
          <div className="grid gap-3">
            {asientos.map((a) => {
              const debTotal = a.apuntes.reduce((sum, item) => sum + item.debitoCents, 0)
              return (
                <div
                  key={a.id}
                  className="glass-panel rounded-2xl border border-slate-800/40 p-4 hover:border-slate-700/50 transition-colors"
                >
                  {/* Encabezado del Asiento */}
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/40 pb-3 mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-indigo-950 text-indigo-400 font-bold border border-indigo-900 px-2 py-0.5 rounded">
                        {a.numero}
                      </span>
                      <span className="text-sm font-semibold text-slate-100">{a.descripcion}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {a.referencia && (
                        <span className="text-slate-400">
                          Ref: <strong className="text-slate-300">{a.referencia}</strong>
                        </span>
                      )}
                      <span className="bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider text-slate-300">
                        {a.origen || 'MANUAL'}
                      </span>
                      <span className="text-slate-400">
                        {new Date(a.fecha).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Detalle (Líneas / Apuntes) */}
                  <div className="grid text-xs gap-1.5 font-mono">
                    <div className="grid grid-cols-12 font-semibold text-slate-400 border-b border-slate-800/20 pb-1 mb-1">
                      <div className="col-span-2">Código</div>
                      <div className="col-span-4">Cuenta</div>
                      <div className="col-span-3">Detalle</div>
                      <div className="col-span-1.5 text-right pr-4 col-start-10">Débito (RD$)</div>
                      <div className="col-span-1.5 text-right col-start-12">Crédito (RD$)</div>
                    </div>

                    {a.apuntes.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-12 py-1 border-b border-slate-800/10 last:border-0"
                      >
                        <div className="col-span-2 text-indigo-400">{line.cuenta.codigo}</div>
                        <div className="col-span-4 text-slate-200">
                          {/* Indentación visual si es crédito */}
                          <span className={line.creditoCents > 0 ? 'pl-4' : ''}>
                            {line.cuenta.nombre}
                          </span>
                        </div>
                        <div className="col-span-3 text-slate-400 italic">
                          {line.referencia || '—'}
                        </div>
                        <div className="col-span-1.5 text-right pr-4 text-emerald-400 col-start-10">
                          {line.debitoCents > 0 ? (line.debitoCents / 100).toFixed(2) : ''}
                        </div>
                        <div className="col-span-1.5 text-right text-indigo-400 col-start-12">
                          {line.creditoCents > 0 ? (line.creditoCents / 100).toFixed(2) : ''}
                        </div>
                      </div>
                    ))}

                    {/* Total de Control */}
                    <div className="grid grid-cols-12 font-bold border-t border-slate-800/40 pt-2 mt-1">
                      <div className="col-span-6 text-slate-400 text-left">TOTAL DE CONTROL</div>
                      <div className="col-span-1.5 text-right pr-4 text-emerald-400 col-start-10">
                        RD$ {(debTotal / 100).toFixed(2)}
                      </div>
                      <div className="col-span-1.5 text-right text-indigo-400 col-start-12">
                        RD$ {(debTotal / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Crear Asiento Manual */}
      <AnimatePresence>
        {showNew && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-panel border border-slate-700/60 rounded-3xl p-6 w-full max-w-4xl grid gap-5 max-h-[90vh] overflow-y-auto bg-slate-900/95 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="text-indigo-400" /> Nuevo Asiento Contable (Partida Doble)
                </h3>
                <button
                  onClick={() => setShowNew(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Campos generales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Fecha del Asiento</span>
                  <input
                    type="date"
                    className="input"
                    value={newFecha}
                    onChange={(e) => setNewFecha(e.target.value)}
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs text-slate-300">Descripción / Concepto</span>
                  <input
                    className="input"
                    placeholder="Ej: Registro de ventas acumuladas de la semana"
                    value={newDescripcion}
                    onChange={(e) => setNewDescripcion(e.target.value)}
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs text-slate-300">Referencia / Documento Soporte</span>
                  <input
                    className="input"
                    placeholder="Ej: Factura 928, Depósito Banco"
                    value={newReferencia}
                    onChange={(e) => setNewReferencia(e.target.value)}
                  />
                </label>
              </div>

              {/* Grilla de Apuntes (Líneas) */}
              <div className="grid gap-2 border-t border-slate-800 pt-3">
                <div className="grid grid-cols-12 text-xs font-semibold text-slate-400 px-2">
                  <div className="col-span-5">Cuenta Contable (Buscar Código o Nombre)</div>
                  <div className="col-span-2 text-right pr-2">Débito (RD$)</div>
                  <div className="col-span-2 text-right pr-2">Crédito (RD$)</div>
                  <div className="col-span-2">Detalle por Línea</div>
                  <div className="col-span-1 text-center">Borrar</div>
                </div>

                {newApuntes.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center relative">
                    {/* Buscador de Cuenta Contable */}
                    <div className="col-span-5 relative">
                      <div
                        onClick={() => {
                          setActiveSearchIndex(idx)
                          setSearchQuery('')
                        }}
                        className="input cursor-pointer py-2 text-sm min-h-[38px] flex items-center justify-between"
                      >
                        {row.cuentaCodigo ? (
                          <span>
                            <strong className="text-indigo-400 font-mono mr-1">
                              {row.cuentaCodigo}
                            </strong>{' '}
                            - {row.cuentaNombre}
                          </span>
                        ) : (
                          <span className="muted text-xs">Selecciona una cuenta…</span>
                        )}
                      </div>

                      {/* Dropdown de autocompletado */}
                      {activeSearchIndex === idx && (
                        <div className="absolute left-0 right-0 top-11 bg-slate-900 border border-slate-700/60 rounded-xl p-2 z-50 max-h-48 overflow-y-auto shadow-xl">
                          <input
                            className="input w-full py-1 text-xs mb-2"
                            placeholder="Filtrar por código o nombre…"
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {filteredCuentasSearch.length === 0 ? (
                            <div className="text-[11px] muted p-2 text-center">No hay cuentas.</div>
                          ) : (
                            filteredCuentasSearch.map((c) => (
                              <div
                                key={c.id}
                                onClick={() => handleSelectCuenta(idx, c)}
                                className="p-2 hover:bg-slate-800 rounded-lg cursor-pointer text-xs flex justify-between"
                              >
                                <span className="font-mono text-indigo-400">{c.codigo}</span>
                                <span className="text-slate-200 truncate max-w-[200px]">
                                  {c.nombre}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Débito */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="input text-right font-mono text-emerald-400"
                        placeholder="0.00"
                        value={row.debito}
                        onChange={(e) => updateApunteField(idx, 'debito', e.target.value)}
                      />
                    </div>

                    {/* Crédito */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="input text-right font-mono text-indigo-400"
                        placeholder="0.00"
                        value={row.credito}
                        onChange={(e) => updateApunteField(idx, 'credito', e.target.value)}
                      />
                    </div>

                    {/* Detalle línea */}
                    <div className="col-span-2">
                      <input
                        className="input text-xs"
                        placeholder="Detalle (opcional)"
                        value={row.referencia}
                        onChange={(e) => updateApunteField(idx, 'referencia', e.target.value)}
                      />
                    </div>

                    {/* Botón quitar */}
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => removeApunteRow(idx)}
                        className="btn border-red-900 hover:bg-red-950 p-2 text-red-400 hover:text-red-300 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <div>
                  <button onClick={addApunteRow} className="btn text-indigo-400 hover:bg-slate-800/40">
                    + Añadir Línea
                  </button>
                </div>
              </div>

              {/* Widget de Partida Doble en pie */}
              <div className="flex flex-col md:flex-row items-center justify-between border-t border-slate-800 pt-4 gap-4">
                {/* Balanceador visual */}
                <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 w-full md:w-auto">
                  <div className="flex flex-col text-xs text-slate-400">
                    <span>Total Débitos: <strong className="text-emerald-400 font-mono">RD$ {sumDebits.toFixed(2)}</strong></span>
                    <span>Total Créditos: <strong className="text-indigo-400 font-mono">RD$ {sumCredits.toFixed(2)}</strong></span>
                  </div>

                  <div className="h-10 w-[1px] bg-slate-800 hidden md:block" />

                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-950/40 border border-emerald-900 px-3 py-1.5 rounded-full">
                        <CheckCircle2 size={16} /> Partida Balanceada
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-950/40 border border-red-900 px-3 py-1.5 rounded-full">
                        <AlertCircle size={16} /> Descuadrado (RD$ {difference.toFixed(2)})
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button onClick={() => setShowNew(false)} className="btn">
                    Cancelar
                  </button>
                  <button
                    onClick={handlePost}
                    disabled={!isBalanced}
                    className="btn btn-primary disabled:opacity-30 disabled:cursor-not-allowed w-full md:w-auto flex items-center justify-center gap-1"
                  >
                    Postear Asiento
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
