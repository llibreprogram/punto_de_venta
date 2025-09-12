"use client"
import { useEffect, useState } from 'react'
import { useToast, useConfirm } from '@/components/ui/Providers'
import AdminLayout from '@/components/AdminLayout'

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
  const { push } = useToast()
  const { confirm } = useConfirm()

  return (
    <AdminLayout title="Usuarios">
      <div className="glass-panel rounded-xl p-4 grid gap-3">
        <h2 className="font-medium">Crear usuario</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <input placeholder="Nombre" className="input" value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} />
          <input placeholder="Email" className="input" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <select className="input" value={form.rol} onChange={e=>setForm({...form, rol:e.target.value})}>
            <option value="cajero">cajero</option>
            <option value="mesero">mesero</option>
            <option value="admin">admin</option>
          </select>
          <input placeholder="Clave" type="password" className="input" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        </div>
        <button className="btn btn-primary w-fit" onClick={create}>Crear</button>
      </div>
      <div className="glass-panel rounded-xl overflow-hidden">
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
                  <input className="input w-full" defaultValue={u.nombre} onBlur={async(e)=>{
                    const nombre = e.currentTarget.value.trim(); if (!nombre || nombre===u.nombre) return
                    await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre }) })
                    load()
                  }} />
                </td>
                <td className="p-2">
                  <input className="input w-full" defaultValue={u.email} onBlur={async(e)=>{
                    const email = e.currentTarget.value.trim(); if (!email || email===u.email) return
                    await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
                    load()
                  }} />
                </td>
                <td className="p-2">
                  <select className="input" defaultValue={u.rol} onChange={async(e)=>{
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
                    <button className="btn" onClick={async()=>{
                      const pwd = prompt('Nueva contraseña (deja vacío para cancelar)')?.trim(); if (!pwd) return
                      await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd }) })
                        push('Contraseña actualizada', 'success')
                    }}>Cambiar clave</button>
                    <button className="btn text-red-600 border-red-300" onClick={async()=>{
                        const ok = await confirm({ message: `¿Eliminar usuario ${u.email}?` })
                        if (!ok) return
                      const res = await fetch(`/api/usuarios/${u.id}`, { method:'DELETE' })
                      if (!res.ok) {
                        const j = await res.json().catch(()=>({error:'Error'}))
                          push(j.error || 'No se pudo eliminar', 'error')
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
    </AdminLayout>
  )
}
