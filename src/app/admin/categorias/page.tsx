"use client"
import { useEffect, useState } from 'react'
import { useConfirm } from '@/components/ui/Providers'
import AdminLayout from '@/components/AdminLayout'

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
  const { confirm } = useConfirm()

  return (
    <AdminLayout
      title="Categorías"
      actions={(
        <div className="flex gap-2 w-full sm:w-auto">
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nueva categoría" className="input flex-1" />
          <button onClick={crear} className="btn btn-primary">Crear</button>
          <button onClick={()=>load(true)} className="btn">Refrescar</button>
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
            {loading ? (
              <tr><td className="p-3" colSpan={4}>Cargando…</td></tr>
            ) : cats.length === 0 ? (
              <tr><td className="p-3" colSpan={4}>Sin categorías</td></tr>
            ) : cats.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.id}</td>
                <td className="p-2">
                  <input className="input w-full" defaultValue={c.nombre} onBlur={async(e)=>{
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
                  <button className="btn text-red-600 border-red-300" onClick={async()=>{
                    const ok = await confirm({ message: `¿Borrar "${c.nombre}"?` })
                    if (!ok) return
                    await fetch(`/api/categorias/${c.id}`, { method:'DELETE' })
                    load(true)
                  }}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
