"use client"
import { useEffect, useState } from 'react'

type Mesa = { id:number; nombre:string; activa:boolean }

export default function AdminMesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [nombre, setNombre] = useState('')
  const [mostrarInactivas, setMostrarInactivas] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/mesas?${mostrarInactivas ? 'all=1':''}`, { cache:'no-store' })
    const j: Mesa[] = await res.json()
    setMesas(j.filter(m=> mostrarInactivas || m.activa))
    setLoading(false)
  }
  useEffect(()=>{ load() }, [mostrarInactivas])

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

  const softDelete = async (m: Mesa) => {
    if (!confirm(`¿Desactivar mesa "${m.nombre}"?`)) return
    await fetch(`/api/mesas?id=${m.id}`, { method:'DELETE' })
    load()
  }

  return (
    <main className="p-4 max-w-3xl mx-auto grid gap-4">
      <h1 className="text-xl font-semibold">Mesas</h1>
      <div className="flex gap-2 items-center">
        <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nueva mesa" className="border rounded px-3 py-2 flex-1" />
        <button onClick={crear} className="border rounded px-3 py-2">Crear</button>
        <button onClick={()=>load()} className="border rounded px-3 py-2">Refrescar</button>
        <label className="flex items-center gap-1 text-sm ml-auto"><input type="checkbox" checked={mostrarInactivas} onChange={e=>setMostrarInactivas(e.target.checked)} /> Ver inactivas</label>
      </div>
      <div className="border rounded overflow-hidden">
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
                      <input className="border rounded px-2 py-1 w-full" defaultValue={m.nombre} onBlur={e=> rename(m, e.currentTarget.value)} />
                    </td>
                    <td className="p-2">
                      <input type="checkbox" checked={m.activa} onChange={()=> toggleActiva(m)} />
                    </td>
                    <td className="p-2 flex gap-2">
                      {m.activa && <button className="text-red-600 border rounded px-2 py-1" onClick={()=>softDelete(m)}>Desactivar</button>}
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
