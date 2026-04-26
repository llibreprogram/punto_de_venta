"use client"
import { useCallback, useEffect, useState } from 'react'
import { useConfirm } from '@/components/ui/Providers'
import AdminLayout from '@/components/AdminLayout'

type Mesa = { id:number; nombre:string; activa:boolean }

export default function AdminMesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [nombre, setNombre] = useState('')
  const [mostrarInactivas, setMostrarInactivas] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/mesas?${mostrarInactivas ? 'all=1':''}`, { cache:'no-store' })
    const j: Mesa[] = await res.json()
    setMesas(j.filter(m=> mostrarInactivas || m.activa))
    setLoading(false)
  }, [mostrarInactivas])
  useEffect(()=>{ load() }, [load])

  const crear = async () => {
    const n = nombre.trim(); if (!n) return
    await fetch('/api/mesas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre:n }) })
    setNombre('')
    load()
  }

  const toggleActiva = async (m: Mesa) => {
    await fetch('/api/mesas', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id:m.id, activa: !m.activa }) })
    load()
  }

  const rename = async (m: Mesa, nuevo: string) => {
    const n = nuevo.trim(); if (!n || n===m.nombre) return
    await fetch('/api/mesas', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id:m.id, nombre:n }) })
    load()
  }

  const { confirm } = useConfirm()
  const softDelete = async (m: Mesa) => {
    const ok = await confirm({ message: `¿Desactivar mesa "${m.nombre}"?` })
    if (!ok) return
    await fetch(`/api/mesas?id=${m.id}`, { method:'DELETE' })
    load()
  }

  return (
    <AdminLayout
      title="Mesas"
      actions={(
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nueva mesa" className="input flex-1" />
          <button onClick={crear} className="btn btn-primary">Crear</button>
          <button onClick={()=>load()} className="btn">Refrescar</button>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={mostrarInactivas} onChange={e=>setMostrarInactivas(e.target.checked)} /> Inactivas</label>
        </div>
      )}
    >
      <div className="glass-panel rounded-xl p-4 flex flex-col gap-3">
        <div className="hidden md:grid grid-cols-[60px_1fr_100px_150px] gap-4 font-semibold text-sm text-slate-500 border-b pb-2">
          <div>ID</div>
          <div>Nombre</div>
          <div>Activa</div>
          <div>Acciones</div>
        </div>
        <div className="grid gap-4 md:gap-0">
          {loading ? (
            <div className="p-3 text-center text-slate-500">Cargando…</div>
          ) : mesas.length === 0 ? (
            <div className="p-3 text-center text-slate-500">Sin mesas</div>
          ) : mesas.map(m => (
            <div key={m.id} className="flex flex-col md:grid md:grid-cols-[60px_1fr_100px_150px] gap-2 md:gap-4 items-start md:items-center py-3 md:py-2 border-b last:border-0 border-slate-100">
              <div className="text-slate-500 font-mono text-sm">#{m.id}</div>
              <div className="w-full">
                <input className="input w-full" defaultValue={m.nombre} onBlur={e=> rename(m, e.currentTarget.value)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer w-full md:w-auto">
                <input type="checkbox" checked={m.activa} onChange={()=> toggleActiva(m)} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" />
                <span className="md:hidden text-sm">Activa</span>
              </label>
              <div className="w-full md:w-auto flex gap-2">
                {m.activa && <button className="btn text-red-600 border-red-300 w-full md:w-auto" onClick={()=>softDelete(m)}>Desactivar</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
