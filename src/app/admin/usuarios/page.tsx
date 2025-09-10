"use client"
import { useEffect, useState } from 'react'

type Usuario = { id:number; nombre:string; email:string; rol:string; activo:boolean }

export default function UsuariosAdminPage() {
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre:'', email:'', rol:'cajero', password:'' })

  const load = async ()=>{
    setLoading(true)
    const res = await fetch('/api/usuarios', { cache:'no-store' })
    const j = await res.json()
    setUsers(j)
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])

  const create = async ()=>{
    await fetch('/api/usuarios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    setForm({ nombre:'', email:'', rol:'cajero', password:'' })
    load()
  }

  return (
    <main className="p-4 max-w-4xl mx-auto grid gap-4">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <div className="border rounded p-3 grid gap-2">
        <h2 className="font-medium">Crear usuario</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <input placeholder="Nombre" className="border rounded px-3 py-2" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} />
          <input placeholder="Email" className="border rounded px-3 py-2" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <select className="border rounded px-3 py-2" value={form.rol} onChange={e=>setForm({...form, rol:e.target.value})}>
            <option value="cajero">cajero</option>
            <option value="mesero">mesero</option>
            <option value="admin">admin</option>
          </select>
          <input placeholder="Clave" type="password" className="border rounded px-3 py-2" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        </div>
        <button className="bg-black text-white px-4 py-2 rounded w-fit" onClick={create}>Crear</button>
      </div>
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Rol</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-3" colSpan={5}>Cargando…</td></tr> : users.map(u=> (
              <tr key={u.id} className="border-t">
                <td className="p-2">
                  <input className="border rounded px-2 py-1 w-full" defaultValue={u.nombre} onBlur={async(e)=>{
                    const nombre = e.currentTarget.value.trim(); if (!nombre || nombre===u.nombre) return
                    await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre }) })
                    load()
                  }} />
                </td>
                <td className="p-2">
                  <input className="border rounded px-2 py-1 w-full" defaultValue={u.email} onBlur={async(e)=>{
                    const email = e.currentTarget.value.trim(); if (!email || email===u.email) return
                    await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
                    load()
                  }} />
                </td>
                <td className="p-2">
                  <select className="border rounded px-2 py-1" defaultValue={u.rol} onChange={async(e)=>{
                    const rol = e.currentTarget.value
                    await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rol }) })
                    load()
                  }}>
                    <option value="cajero">cajero</option>
                    <option value="mesero">mesero</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="p-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={u.activo} onChange={async(e)=>{
                      await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ activo: e.currentTarget.checked }) })
                      load()
                    }} />
                    <span>{u.activo ? 'activo':'inactivo'}</span>
                  </label>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="border rounded px-2 py-1" onClick={async()=>{
                      const pwd = prompt('Nueva contraseña (deja vacío para cancelar)')?.trim(); if (!pwd) return
                      await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd }) })
                      alert('Contraseña actualizada')
                    }}>Cambiar clave</button>
                    <button className="text-red-600 border rounded px-2 py-1" onClick={async()=>{
                      if (!confirm(`¿Eliminar usuario ${u.email}?`)) return
                      const res = await fetch(`/api/usuarios/${u.id}`, { method:'DELETE' })
                      if (!res.ok) {
                        const j = await res.json().catch(()=>({error:'Error'}))
                        alert(j.error || 'No se pudo eliminar')
                      } else {
                        load()
                      }
                    }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
