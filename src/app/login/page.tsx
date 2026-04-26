/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, LogIn, Monitor } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({error:'Error'}))
        setError(j.error || 'Error de autenticación')
        return
      }
      const next = new URLSearchParams(location.search).get('next') || '/'
      location.href = next
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(-45deg, #f97316, #ea580c, #dc2626, #c2410c, #f59e0b)',
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 12s ease infinite',
        }}
      />
      {/* Glass overlay for depth */}
      <div className="absolute inset-0 -z-[5] bg-gradient-to-b from-black/10 via-transparent to-black/20" />

      <motion.form 
        onSubmit={onSubmit} 
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [.25,.46,.45,.94] }}
      >
        <div className="bg-white/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 p-8 grid gap-5">
          {/* Logo & Branding */}
          <div className="text-center grid gap-2">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white/50"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Punto de Venta</h1>
            <p className="text-sm text-slate-500 font-medium">Inicia sesión para continuar</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium"
            >
              {error}
            </motion.div>
          )}

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all shadow-sm" 
                type="email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                placeholder="admin@local"
                required 
              />
            </div>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Contraseña</span>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all shadow-sm" 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>
          </label>
          <button 
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-lg transition-all active:scale-[.98] disabled:opacity-60"
            style={{ background: 'var(--gradient-brand)', boxShadow: '0 4px 14px rgba(234,88,12,.35)' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Iniciar Sesión
              </>
            )}
          </button>
        </div>

        <p className="text-center text-white/60 text-xs mt-4 font-medium">
          © 2026 Rafael Llibre · Todos los derechos reservados
        </p>
      </motion.form>
    </main>
  )
}
