"use client"
import { useEffect, useState } from 'react'

type Props = { payloadUrl: string; defaultIp?: string; defaultPort?: number }

export default function NetworkPrintButton({ payloadUrl, defaultIp, defaultPort }: Props) {
  const [ip, setIp] = useState(defaultIp || '')
  const [port, setPort] = useState(defaultPort || 9100)

  useEffect(()=>{
    try {
      const sIp = localStorage.getItem('pos.printerIp')
      const sPort = localStorage.getItem('pos.printerPort')
      if (!defaultIp && sIp) setIp(sIp)
      if (!defaultPort && sPort) setPort(Number(sPort) || 9100)
    } catch {}
  }, [defaultIp, defaultPort])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const print = async () => {
    setMsg(null)
    if (!ip) { setMsg('Ingresa IP de la impresora'); return }
    setBusy(true)
    try {
      const res = await fetch(payloadUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo obtener el ticket')
      const payload = await res.text()
  const send = await fetch('/api/print/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port, payload })
      })
      if (!send.ok) throw new Error((await send.json()).error || 'Error de impresión')
  try { localStorage.setItem('pos.printerIp', ip); localStorage.setItem('pos.printerPort', String(port)) } catch {}
      setMsg('Enviado a la impresora')
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input className="border rounded px-2 py-1 text-sm w-36" placeholder="IP (ej. 192.168.1.50)" value={ip} onChange={e=>setIp(e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm w-20" type="number" min={1} max={65535} value={port} onChange={e=>setPort(Number(e.target.value)||9100)} />
      <button className="border px-3 py-2 rounded" onClick={print} disabled={busy}>{busy?'Imprimiendo…':'Imprimir por Wi‑Fi'}</button>
      {msg && <span className="text-sm {msg.includes('Error')?'text-red-600':'text-gray-600'}">{msg}</span>}
    </div>
  )
}
