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
      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">Activa</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-3" colSpan={4}>Cargando…</td></tr> : (
              mesas.length===0 ? <tr><td className="p-3" colSpan={4}>Sin mesas</td></tr> : (
                mesas.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2">{m.id}</td>
                    <td className="p-2">
                      <input className="input w-full" defaultValue={m.nombre} onBlur={e=> rename(m, e.currentTarget.value)} />
                    </td>
                    <td className="p-2">
                      <input type="checkbox" checked={m.activa} onChange={()=> toggleActiva(m)} />
                    </td>
                    <td className="p-2 flex gap-2">
                      {m.activa && <button className="btn text-red-600 border-red-300" onClick={()=>softDelete(m)}>Desactivar</button>}
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
