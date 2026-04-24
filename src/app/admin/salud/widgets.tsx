"use client"
import { useState } from 'react'

export function ButtonsRow() {
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string|undefined>()
  const runBackup = async () => {
    setRunning(true); setMsg(undefined)
    try {
      const res = await fetch('/api/backups/run', { method:'POST' })
      const j = await res.json().catch(()=>null)
      if (res.ok && j?.ok) setMsg('Backup generado: ' + (j?.last?.file || 'OK'))
      else setMsg('Error: ' + (j?.error || res.status))
    } catch { setMsg('Error de red') }
    finally { setRunning(false) }
  }
  return (
    <div className="mt-4 flex flex-wrap gap-2 items-center">
      <a className="btn" href="/api/health" target="_blank">Ver /api/health</a>
      <a className="btn" href="/api/ready?html=1" target="_blank">Ver /api/ready</a>
      <button className="btn btn-primary disabled:opacity-50" disabled={running} onClick={runBackup}>{running?'Ejecutando…':'Forzar backup ahora'}</button>
      {msg && <span className="text-sm opacity-80">{msg}</span>}
    </div>
  )
}
