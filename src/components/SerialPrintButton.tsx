"use client"
import { useEffect, useMemo, useState } from 'react'

type Props = {
  payloadUrl: string
  className?: string
  defaultBaud?: number
}

type SerialLike = {
  requestPort: () => Promise<SerialPort>
}

type SerialPort = {
  open: (options: { baudRate: number }) => Promise<void>
  close: () => Promise<void>
  writable?: WritableStream<Uint8Array>
}

export default function SerialPrintButton({ payloadUrl, className, defaultBaud }: Props) {
  const hasSerial = useMemo(() => Boolean((navigator as unknown as { serial?: unknown }).serial), [])
  const [port, setPort] = useState<SerialPort | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [baud, setBaud] = useState<number>(defaultBaud || 115200)

  // Load saved baud from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos.serialBaud')
      if (saved) setBaud(Number(saved) || (defaultBaud || 115200))
    } catch {}
  }, [defaultBaud])

  const connect = async () => {
    setErr(null)
    try {
      const serial = (navigator as unknown as { serial?: SerialLike }).serial
      if (!serial) throw new Error('Web Serial no soportado')
  const p = await serial.requestPort()
      await p.open({ baudRate: baud })
      setPort(p)
  try { localStorage.setItem('pos.serialBaud', String(baud)) } catch {}
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const print = async () => {
    if (!port) { await connect(); if (!port) return }
    setBusy(true); setErr(null)
    try {
      const res = await fetch(payloadUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo obtener el ticket')
      const text = await res.text()
      const data = new TextEncoder().encode(text)
      const writer = port.writable?.getWriter()
      if (!writer) throw new Error('Puerto no está listo para escribir')
      await writer.write(data)
      writer.releaseLock()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!hasSerial) {
    return (
      <button className={className || 'border px-3 py-2 rounded opacity-50 cursor-not-allowed'} title="Tu navegador no soporta Web Serial" disabled>
        Imprimir por Serial (no soportado)
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <select className="border rounded px-2 py-1 text-sm" value={baud} onChange={e=>setBaud(Number(e.target.value))} title="Baudios">
        {[9600,19200,38400,57600,115200].map(b=> (<option key={b} value={b}>{b} bps</option>))}
      </select>
      {port ? (
        <span className="text-sm text-green-700">Conectado</span>
      ) : (
        <button className="border px-3 py-2 rounded" onClick={connect}>Conectar impresora</button>
      )}
      <button className={className || 'border px-3 py-2 rounded'} onClick={print} disabled={busy}>
        {busy ? 'Imprimiendo…' : 'Imprimir por Serial'}
      </button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </div>
  )
}
