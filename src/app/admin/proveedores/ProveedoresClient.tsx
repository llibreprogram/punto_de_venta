"use client"
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/Providers'

type Proveedor = {
  id: number
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  diasEntrega: number
  _count?: { insumos: number }
}

export default function ProveedoresClient() {
  const [items, setItems] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  
  const [form, setForm] = useState({ nombre: '', contacto: '', telefono: '', email: '', diasEntrega: '1' })
  const { push } = useToast()

  const load = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/proveedores')
      if (res.ok) setItems(await res.json())
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editando ? `/api/proveedores/${editando.id}` : '/api/proveedores'
    const method = editando ? 'PUT' : 'POST'
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    
    if (res.ok) {
      push(editando ? 'Proveedor actualizado' : 'Proveedor creado', 'success')
      setModalOpen(false)
      load()
    } else push('Error al guardar', 'error')
  }

  const remove = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar este proveedor?')) return
    const res = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' })
    if (res.ok) {
      push('Proveedor eliminado', 'success')
      load()
    } else push('Error al eliminar', 'error')
  }

  const openNew = () => {
    setEditando(null)
    setForm({ nombre: '', contacto: '', telefono: '', email: '', diasEntrega: '1' })
    setModalOpen(true)
  }

  const openEdit = (i: Proveedor) => {
    setEditando(i)
    setForm({ nombre: i.nombre, contacto: i.contacto||'', telefono: i.telefono||'', email: i.email||'', diasEntrega: String(i.diasEntrega) })
    setModalOpen(true)
  }

  return (
    <div>
      <button onClick={openNew} className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:bg-indigo-700 font-bold flex items-center gap-2">
        <Plus className="w-5 h-5" /> Nuevo Proveedor
      </button>

      {cargando ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(i => (
            <div key={i.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-lg text-slate-800">{i.nombre}</h3>
                <div className="flex gap-1">
                  <button onClick={()=>openEdit(i)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={()=>remove(i.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="text-sm text-slate-500 mb-4 space-y-1">
                {i.contacto && <p>👤 {i.contacto}</p>}
                {i.telefono && <p>📞 {i.telefono}</p>}
                {i.email && <p>✉️ {i.email}</p>}
                <p>🚚 Tiempo de Entrega: <span className="font-bold text-slate-700">{i.diasEntrega} días</span></p>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">
                  {i._count?.insumos || 0} Insumos vinculados
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-800">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Nombre (Empresa)</label><input required value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Contacto Principal</label><input value={form.contacto} onChange={e=>setForm({...form, contacto: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label><input value={form.telefono} onChange={e=>setForm({...form, telefono: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500" /></div>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Días que tarda en entregar</label><input type="number" min="1" required value={form.diasEntrega} onChange={e=>setForm({...form, diasEntrega: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500" /></div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={()=>setModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
