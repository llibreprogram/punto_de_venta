"use client"
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    if (typeof document !== 'undefined') {
      return (document.body.getAttribute('data-theme') as 'light'|'dark') || 'light'
    }
    return 'light'
  })
  useEffect(()=>{
    document.body.setAttribute('data-theme', theme)
    try { localStorage.setItem('pv-theme', theme) } catch {}
  }, [theme])
  useEffect(()=>{
    try {
      const saved = localStorage.getItem('pv-theme') as 'light'|'dark'|null
      if (saved && saved !== theme) setTheme(saved)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <button aria-label="Cambiar tema" className="btn text-xs" onClick={()=> setTheme(t=> t==='light'?'dark':'light')}>
      {theme==='light' ? '🌙' : '☀️'}
    </button>
  )
}
