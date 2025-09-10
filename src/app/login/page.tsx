"use client"
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
    if (!res.ok) {
      const j = await res.json().catch(()=>({error:'Error'}))
      setError(j.error || 'Error de autenticación')
      return
    }
    const next = new URLSearchParams(location.search).get('next') || '/'
    location.href = next
  }

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <form onSubmit={onSubmit} className="border rounded p-6 w-full max-w-sm grid gap-3">
  <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <input className="border rounded px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Clave</span>
          <input className="border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        <button className="bg-black text-white rounded px-4 py-2">Entrar</button>
      </form>
    </main>
  )
}
