"use client"
import { useEffect, useState } from 'react'
import { useConfirm } from '@/components/ui/Providers'
import AdminLayout from '@/components/AdminLayout'

type Categoria = { id:number; nombre:string; activa:boolean }

export default function AdminCategoriasPage() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [mostrarPapelera, setMostrarPapelera] = useState(false)
  const { push } = useToast()

  const load = async (all=false) => {
    setLoading(true)
    const res = await fetch(`/api/categorias?${all?'all=1':''}`, { cache: 'no-store' })
    const j = await res.json()
    // Si estamos en papelera, mostrar solo inactivos; si no, activos
    const filtered = mostrarPapelera ? j.filter((c: Categoria)=>!c.activa) : j.filter((c: Categoria)=>c.activa)
    setCats(filtered)
    setLoading(false)
  }
  useEffect(()=>{ load(mostrarPapelera) }, [mostrarPapelera])

  const crear = async () => {
    const n = nombre.trim()
    if (!n) return
    const res = await fetch('/api/categorias', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre:n }) })
    if (!res.ok) {
      const err = await res.json().catch(()=>({}))
      push(err.error || 'Error al crear', 'error')
      return
    }
    setNombre('')
    load(mostrarPapelera)
  }
  const { confirm } = useConfirm()

  return (
    <AdminLayout
      title="Categorías"
      actions={(
        <div className="flex gap-2 w-full sm:w-auto">
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nueva categoría" className="input flex-1" />
          <button onClick={crear} className="btn btn-primary">Crear</button>
          <button onClick={()=>setMostrarPapelera(!mostrarPapelera)} className="btn">{mostrarPapelera?'Ver activas':'Papelera'}</button>
        </div>
      )}
    >
      <div className="glass-panel rounded-xl p-4 flex flex-col gap-3">
        <div className="hidden md:grid grid-cols-[60px_1fr_100px_100px] gap-4 font-semibold text-sm text-slate-500 border-b pb-2">
          <div>ID</div>
          <div>Nombre</div>
          <div>Activa</div>
          <div>Acciones</div>
        </div>
        <div className="grid gap-4 md:gap-0">
          {loading ? (
            <div className="p-3 text-center text-slate-500">Cargando…</div>
          ) : cats.length === 0 ? (
            <div className="p-3 text-center text-slate-500">Sin categorías</div>
          ) : cats.map(c => (
            <div key={c.id} className="flex flex-col md:grid md:grid-cols-[60px_1fr_100px_100px] gap-2 md:gap-4 items-start md:items-center py-3 md:py-2 border-b last:border-0 border-slate-100">
              <div className="text-slate-500 font-mono text-sm">#{c.id}</div>
              <div className="w-full">
                <input className="input w-full" defaultValue={c.nombre} onBlur={async(e)=>{
                  const newNombre = e.currentTarget.value.trim(); if (!newNombre || newNombre===c.nombre) return
                  const res = await fetch(`/api/categorias/${c.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre: newNombre }) })
                  if (!res.ok) {
                    const err = await res.json().catch(()=>({}))
                    push(err.error || 'Error al actualizar', 'error')
                    e.currentTarget.value = c.nombre // revert
                    return
                  }
                  load(mostrarPapelera)
                }} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer w-full md:w-auto">
                <input type="checkbox" checked={c.activa} onChange={async(e)=>{
                  await fetch(`/api/categorias/${c.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ activa: e.currentTarget.checked }) })
                  load(mostrarPapelera)
                }} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" />
                <span className="md:hidden text-sm">Activa</span>
              </label>
              <div className="w-full md:w-auto">
                {!mostrarPapelera ? (
                  <button className="btn text-red-600 border-red-300 w-full md:w-auto" onClick={async()=>{
                    const ok = await confirm({ message: `¿Borrar "${c.nombre}"?` })
                    if (!ok) return
                    await fetch(`/api/categorias/${c.id}`, { method:'DELETE' })
                    load(mostrarPapelera)
                  }}>Borrar</button>
                ) : (
                  <button className="btn w-full md:w-auto" onClick={async()=>{
                    await fetch(`/api/categorias/${c.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ activa: true }) })
                    load(mostrarPapelera)
                  }}>Restaurar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
