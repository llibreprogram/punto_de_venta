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
import { Plus, Trash2, Calendar, FileText, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, Search } from 'lucide-react'
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

  // State para accordion expandible
  const [expandedAsientos, setExpandedAsientos] = useState<Record<number, boolean>>({})

  // Paginación y búsqueda
  const [page, setPage] = useState(1)
  const [searchDesc, setSearchDesc] = useState('')
  const PAGE_SIZE = 15

  const { push } = useToast()
  const [anulandoId, setAnulandoId] = useState<number | null>(null)

  const handleAnular = async (id: number) => {
    if (!confirm('¿Está seguro de que desea anular este asiento contable? Se generará una transacción de reversión/contraasiento y se anularán los registros fiscales relacionados.')) {
      return
    }
    try {
      setAnulandoId(id)
      const res = await fetch(`/api/contabilidad/asientos/${id}/anular`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.ok) {
        push('Asiento anulado correctamente. Reversión generada.', 'success')
        loadData()
      } else {
        push(data.error || 'No se pudo anular el asiento', 'error')
      }
    } catch (err: any) {
      push(err.message || 'Error al conectar con el servidor', 'error')
    } finally {
      setAnulandoId(null)
    }
  }

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setShowNew(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  const applyTemplate = (templateName: string) => {
    if (templateName === 'venta') {
      setNewDescripcion('Registro de venta POS acumulada del día')
      const accCaja = cuentas.find(c => c.codigo.startsWith('1.1.01') || c.nombre.toLowerCase().includes('caja'))
      const accVenta = cuentas.find(c => c.codigo.startsWith('4.1.01') || c.nombre.toLowerCase().includes('venta'))
      const accItbis = cuentas.find(c => c.codigo.startsWith('2.1.02') || c.nombre.toLowerCase().includes('itbis'))
      
      const newRows = [
        { cuentaId: accCaja?.id || 0, cuentaCodigo: accCaja?.codigo || '', cuentaNombre: accCaja?.nombre || '', debito: '', credito: '', referencia: 'Ingreso Diario' },
        { cuentaId: accVenta?.id || 0, cuentaCodigo: accVenta?.codigo || '', cuentaNombre: accVenta?.nombre || '', debito: '', credito: '', referencia: 'Venta' },
        { cuentaId: accItbis?.id || 0, cuentaCodigo: accItbis?.codigo || '', cuentaNombre: accItbis?.nombre || '', debito: '', credito: '', referencia: 'ITBIS 18%' },
      ]
      setNewApuntes(newRows)
    } else if (templateName === 'alquiler') {
      setNewDescripcion('Pago de Alquiler del local comercial')
      const accGasto = cuentas.find(c => c.codigo.startsWith('6.1.02') || c.nombre.toLowerCase().includes('alquiler'))
      const accBanco = cuentas.find(c => c.codigo.startsWith('1.1.01.02') || c.nombre.toLowerCase().includes('banco') || c.nombre.toLowerCase().includes('popular'))
      
      const newRows = [
        { cuentaId: accGasto?.id || 0, cuentaCodigo: accGasto?.codigo || '', cuentaNombre: accGasto?.nombre || '', debito: '', credito: '', referencia: 'Mes corriente' },
        { cuentaId: accBanco?.id || 0, cuentaCodigo: accBanco?.codigo || '', cuentaNombre: accBanco?.nombre || '', debito: '', credito: '', referencia: 'Transferencia' },
      ]
      setNewApuntes(newRows)
    } else if (templateName === 'nomina') {
      setNewDescripcion('Pago de nómina y salarios del personal')
      const accGasto = cuentas.find(c => c.codigo.startsWith('6.1.01') || c.nombre.toLowerCase().includes('sueldo') || c.nombre.toLowerCase().includes('nomina'))
      const accBanco = cuentas.find(c => c.codigo.startsWith('1.1.01.02') || c.nombre.toLowerCase().includes('banco') || c.nombre.toLowerCase().includes('popular'))
      
      const newRows = [
        { cuentaId: accGasto?.id || 0, cuentaCodigo: accGasto?.codigo || '', cuentaNombre: accGasto?.nombre || '', debito: '', credito: '', referencia: 'Quincena' },
        { cuentaId: accBanco?.id || 0, cuentaCodigo: accBanco?.codigo || '', cuentaNombre: accBanco?.nombre || '', debito: '', credito: '', referencia: 'Transferencia' },
      ]
      setNewApuntes(newRows)
    }
  }

  const handleAutoBalance = () => {
    if (Math.abs(difference) < 0.01) {
      push('El asiento ya está balanceado.', 'info')
      return
    }

    const valueStr = Math.abs(difference).toFixed(2)
    const isCreditNeeded = difference > 0

    setNewApuntes(prev => {
      const copy = [...prev]
      const lastIdx = copy.length - 1
      const lastRow = copy[lastIdx]

      // Si la última línea no tiene montos, la usamos
      if (!lastRow.debito && !lastRow.credito) {
        copy[lastIdx] = {
          ...lastRow,
          debito: isCreditNeeded ? '' : valueStr,
          credito: isCreditNeeded ? valueStr : '',
        }
      } else {
        // De lo contrario agregamos una nueva
        copy.push({
          cuentaId: 0,
          cuentaCodigo: '',
          cuentaNombre: '',
          debito: isCreditNeeded ? '' : valueStr,
          credito: isCreditNeeded ? valueStr : '',
          referencia: 'Ajuste cuadre'
        })
      }
      return copy
    })
    push('Partida autobalanceada exitosamente.', 'success')
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
          <div className="grid gap-3 animate-pulse mt-2">
            <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/30 rounded-2xl border border-slate-200/40 dark:border-slate-800/10" />
            ))}
          </div>
        ) : asientos.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center muted text-sm">
            No se encontraron asientos contables en el rango seleccionado.
          </div>
        ) : (
          <div className="grid gap-2">
            {/* Summary stats bar */}
            <div className="flex items-center justify-between text-xs px-3 py-2.5 mb-1 bg-slate-100 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {asientos.length} asientos encontrados
                </span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1.5 text-slate-400 dark:text-slate-500" size={12} />
                  <input
                    className="bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700/50 rounded-lg pl-7 pr-3 py-1 text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 w-48 outline-none focus:border-indigo-500/50 transition-colors"
                    placeholder="Buscar por descripción…"
                    value={searchDesc}
                    onChange={(e) => { setSearchDesc(e.target.value); setPage(1) }}
                  />
                </div>
              </div>
              <span className="text-slate-700 dark:text-slate-300 font-bold font-mono">
                Total movimientos: RD$ {(asientos.reduce((s, a) => s + a.apuntes.reduce((sum, ap) => sum + ap.debitoCents, 0), 0) / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {(() => {
              const filtered = searchDesc.trim()
                ? asientos.filter(a =>
                    a.descripcion.toLowerCase().includes(searchDesc.toLowerCase()) ||
                    a.numero.toLowerCase().includes(searchDesc.toLowerCase()) ||
                    (a.referencia || '').toLowerCase().includes(searchDesc.toLowerCase())
                  )
                : asientos
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
              const start = (page - 1) * PAGE_SIZE
              const paginated = filtered.slice(start, start + PAGE_SIZE)

              return (
                <>
                  {paginated.length === 0 && searchDesc.trim() ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No se encontraron asientos que coincidan con &quot;{searchDesc}&quot;.
                    </div>
                  ) : null}

                  {paginated.map((a) => {
              const debTotal = a.apuntes.reduce((sum, item) => sum + item.debitoCents, 0)
              const origenStyles: Record<string, string> = {
                POS: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
                MANUAL: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400',
                COMPRAS: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400',
                NOMINA: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-400',
                TEST: 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400',
              }
              const origenKey = a.origen || 'MANUAL'
              const isExpanded = expandedAsientos[a.id]

              return (
                <div
                  key={a.id}
                  className={`bg-white dark:bg-slate-900/60 rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-indigo-300 dark:border-indigo-800/50 shadow-md shadow-indigo-100 dark:shadow-indigo-900/10'
                      : 'border-slate-200 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700/50'
                  }`}
                >
                  {/* Clickable Header */}
                  <button
                    onClick={() => setExpandedAsientos(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                    className="w-full flex flex-wrap items-center justify-between p-4 gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                      <span className={`font-mono text-xs font-bold border px-2 py-0.5 rounded flex-shrink-0 ${
                        a.estado === 'ANULADO'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900'
                      }`}>
                        {a.numero}
                      </span>
                      <span className={`text-sm font-semibold truncate ${
                        a.estado === 'ANULADO'
                          ? 'text-slate-400 dark:text-slate-500 line-through'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {a.descripcion}
                      </span>
                      {a.estado === 'ANULADO' && (
                        <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50 font-bold uppercase tracking-wider">
                          Anulado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      {a.referencia && (
                        <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                          Ref: <strong className="text-slate-700 dark:text-slate-300">{a.referencia}</strong>
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${origenStyles[origenKey] || origenStyles.MANUAL}`}>
                        {origenKey}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {new Date(a.fecha).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        RD$ {(debTotal / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>

                  {/* Expandable Detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800/40">
                      <div className="grid text-xs gap-1.5 font-mono mt-3">
                        <div className="grid grid-cols-12 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/20 pb-1 mb-1">
                          <div className="col-span-2">Código</div>
                          <div className="col-span-4">Cuenta</div>
                          <div className="col-span-3">Detalle</div>
                          <div className="col-span-1.5 text-right pr-4 col-start-10">Débito (RD$)</div>
                          <div className="col-span-1.5 text-right col-start-12">Crédito (RD$)</div>
                        </div>

                        {a.apuntes.map((line) => (
                          <div
                            key={line.id}
                            className="grid grid-cols-12 py-1 border-b border-slate-100 dark:border-slate-800/10 last:border-0"
                          >
                            <div className="col-span-2 text-indigo-600 dark:text-indigo-400">{line.cuenta.codigo}</div>
                            <div className="col-span-4 text-slate-700 dark:text-slate-200">
                              <span className={line.creditoCents > 0 ? 'pl-4' : ''}>
                                {line.cuenta.nombre}
                              </span>
                            </div>
                            <div className="col-span-3 text-slate-500 dark:text-slate-400 italic">
                              {line.referencia || '—'}
                            </div>
                            <div className="col-span-1.5 text-right pr-4 text-emerald-600 dark:text-emerald-400 col-start-10">
                              {line.debitoCents > 0 ? (line.debitoCents / 100).toFixed(2) : ''}
                            </div>
                            <div className="col-span-1.5 text-right text-indigo-600 dark:text-indigo-400 col-start-12">
                              {line.creditoCents > 0 ? (line.creditoCents / 100).toFixed(2) : ''}
                            </div>
                          </div>
                        ))}

                        {/* Total de Control */}
                        <div className="grid grid-cols-12 font-bold border-t border-slate-200 dark:border-slate-800/40 pt-2 mt-1">
                          <div className="col-span-6 text-slate-500 dark:text-slate-400 text-left">TOTAL DE CONTROL</div>
                          <div className="col-span-1.5 text-right pr-4 text-emerald-600 dark:text-emerald-400 col-start-10">
                            RD$ {(debTotal / 100).toFixed(2)}
                          </div>
                          <div className="col-span-1.5 text-right text-indigo-600 dark:text-indigo-400 col-start-12">
                            RD$ {(debTotal / 100).toFixed(2)}
                          </div>
                        </div>
                        {a.estado !== 'ANULADO' ? (
                          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/10">
                            <button
                              disabled={anulandoId === a.id}
                              onClick={() => handleAnular(a.id)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 border border-rose-200 dark:border-rose-900/50"
                            >
                              <Trash2 size={12} />
                              {anulandoId === a.id ? 'Anulando...' : 'Anular Asiento'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/10">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded border border-slate-200 dark:border-slate-700">
                              ANULADO / REVERTIDO
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-3">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Anterior
                      </button>
                      <span className="text-[11px] font-mono text-slate-400">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
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

                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Cargar Plantilla Común</span>
                  <select
                    className="input bg-slate-900 border border-slate-700 text-slate-200"
                    onChange={(e) => {
                      applyTemplate(e.target.value)
                      e.target.value = ''
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Seleccione una plantilla…</option>
                    <option value="venta">Venta POS del Día (Ingreso/Venta/ITBIS)</option>
                    <option value="alquiler">Pago de Alquiler (Gasto/Banco)</option>
                    <option value="nomina">Pago de Nómina (Gasto/Banco)</option>
                  </select>
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

                <div className="flex justify-between items-center w-full">
                  <button onClick={addApunteRow} className="btn text-indigo-400 hover:bg-slate-800/40">
                    + Añadir Línea
                  </button>
                  <button
                    onClick={handleAutoBalance}
                    disabled={Math.abs(difference) < 0.01}
                    className="btn border border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    ⚖️ Autobalancear Diferencia
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
