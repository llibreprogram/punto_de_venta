"use client"
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Building2, Phone, Mail, Clock, Search, Truck } from 'lucide-react'
import { useToast } from '@/components/ui/Providers'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [busqueda, setBusqueda] = useState('')
  
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

  const filtrados = items.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div className="relative min-h-[75vh]">
      {/* Decorative background element */}
      <div className="fixed top-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar proveedor..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
          />
        </div>
        <button onClick={openNew} className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Registrar Proveedor
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center p-20"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filtrados.map((i, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={i.id} 
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/30 border border-slate-200/60 flex flex-col hover:-translate-y-1 transition-transform duration-300 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-xl text-slate-800 bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">{i.nombre}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>openEdit(i)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={()=>remove(i.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-3 flex-1 mb-6">
                  {i.contacto && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><div className="font-bold text-xs">ID</div></div>
                      <span className="font-medium">{i.contacto}</span>
                    </div>
                  )}
                  {i.telefono && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><Phone className="w-3.5 h-3.5" /></div>
                      <span className="font-medium">{i.telefono}</span>
                    </div>
                  )}
                  {i.email && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><Mail className="w-3.5 h-3.5" /></div>
                      <span className="font-medium">{i.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 font-bold border border-slate-200/50">
                    <Truck className="w-4 h-4 text-slate-400" /> {i.diasEntrega} días
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/50">
                    {i._count?.insumos || 0} Insumos
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/20">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-2xl font-black text-slate-800">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
              </div>
              <form onSubmit={save} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre (Empresa)</label>
                  <input required value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors" placeholder="Ej. Sysco" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Contacto Principal</label>
                  <input value={form.contacto} onChange={e=>setForm({...form, contacto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors" placeholder="Nombre del vendedor" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono</label>
                    <input value={form.telefono} onChange={e=>setForm({...form, telefono: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400"/> Días que tarda en entregar</label>
                  <input type="number" min="1" required value={form.diasEntrega} onChange={e=>setForm({...form, diasEntrega: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
                </div>
                
                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={()=>setModalOpen(false)} className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors">Guardar Proveedor</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
