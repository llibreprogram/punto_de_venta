"use client"
import { useEffect, useState } from 'react'

type Categoria = { id:number; nombre:string; activa:boolean }

export default function AdminCategoriasPage() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (all=false) => {
    setLoading(true)
    const res = await fetch(`/api/categorias?${all?'all=1':''}`, { cache: 'no-store' })
    const j = await res.json()
    setCats(j)
    setLoading(false)
  }
  useEffect(()=>{ load(true) }, [])

  const crear = async () => {
    const n = nombre.trim()
    if (!n) return
    await fetch('/api/categorias', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre:n }) })
    setNombre('')
    load(true)
  }

  return (
    <main className="p-4 max-w-3xl mx-auto grid gap-4">
      <h1 className="text-xl font-semibold">Categorías</h1>
      <div className="flex gap-2">
        <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nueva categoría" className="border rounded px-3 py-2 flex-1" />
        <button onClick={crear} className="border rounded px-3 py-2">Crear</button>
        <button onClick={()=>load(true)} className="border rounded px-3 py-2">Refrescar</button>
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
            {loading ? (
              <tr><td className="p-3" colSpan={4}>Cargando…</td></tr>
            ) : cats.length === 0 ? (
              <tr><td className="p-3" colSpan={4}>Sin categorías</td></tr>
            ) : cats.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.id}</td>
                <td className="p-2">
                  <input className="border rounded px-2 py-1 w-full" defaultValue={c.nombre} onBlur={async(e)=>{
                    const nombre = e.currentTarget.value.trim(); if (!nombre || nombre===c.nombre) return
                    await fetch(`/api/categorias/${c.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre }) })
                    load(true)
                  }} />
                </td>
                <td className="p-2">
                  <input type="checkbox" checked={c.activa} onChange={async(e)=>{
                    await fetch(`/api/categorias/${c.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ activa: e.currentTarget.checked }) })
                    load(true)
                  }} />
                </td>
                <td className="p-2">
                  <button className="text-red-600 border rounded px-2 py-1" onClick={async()=>{
                    if (!confirm(`¿Borrar "${c.nombre}"?`)) return
                    await fetch(`/api/categorias/${c.id}`, { method:'DELETE' })
                    load(true)
                  }}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
