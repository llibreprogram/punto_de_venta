"use client"
import { useEffect, useMemo, useState } from 'react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import AdminLayout from '@/components/AdminLayout'
import SerialPrintButton from '@/components/SerialPrintButton'
import NetworkPrintButton from '@/components/NetworkPrintButton'

type Ajustes = { locale:string; currency:string; taxPct:number; businessName:string; ticketFooter:string; logoUrl:string; printerIp?:string|null; printerPort?:number|null; serialBaud?:number|null; autoKitchenOnCreate?:boolean; autoKitchenOnReady?:boolean; touchMode?:boolean }

export default function ConfiguracionPage() {
  const [a, setA] = useState<Ajustes | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const currencyOptions = useMemo(() => ([
    { code: 'DOP', label: 'RD$ Peso dominicano' },
    { code: 'USD', label: '$ Dólar (US)' },
    { code: 'EUR', label: '€ Euro' },
    { code: 'MXN', label: '$ Peso mexicano' },
    { code: 'COP', label: '$ Peso colombiano' },
    { code: 'ARS', label: '$ Peso argentino' },
    { code: 'CLP', label: '$ Peso chileno' },
    { code: 'PEN', label: 'S/ Sol peruano' },
    { code: 'PYG', label: '₲ Guaraní paraguayo' },
    { code: 'UYU', label: '$ Peso uruguayo' },
    { code: 'BOB', label: 'Bs Boliviano' },
    { code: 'CRC', label: '₡ Colón costarricense' },
    { code: 'GTQ', label: 'Q Quetzal guatemalteco' },
    { code: 'HNL', label: 'L Lempira hondureño' },
    { code: 'NIO', label: 'C$ Córdoba nicaragüense' },
    { code: 'PAB', label: 'B/. Balboa panameño' }
  ]), [])
  const currencyCodes = useMemo(() => currencyOptions.map(o=>o.code), [currencyOptions])
  const localeOptions = useMemo(() => ([
    { code: 'es-DO', label: 'Español (Rep. Dominicana)' },
    { code: 'es-MX', label: 'Español (México)' },
    { code: 'es-ES', label: 'Español (España)' },
    { code: 'es-AR', label: 'Español (Argentina)' },
    { code: 'es-CL', label: 'Español (Chile)' },
    { code: 'es-CO', label: 'Español (Colombia)' },
    { code: 'es-PE', label: 'Español (Perú)' },
    { code: 'es-UY', label: 'Español (Uruguay)' },
    { code: 'es-PY', label: 'Español (Paraguay)' },
    { code: 'es-VE', label: 'Español (Venezuela)' },
    { code: 'en-US', label: 'Inglés (Estados Unidos)' }
  ]), [])
  const localeCodes = useMemo(() => localeOptions.map(o=>o.code), [localeOptions])

  const load = async () => {
    setError(null)
    try {
      const res = await fetch('/api/ajustes', { cache: 'no-store' })
      const j = await res.json().catch(()=>null)
      if (!res.ok || !j || j?.error) {
        setError('No autorizado. Inicia sesión como administrador.')
        setA(null)
        return
      }
      setA(j)
    } catch {
      setError('Error al cargar ajustes')
    }
  }
  useEffect(()=>{ load() }, [])

  const save = async () => {
    if (!a) return
    setSaving(true)
    await fetch('/api/ajustes', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(a) })
    setSaving(false)
  }

  if (error) return (
    <AdminLayout title="Configuración">
    <div className="grid gap-4 max-w-md mx-auto p-6">
      <div className="p-4 glass-panel rounded text-sm text-red-700 border-red-300 border bg-red-50/70">{error}</div>
      <div className="flex gap-2">
        <a href="/login" className="btn">Ir a Login</a>
        <a href="/pos" className="btn">Volver al POS</a>
      </div>
    </div>
    </AdminLayout>
  )
  if (!a) return <AdminLayout title="Configuración"><div className="p-4">Cargando…</div></AdminLayout>
  return (
    <AdminLayout title="Configuración">
    <div className="grid gap-4 max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-panel p-4 rounded-lg">
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Nombre del negocio</span>
          <input className="input" value={a.businessName} onChange={e=>setA({...a, businessName: e.target.value})} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Moneda</span>
          <select
            className="input"
            value={currencyCodes.includes(a.currency) ? a.currency : 'CUSTOM'}
            onChange={e=>{
              const val = e.target.value
              if (val === 'CUSTOM') return
              setA({...a, currency: val})
            }}
          >
            {currencyOptions.map(c => (<option key={c.code} value={c.code}>{c.label}</option>))}
            <option value="CUSTOM">Personalizado…</option>
          </select>
          {!currencyCodes.includes(a.currency) && (
            <input
              className="input mt-2"
              placeholder="Código ISO, ej. DOP"
              value={a.currency}
              onChange={e=>setA({...a, currency: e.target.value.toUpperCase()})}
            />
          )}
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Locale</span>
          <select
            className="input"
            value={localeCodes.includes(a.locale) ? a.locale : 'CUSTOM'}
            onChange={e=>{
              const val = e.target.value
              if (val === 'CUSTOM') return
              setA({...a, locale: val})
            }}
          >
            {localeOptions.map(l => (<option key={l.code} value={l.code}>{l.label}</option>))}
            <option value="CUSTOM">Personalizado…</option>
          </select>
          {!localeCodes.includes(a.locale) && (
            <input
              className="input mt-2"
              placeholder="Ej. es-DO"
              value={a.locale}
              onChange={e=>setA({...a, locale: e.target.value})}
            />
          )}
        </label>
        <div className="sm:col-span-2 text-sm text-gray-600">
          Vista previa: <strong>{toCurrency(12345, a.locale || LOCALE, a.currency || CURRENCY)}</strong>
        </div>
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Impuesto (%)</span>
          <input type="number" min={0} className="input" value={a.taxPct} onChange={e=>setA({...a, taxPct: Number(e.target.value)})} />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-sm text-gray-600">Logo (URL)</span>
          <input className="input" value={a.logoUrl} onChange={e=>setA({...a, logoUrl: e.target.value})} />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-sm text-gray-600">Pie del ticket</span>
          <textarea className="input" rows={3} value={a.ticketFooter} onChange={e=>setA({...a, ticketFooter: e.target.value})} />
        </label>
  <div className="sm:col-span-2 grid gap-3 border rounded p-3 bg-white/40">
          <div className="font-medium">Impresoras</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">IP (Wi‑Fi)</span>
              <input className="input" placeholder="192.168.1.50" value={a.printerIp ?? ''} onChange={e=>setA({...a, printerIp: e.target.value || null})} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Puerto</span>
              <input className="input" type="number" min={1} max={65535} value={a.printerPort ?? 9100} onChange={e=>setA({...a, printerPort: Number(e.target.value)||9100})} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Baudios (Serial)</span>
              <select className="input" value={a.serialBaud ?? 115200} onChange={e=>setA({...a, serialBaud: Number(e.target.value)})}>
                {[9600,19200,38400,57600,115200].map(b=> (<option key={b} value={b}>{b}</option>))}
              </select>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!a.autoKitchenOnCreate} onChange={e=>setA({...a, autoKitchenOnCreate: e.target.checked})} />
              <span className="text-sm text-gray-700">Imprimir ticket de cocina al crear</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!a.autoKitchenOnReady} onChange={e=>setA({...a, autoKitchenOnReady: e.target.checked})} />
              <span className="text-sm text-gray-700">Imprimir cuando todo esté listo</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!a.touchMode} onChange={e=>setA({...a, touchMode: e.target.checked})} />
              <span className="text-sm text-gray-700">Modo táctil (botones grandes)</span>
            </label>
          </div>
        </div>
      </div>
      <div className="flex gap-2 glass-panel p-4 rounded-lg">
        <button onClick={save} disabled={saving} className="btn btn-primary disabled:opacity-50">{saving?'Guardando…':'Guardar'}</button>
        <a href="/pos" className="btn">Abrir POS</a>
        <button type="button" onClick={()=>{
          if (document.fullscreenElement) { document.exitFullscreen(); return }
          document.documentElement.requestFullscreen().catch(()=>{})
        }} className="btn">Pantalla completa</button>
  <SerialPrintButton payloadUrl="/api/print/test" defaultBaud={a.serialBaud ?? undefined} />
  <NetworkPrintButton payloadUrl="/api/print/test" defaultIp={a.printerIp ?? undefined} defaultPort={a.printerPort ?? undefined} />
      </div>
    </div>
    </AdminLayout>
  )
}
