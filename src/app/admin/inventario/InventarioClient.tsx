"use client"
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react'
import { toCurrency } from '@/lib/money'
import { useToast } from '@/components/ui/Providers'

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

  return (
    <div>
      <button onClick={openNew} className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:bg-indigo-700 font-bold flex items-center gap-2">
        <Plus className="w-5 h-5" /> Nuevo Insumo
      </button>

      {cargando ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                  <th className="p-4 font-bold">Insumo</th>
                  <th className="p-4 font-bold">Stock Actual</th>
                  <th className="p-4 font-bold">Costo Und.</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {insumos.map(i => {
                  const alertaStock = i.stockMinimo > 0 && i.stockActual <= i.stockMinimo
                  return (
                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {i.nombre}
                          {alertaStock && <AlertTriangle className="w-4 h-4 text-rose-500" title="Bajo stock" />}
                        </div>
                        <div className="text-xs text-slate-500">Unidad: {i.unidadMedida}</div>
                      </td>
                      <td className="p-4">
                        <span className={`font-mono font-bold ${alertaStock ? 'text-rose-600' : 'text-slate-700'}`}>
                          {i.stockActual} {i.unidadMedida}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {toCurrency(i.costoCents)}
                      </td>
                      <td className="p-4 flex items-center justify-end gap-2">
                        <button onClick={() => openMov(i)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Ajustar Stock (Entrada/Salida)">
                          <ArrowUpCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => openEdit(i)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar Insumo">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteInsumo(i.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar Insumo">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {insumos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No hay insumos registrados. Crea uno nuevo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Insumo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-800">{editando ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
            </div>
            <form onSubmit={saveInsumo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Insumo</label>
                <input required value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" placeholder="Ej. Carne Molida" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Unidad de Medida</label>
                  <select value={form.unidadMedida} onChange={e=>setForm({...form, unidadMedida: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none">
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
                  <label className="block text-sm font-bold text-slate-700 mb-1">Costo por {form.unidadMedida}</label>
                  <input required type="number" step="0.01" value={form.costo} onChange={e=>setForm({...form, costo: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {!editando && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Stock Inicial</label>
                    <input type="number" step="0.01" value={form.stockActual} onChange={e=>setForm({...form, stockActual: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" />
                  </div>
                )}
                <div className={editando ? 'col-span-2' : ''}>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Stock Mínimo (Alerta)</label>
                  <input type="number" step="0.01" value={form.stockMinimo} onChange={e=>setForm({...form, stockMinimo: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Proveedor Principal</label>
                  <select value={form.proveedorId} onChange={e=>setForm({...form, proveedorId: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none">
                    <option value="">Ninguno</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Vida Útil (Días)</label>
                  <input type="number" value={form.diasVidaUtil} onChange={e=>setForm({...form, diasVidaUtil: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" placeholder="365" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={()=>setModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste Inventario */}
      {modalMovOpen && editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-800">Ajustar Stock</h2>
              <p className="text-slate-500 mt-1">{editando.nombre} (Stock: {editando.stockActual} {editando.unidadMedida})</p>
            </div>
            <form onSubmit={saveMovimiento} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Movimiento</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={()=>setMovForm({...movForm, tipo: 'ENTRADA'})} className={`flex-1 py-2 text-sm font-bold rounded-lg ${movForm.tipo==='ENTRADA' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Entrada</button>
                  <button type="button" onClick={()=>setMovForm({...movForm, tipo: 'SALIDA'})} className={`flex-1 py-2 text-sm font-bold rounded-lg ${movForm.tipo==='SALIDA' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}>Salida</button>
                  <button type="button" onClick={()=>setMovForm({...movForm, tipo: 'AJUSTE'})} className={`flex-1 py-2 text-sm font-bold rounded-lg ${movForm.tipo==='AJUSTE' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Fijar Stock</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {movForm.tipo === 'AJUSTE' ? 'Nuevo Stock Real' : 'Cantidad a ' + (movForm.tipo==='ENTRADA' ? 'Sumar' : 'Restar')} ({editando.unidadMedida})
                </label>
                <input required type="number" step="0.01" value={movForm.cantidad} onChange={e=>setMovForm({...movForm, cantidad: e.target.value})} className="w-full text-2xl border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Motivo (Opcional)</label>
                <input value={movForm.razon} onChange={e=>setMovForm({...movForm, razon: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" placeholder="Ej. Compra, Desperdicio, etc." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={()=>setModalMovOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancelar</button>
                <button type="submit" className={`flex-1 px-4 py-3 text-white rounded-xl font-bold ${movForm.tipo==='ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : movForm.tipo==='SALIDA' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
