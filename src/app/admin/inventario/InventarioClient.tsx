"use client"
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ArrowUpCircle, AlertTriangle, Search, PackageSearch } from 'lucide-react'
import { toCurrency } from '@/lib/money'
import { useToast } from '@/components/ui/Providers'
import { motion, AnimatePresence } from 'framer-motion'

type Insumo = {
  id: number
  nombre: string
  stockActual: number
  unidadMedida: string
  costoCents: number
  stockMinimo: number
  proveedorId?: number | null
  diasVidaUtil: number
}

type Proveedor = { id: number, nombre: string }

export default function InventarioClient() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMovOpen, setModalMovOpen] = useState(false)
  const [editando, setEditando] = useState<Insumo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  
  // Forms
  const [form, setForm] = useState({ nombre: '', unidadMedida: 'Gramos', costo: '', stockActual: '', stockMinimo: '', proveedorId: '', diasVidaUtil: '365' })
  const [movForm, setMovForm] = useState({ tipo: 'ENTRADA' as 'ENTRADA'|'SALIDA'|'AJUSTE', cantidad: '', razon: '' })
  const { push } = useToast()

  const load = async () => {
    setCargando(true)
    try {
      const [resIns, resProv] = await Promise.all([
        fetch('/api/inventario'),
        fetch('/api/proveedores')
      ])
      if (resIns.ok) setInsumos(await resIns.json())
      if (resProv.ok) setProveedores(await resProv.json())
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { load() }, [])

  const saveInsumo = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editando ? `/api/inventario/${editando.id}` : '/api/inventario'
    const method = editando ? 'PUT' : 'POST'
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        unidadMedida: form.unidadMedida,
        costoCents: Math.round(Number(form.costo) * 100),
        stockActual: Number(form.stockActual) || 0,
        stockMinimo: Number(form.stockMinimo) || 0,
        proveedorId: form.proveedorId ? Number(form.proveedorId) : null,
        diasVidaUtil: Number(form.diasVidaUtil) || 365
      })
    })
    
    if (res.ok) {
      push(editando ? 'Insumo actualizado' : 'Insumo creado', 'success')
      setModalOpen(false)
      load()
    } else push('Error al guardar insumo', 'error')
  }

  const deleteInsumo = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar este insumo? Si pertenece a una receta, la receta se afectará.')) return
    const res = await fetch(`/api/inventario/${id}`, { method: 'DELETE' })
    if (res.ok) {
      push('Insumo eliminado', 'success')
      load()
    } else push('Error al eliminar', 'error')
  }

  const saveMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editando) return
    const res = await fetch(`/api/inventario/${editando.id}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: movForm.tipo,
        cantidad: Number(movForm.cantidad),
        razon: movForm.razon
      })
    })
    if (res.ok) {
      push('Movimiento registrado', 'success')
      setModalMovOpen(false)
      load()
    } else push('Error al registrar movimiento', 'error')
  }

  const openNew = () => {
    setEditando(null)
    setForm({ nombre: '', unidadMedida: 'Gramos', costo: '', stockActual: '', stockMinimo: '', proveedorId: '', diasVidaUtil: '365' })
    setModalOpen(true)
  }

  const openEdit = (i: Insumo) => {
    setEditando(i)
    setForm({ 
      nombre: i.nombre, 
      unidadMedida: i.unidadMedida, 
      costo: (i.costoCents / 100).toString(), 
      stockActual: i.stockActual.toString(), 
      stockMinimo: i.stockMinimo.toString(),
      proveedorId: i.proveedorId ? i.proveedorId.toString() : '',
      diasVidaUtil: i.diasVidaUtil.toString()
    })
    setModalOpen(true)
  }

  const openMov = (i: Insumo) => {
    setEditando(i)
    setMovForm({ tipo: 'ENTRADA', cantidad: '', razon: '' })
    setModalMovOpen(true)
  }

  const insumosFiltrados = insumos.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div className="relative min-h-[75vh]">
      {/* Decorative background element */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10 -translate-y-1/2 -translate-x-1/2" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar insumo..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm font-medium placeholder:text-slate-400"
          />
        </div>
        <button onClick={openNew} className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Registrar Insumo
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center p-20"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-sm text-slate-400 uppercase tracking-wider font-bold">
                  <th className="p-5">Insumo</th>
                  <th className="p-5">Stock Actual</th>
                  <th className="p-5">Costo Und.</th>
                  <th className="p-5">Proveedor / Vida Útil</th>
                  <th className="p-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                <AnimatePresence>
                  {insumosFiltrados.map((i, idx) => {
                    const alertaStock = i.stockMinimo > 0 && i.stockActual <= i.stockMinimo
                    const prov = proveedores.find(p => p.id === i.proveedorId)
                    return (
                      <motion.tr 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        key={i.id} className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-5">
                          <div className="font-black text-lg text-slate-800 flex items-center gap-2">
                            {i.nombre}
                            {alertaStock && <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" title="Bajo stock" />}
                          </div>
                          <div className="text-sm font-medium text-slate-400 uppercase tracking-widest mt-1">Unidad: {i.unidadMedida}</div>
                        </td>
                        <td className="p-5">
                          <div className={`font-mono text-xl font-black w-max px-3 py-1.5 rounded-xl border ${alertaStock ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                            {i.stockActual} <span className="text-sm font-bold opacity-70">{i.unidadMedida}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="text-slate-600 font-bold text-lg bg-slate-50 w-max px-3 py-1.5 rounded-xl border border-slate-200/50">
                            {toCurrency(i.costoCents)}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="text-sm font-medium text-slate-600 mb-1">
                            {prov ? <span className="text-indigo-600 font-bold">🏢 {prov.nombre}</span> : <span className="text-slate-400">Sin proveedor</span>}
                          </div>
                          <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded w-max border border-slate-200/50">
                            ⏳ Vida Útil: {i.diasVidaUtil} d
                          </div>
                        </td>
                        <td className="p-5 flex items-center justify-end gap-2">
                          <button onClick={() => openMov(i)} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2" title="Ajustar Stock">
                            <ArrowUpCircle className="w-4 h-4" /> Ajustar
                          </button>
                          <button onClick={() => openEdit(i)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Editar">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => deleteInsumo(i.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Eliminar">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
                {insumosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-slate-500">
                      <PackageSearch className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-bold">No se encontraron insumos.</p>
                      <p className="text-sm">Registra tu materia prima para controlar el inventario.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Insumo */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/20">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-2xl font-black text-slate-800">{editando ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
              </div>
              <form onSubmit={saveInsumo} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del Insumo</label>
                  <input required value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors" placeholder="Ej. Carne Molida" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Unidad de Medida</label>
                    <select value={form.unidadMedida} onChange={e=>setForm({...form, unidadMedida: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors cursor-pointer">
                      <option>Gramos</option>
                      <option>Kilogramos</option>
                      <option>Libras</option>
                      <option>Mililitros</option>
                      <option>Litros</option>
                      <option>Galones</option>
                      <option>Unidades</option>
                      <option>Porciones</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Costo por {form.unidadMedida}</label>
                    <input required type="number" step="0.01" value={form.costo} onChange={e=>setForm({...form, costo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {!editando && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Stock Inicial</label>
                      <input type="number" step="0.01" value={form.stockActual} onChange={e=>setForm({...form, stockActual: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors" />
                    </div>
                  )}
                  <div className={editando ? 'col-span-2' : ''}>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Stock Mínimo (Alerta)</label>
                    <input type="number" step="0.01" value={form.stockMinimo} onChange={e=>setForm({...form, stockMinimo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Proveedor</label>
                    <select value={form.proveedorId} onChange={e=>setForm({...form, proveedorId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors cursor-pointer">
                      <option value="">Ninguno</option>
                      {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Vida Útil (Días)</label>
                    <input type="number" value={form.diasVidaUtil} onChange={e=>setForm({...form, diasVidaUtil: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors" placeholder="365" />
                  </div>
                </div>
                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={()=>setModalOpen(false)} className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors">Guardar Insumo</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Ajuste Inventario */}
      <AnimatePresence>
        {modalMovOpen && editando && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/20">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 text-center">
                <h2 className="text-2xl font-black text-slate-800">Ajustar Stock</h2>
                <div className="mt-3 inline-flex flex-col items-center">
                  <span className="font-bold text-slate-600 text-lg">{editando.nombre}</span>
                  <span className="font-mono bg-white border border-slate-200 px-4 py-1.5 rounded-lg text-indigo-700 font-bold mt-2 shadow-sm">
                    Stock Actual: {editando.stockActual} {editando.unidadMedida}
                  </span>
                </div>
              </div>
              <form onSubmit={saveMovimiento} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Ajuste</label>
                  <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
                    <button type="button" onClick={()=>setMovForm({...movForm, tipo: 'ENTRADA'})} className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${movForm.tipo==='ENTRADA' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>ENTRADA</button>
                    <button type="button" onClick={()=>setMovForm({...movForm, tipo: 'SALIDA'})} className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${movForm.tipo==='SALIDA' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>SALIDA</button>
                    <button type="button" onClick={()=>setMovForm({...movForm, tipo: 'AJUSTE'})} className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${movForm.tipo==='AJUSTE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>FIJAR</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {movForm.tipo === 'AJUSTE' ? 'Establecer nuevo stock a:' : 'Cantidad a ' + (movForm.tipo==='ENTRADA' ? 'sumar:' : 'restar:')}
                  </label>
                  <div className="relative">
                    <input required type="number" step="0.01" value={movForm.cantidad} onChange={e=>setMovForm({...movForm, cantidad: e.target.value})} className="w-full text-2xl font-black bg-slate-50 border border-slate-200 rounded-xl p-4 focus:border-indigo-500 focus:bg-white outline-none transition-colors" placeholder="0" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase tracking-widest text-sm">{editando.unidadMedida}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Motivo del ajuste (Opcional)</label>
                  <input value={movForm.razon} onChange={e=>setMovForm({...movForm, razon: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:border-indigo-500 focus:bg-white outline-none transition-colors" placeholder="Ej. Merma, Compra externa, etc." />
                </div>
                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={()=>setModalMovOpen(false)} className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                  <button type="submit" className={`flex-1 px-4 py-3.5 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 ${movForm.tipo==='ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : movForm.tipo==='SALIDA' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}>Confirmar {movForm.tipo}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
