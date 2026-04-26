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
      <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 mt-4">
        <div className="hidden lg:grid grid-cols-[1fr_1fr_100px_100px_220px] gap-4 font-semibold text-sm text-slate-500 border-b pb-2">
          <div>Nombre</div>
          <div>Email</div>
          <div>Rol</div>
          <div>Estado</div>
          <div>Acciones</div>
        </div>
        <div className="grid gap-4 lg:gap-0">
          {loading ? (
            <div className="p-3 text-center text-slate-500">Cargando…</div>
          ) : users.length === 0 ? (
            <div className="p-3 text-center text-slate-500">Sin usuarios</div>
          ) : users.map(u=> (
            <div key={u.id} className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr_100px_100px_220px] gap-2 lg:gap-4 items-start lg:items-center py-3 lg:py-2 border-b last:border-0 border-slate-100">
              <div className="w-full">
                <span className="lg:hidden text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Nombre</span>
                <input className="input w-full" defaultValue={u.nombre} onBlur={async(e)=>{
                  const nombre = e.currentTarget.value.trim(); if (!nombre || nombre===u.nombre) return
                  await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre }) })
                  load()
                }} placeholder="Nombre" />
              </div>
              <div className="w-full">
                <span className="lg:hidden text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Email</span>
                <input className="input w-full" defaultValue={u.email} onBlur={async(e)=>{
                  const email = e.currentTarget.value.trim(); if (!email || email===u.email) return
                  await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
                  load()
                }} placeholder="Email" />
              </div>
              <div className="w-full lg:w-auto">
                <span className="lg:hidden text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Rol</span>
                <select className="input w-full lg:w-auto" defaultValue={u.rol} onChange={async(e)=>{
                  const rol = e.currentTarget.value
                  await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rol }) })
                  load()
                }}>
                  <option value="cajero">cajero</option>
                  <option value="mesero">mesero</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="w-full lg:w-auto mt-1 lg:mt-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={u.activo} onChange={async(e)=>{
                    await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ activo: e.currentTarget.checked }) })
                    load()
                  }} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" />
                  <span className="text-sm">{u.activo ? 'Activo':'Inactivo'}</span>
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                <button className="btn w-full sm:w-auto" onClick={async()=>{
                  const pwd = prompt('Nueva contraseña (deja vacío para cancelar)')?.trim(); if (!pwd) return
                  await fetch(`/api/usuarios/${u.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd }) })
                  push('Contraseña actualizada', 'success')
                }}>Cambiar clave</button>
                <button className="btn text-red-600 border-red-300 w-full sm:w-auto" onClick={async()=>{
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
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
