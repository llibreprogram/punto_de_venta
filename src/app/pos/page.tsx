"use client"
import { useEffect, useMemo, useState } from 'react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

type Producto = {
  id: number
  nombre: string
  precioCents: number
  imagenUrl: string | null
  categoria: { id: number; nombre: string }
  ingredientes?: string[]
  extras?: Array<{ nombre:string; precioCents:number }>
}

type Linea = { producto: Producto; cantidad: number; removidos?: string[]; extras?: string[]; nota?: string }
type TipoOrden = 'Mostrador' | 'Mesa' | 'Delivery'
type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'

export default function POSPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [catFiltro, setCatFiltro] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<Record<number, Linea>>({})
  const [tipo, setTipo] = useState<TipoOrden>('Mostrador')
  const [mesas, setMesas] = useState<{id:number; nombre:string}[]>([])
  const [mesaId, setMesaId] = useState<number|undefined>(undefined)
  const [IVA_PCT, setIVA] = useState<number>(0)
  const [ajustes, setAjustes] = useState<{ locale?: string; currency?: string; touchMode?: boolean } | null>(null)
  const [lastAdded, setLastAdded] = useState<number | null>(null)
  const [customOpen, setCustomOpen] = useState<Record<number, boolean>>({})
  const [editingPedidoId, setEditingPedidoId] = useState<number|null>(null)
  const searchId = 'search-input'

  useEffect(() => {
    setCargando(true)
    Promise.all([
      fetch('/api/productos').then(r => r.json()),
      fetch('/api/mesas').then(r => r.json()),
      fetch('/api/ajustes').then(r=>r.json()).catch(()=>null),
    ]).then(async ([prods, mesas, ajustes]) => {
      setProductos(prods)
      setMesas(mesas)
      if (ajustes?.taxPct != null) setIVA(ajustes.taxPct)
  if (ajustes) setAjustes({ locale: ajustes.locale, currency: ajustes.currency, touchMode: ajustes.touchMode })
      // Si viene ?load=ID, cargar la orden abierta al carrito
      const url = new URL(window.location.href)
      const loadId = url.searchParams.get('load')
  if (loadId) {
        const res = await fetch(`/api/pedidos/${loadId}`, { cache: 'no-store' })
        if (res.ok) {
          const pedido = await res.json()
          if (pedido?.estado === 'ABIERTO' && Array.isArray(pedido.items)) {
            const nuevo: Record<number, Linea> = {}
            for (const it of pedido.items) {
              const prod = prods.find((p: Producto)=> p.id === it.productoId)
              if (!prod) continue
              // Mapear extras removidos y nota desde item
              const linea: Linea = {
                producto: prod,
                cantidad: it.cantidad,
                removidos: it.removidos || undefined,
                extras: it.extras || undefined,
                nota: it.notas || undefined,
              }
              nuevo[prod.id] = linea
            }
            setCarrito(nuevo)
    setEditingPedidoId(Number(loadId))
            if (pedido.mesaId) {
              setTipo('Mesa')
              setMesaId(pedido.mesaId)
            }
          }
        }
        // Limpiar el parámetro de la URL sin recargar
        url.searchParams.delete('load')
        window.history.replaceState({}, '', url.toString())
      }
    }).finally(()=> setCargando(false))
  }, [])

  // Atajos: Ctrl+K (focus búsqueda), 1-9 para categorías, +/- para última línea
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const el = document.getElementById(searchId) as HTMLInputElement | null
        el?.focus()
      }
      if (!e.ctrlKey && !e.metaKey) {
        // números 1..9 cambian categoría
        if (/^[1-9]$/.test(e.key)) {
          const idx = Number(e.key) - 1
          const cats = Array.from(new Set(productos.map(p=>p.categoria.nombre)))
          const nueva = cats[idx]
          if (nueva) setCatFiltro(nueva)
        }
        if (e.key === '+') {
          if (lastAdded && productos.length) {
            const linea = Object.values(carrito).find(l => l.producto.id === lastAdded)
            if (linea) agregar(linea.producto)
          }
        }
        if (e.key === '-' || e.key === '_') {
          if (lastAdded) quitar(lastAdded)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [productos, lastAdded, carrito])

  const categorias = useMemo(() => Array.from(new Set(productos.map(p => p.categoria.nombre))), [productos])

  const visibles = useMemo(() => productos.filter(p => {
    const okCat = !catFiltro || p.categoria.nombre === catFiltro
    const okTxt = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return okCat && okTxt
  }), [productos, catFiltro, busqueda])

  const agregar = (p: Producto) => setCarrito(prev => {
    const linea = prev[p.id]
    const cantidad = (linea?.cantidad ?? 0) + 1
    setLastAdded(p.id)
    return { ...prev, [p.id]: { producto: p, cantidad } }
  })

  const quitar = (id: number) => setCarrito(prev => {
    const linea = prev[id]
    if (!linea) return prev
    const cantidad = linea.cantidad - 1
    const copia = { ...prev }
    if (cantidad <= 0) delete copia[id]
    else copia[id] = { ...linea, cantidad }
    return copia
  })

  const precioLinea = (l: Linea) => {
    const base = l.producto.precioCents
  const extraSum = (l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)
    return base + extraSum
  }
  const subtotal = useMemo(() => Object.values(carrito).reduce((acc, l) => acc + precioLinea(l) * l.cantidad, 0), [carrito])
  const [descTipo, setDescTipo] = useState<'monto'|'pct'>('monto')
  const [descValor, setDescValor] = useState('')
  const descuentoCents = useMemo(()=>{
    const v = Number(String(descValor).replace(/[^0-9.]/g,''))
    if (!isFinite(v) || v<=0) return 0
    if (descTipo==='pct') {
      return Math.max(0, Math.min(subtotal, Math.round(subtotal * (v/100))))
    }
    return Math.max(0, Math.min(subtotal, Math.round(v*100)))
  }, [descValor, descTipo, subtotal])
  const base = useMemo(()=> Math.max(0, subtotal - descuentoCents), [subtotal, descuentoCents])
  const impuesto = useMemo(() => Math.round(base * (IVA_PCT / 100)), [base, IVA_PCT])
  const total = useMemo(() => base + impuesto, [base, impuesto])
  const [cobrando, setCobrando] = useState(false)
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO')
  const [entregado, setEntregado] = useState('')
  const cambio = useMemo(()=> {
    const entr = Number(entregado.replace(/[^0-9.]/g,''))
    if (!isFinite(entr)) return 0
    return Math.max(0, Math.round(entr*100) - total)
  }, [entregado, total])

  const fmtCurrency = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  // División de cuenta: selección parcial por línea (cantidad a cobrar)
  const [sel, setSel] = useState<Record<number, number>>({}) // productoId -> cantidad seleccionada
  const seleccionadas = useMemo(()=> Object.entries(sel).filter(([id, q])=>{
    const l = carrito[Number(id)]?.cantidad || 0
    return (q||0) > 0 && l > 0
  }).map(([id, q])=>({ id: Number(id), qty: Math.min(q, carrito[Number(id)]?.cantidad || 0) })), [sel, carrito])
  const subtotalSel = useMemo(()=> seleccionadas.reduce((acc, s)=> acc + (carrito[s.id] ? precioLinea(carrito[s.id]) : 0) * s.qty, 0), [seleccionadas, carrito])
  const [descSelTipo, setDescSelTipo] = useState<'monto'|'pct'>('monto')
  const [descSelValor, setDescSelValor] = useState('')
  const descuentoSelCents = useMemo(()=>{
    const v = Number(String(descSelValor).replace(/[^0-9.]/g,''))
    if (!isFinite(v) || v<=0) return 0
    if (descSelTipo==='pct') return Math.max(0, Math.min(subtotalSel, Math.round(subtotalSel * (v/100))))
    return Math.max(0, Math.min(subtotalSel, Math.round(v*100)))
  }, [descSelValor, descSelTipo, subtotalSel])
  const baseSel = useMemo(()=> Math.max(0, subtotalSel - descuentoSelCents), [subtotalSel, descuentoSelCents])
  const impuestoSel = useMemo(()=> Math.round(baseSel * (IVA_PCT / 100)), [baseSel, IVA_PCT])
  const totalSel = useMemo(()=> baseSel + impuestoSel, [baseSel, impuestoSel])
  const [cobrandoSel, setCobrandoSel] = useState(false)
  const [metodoSel, setMetodoSel] = useState<MetodoPago>('EFECTIVO')
  const [entregadoSel, setEntregadoSel] = useState('')
  const cambioSel = useMemo(()=>{
    const entr = Number(entregadoSel.replace(/[^0-9.]/g,''))
    if (!isFinite(entr)) return 0
    return Math.max(0, Math.round(entr*100) - totalSel)
  }, [entregadoSel, totalSel])

  // Guardar orden abierta
  const guardarAbierta = async () => {
    if (Object.values(carrito).length === 0) return
    const items = Object.values(carrito).map(l=> ({
      productoId: l.producto.id,
      cantidad: l.cantidad,
      precioCents: precioLinea(l),
      removidos: l.removidos,
      extras: l.extras,
      extrasCents: ((l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)),
      notas: (l.nota||'').trim() || undefined,
    }))
    const url = editingPedidoId ? `/api/pedidos/${editingPedidoId}` : '/api/pedidos'
    const method = editingPedidoId ? 'PUT' : 'POST'
    const body = editingPedidoId ? { items, impuestoCents: impuesto, descuentoCents } : { tipo, mesaId, items, impuestoCents: impuesto, descuentoCents }
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json().catch(()=>null)
      setCarrito({})
      setEditingPedidoId(null)
      if (data?.autoKitchen && data?.pedidoId) {
        try { await fetch(`/api/print/kitchen/${data.pedidoId}`) } catch {}
      }
      alert('Orden guardada como ABIERTA')
    } else {
      alert('No se pudo guardar la orden')
    }
  }

  return (
    <div className={`min-h-screen grid grid-rows-[auto_1fr] ${ajustes?.touchMode ? 'touch-mode' : ''}`}>
    <header className="p-4 border-b flex gap-3 items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-10 bg-gradient-to-r from-cyan-500/5 to-emerald-500/5">
        <div className="flex gap-3 items-center">
          <h1 className="text-xl font-semibold">Punto de Venta</h1>
          <span className="text-sm muted">Fast Food</span>
          {editingPedidoId && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">Editando orden #{editingPedidoId}</span>
          )}
        </div>
  <div className="flex items-center gap-2">
          <select value={tipo} onChange={(e)=>{
            const v = e.target.value
            const isTipo = (x: string): x is TipoOrden => x==='Mostrador' || x==='Mesa' || x==='Delivery'
            setTipo(isTipo(v) ? v : 'Mostrador')
          }} className="input">
            <option>Mostrador</option>
            <option>Mesa</option>
            <option>Delivery</option>
          </select>
          {tipo==='Mesa' && (
            <select value={mesaId ?? ''} onChange={e=>setMesaId(Number(e.target.value)||undefined)} className="input">
              <option value="">Selecciona mesa</option>
              {mesas.map(m=> (<option key={m.id} value={m.id}>{m.nombre}</option>))}
            </select>
          )}
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar productos..."
            id={searchId}
            className="input w-64"
            aria-label="Buscar productos"
          />
          <a href="/pos/abiertas" className="btn" title="Órdenes abiertas">🧾</a>
          <a href="/kds" className="btn" title="Cocina (KDS)">🍳</a>
          <a href="/configuracion" className="btn" title="Configuración">⚙️</a>
          <button type="button" className="btn" title="Pantalla completa" onClick={()=>{
            if (document.fullscreenElement) { document.exitFullscreen(); return }
            document.documentElement.requestFullscreen().catch(()=>{})
          }}>⛶</button>
          <button onClick={async()=>{ await fetch('/api/auth/logout', { method:'POST' }); location.href='/login' }} className="btn">Salir</button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <aside className="md:col-span-2">
          <div className="flex gap-2 mb-3 flex-wrap sticky top-16 bg-background/80 backdrop-blur z-10 py-2">
            <button className={`chip ${catFiltro===null?'bg-white/10 border-white/30':''}`} onClick={()=>setCatFiltro(null)}>Todo</button>
            {categorias.map(c => (
              <button key={c} className={`chip ${catFiltro===c?'bg-white/10 border-white/30':''}`} onClick={()=>setCatFiltro(c)}>{c}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cargando ?
              Array.from({length:8}).map((_,i)=> (
                <div key={i} className="card rounded-lg p-3">
                  <div className="aspect-video bg-gray-100 rounded mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-1 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-1/3 animate-pulse" />
                </div>
              ))
            : visibles.map(p => (
              <button key={p.id} onClick={()=>agregar(p)} className="card rounded-lg p-3 text-left hover:shadow-md focus:outline-none focus:ring-2" style={{outlineColor:'var(--ring)'}}>
                <div className="relative aspect-video bg-gray-50/40 rounded mb-2 overflow-hidden">
                  {p.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-gray-400 text-sm">Sin imagen</div>
                  )}
                  <span className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">{fmtCurrency(p.precioCents)}</span>
                </div>
                <div className="font-medium truncate" title={p.nombre}>{p.nombre}</div>
                <div className="text-xs muted">{p.categoria.nombre}</div>
              </button>
            ))}
          </div>
        </aside>
  <section className="md:col-span-1 card rounded-lg p-3 grid grid-rows-[auto_1fr_auto] h-[80vh]">
          <h2 className="font-semibold mb-2">Orden actual</h2>
          <div className="overflow-auto divide-y">
            {Object.values(carrito).length === 0 && (
              <div className="text-sm muted">Agrega productos para comenzar</div>
            )}
            {Object.values(carrito).map(l => (
              <div key={l.producto.id} className="py-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate" title={l.producto.nombre}>{l.producto.nombre}</div>
                  <div className="text-xs muted">{fmtCurrency(l.producto.precioCents)}</div>
                  <button
                    className="text-[11px] underline text-blue-600 mt-1"
                    onClick={()=> setCustomOpen(prev=> ({ ...prev, [l.producto.id]: !prev[l.producto.id] }))}
                  >{customOpen[l.producto.id] ? 'Ocultar' : 'Personalizar'}</button>
                  {customOpen[l.producto.id] && !!(l.producto.ingredientes?.length) && (
                    <div className="mt-1">
                      <div className="text-xs font-medium">Quitar ingredientes</div>
                      <div className="text-xs grid gap-1 mt-1">
                        {(l.producto.ingredientes||[]).map(ing => (
                          <label key={ing} className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked onChange={(e)=>{
                              const checked = e.target.checked
                              setCarrito(prev=>{
                                const next: Record<number, Linea> = { ...prev }
                                const line = next[l.producto.id]
                                if (!line) return prev
                                const current = line.removidos
                                const set = new Set(current||[])
                                if (!checked) set.add(ing)
                                else set.delete(ing)
                                line.removidos = Array.from(set)
                                return next
                              })
                            }} />
                            <span className="select-none">{ing}</span>
                          </label>
                        ))}
                        <div className="text-[10px] text-gray-500">Desmarca lo que NO llevará</div>
                      </div>
                    </div>
                  )}
                  {!!(l.extras && l.extras.length) && (
                    <div className="text-[11px] text-green-700 mt-1">
                      Extras: {l.extras.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn" onClick={()=>quitar(l.producto.id)} aria-label="Quitar uno">-</button>
                  <input
                    type="number"
                    className="w-14 input text-right"
                    min={1}
                    value={l.cantidad}
                    onChange={(e)=>{
                      const val = Math.max(1, Number(e.target.value) || 1)
                      setCarrito(prev => ({...prev, [l.producto.id]: { ...prev[l.producto.id], cantidad: val }}))
                      setSel(prev=>{ const cur={...prev}; const s=cur[l.producto.id]; if (s && s>val) cur[l.producto.id]=val; return cur })
                    }}
                    aria-label="Cantidad"
                  />
                  <button className="btn" onClick={()=>agregar(l.producto)} aria-label="Agregar uno">+</button>
                  <button className="btn text-red-400" onClick={()=>{
                    setCarrito(prev=>{ const c={...prev}; delete c[l.producto.id]; return c })
                    setSel(prev=>{ const c={...prev}; delete c[l.producto.id]; return c })
                  }}>Eliminar</button>
                  <div className="w-20 text-right font-semibold">{fmtCurrency(precioLinea(l) * l.cantidad)}</div>
                </div>
                <div className="grid gap-1 text-xs items-center">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!sel[l.producto.id]}
                      onChange={(e)=>{
                        const checked = e.target.checked
                        setSel(prev=>{
                          const next={...prev}
                          if (checked) next[l.producto.id] = l.cantidad
                          else delete next[l.producto.id]
                          return next
                        })
                      }}
                    />
                    <span>Seleccionar</span>
                  </label>
                  {sel[l.producto.id] !== undefined && (
                    <input
                      type="number"
                      className="w-16 input text-right"
                      min={1}
                      max={l.cantidad}
                      value={Math.min(sel[l.producto.id]||1, l.cantidad)}
                      onChange={(e)=>{
                        const val = Math.max(1, Math.min(l.cantidad, Number(e.target.value)||1))
                        setSel(prev=> ({...prev, [l.producto.id]: val}))
                      }}
                      aria-label="Cantidad a cobrar"
                    />
                  )}
                  {customOpen[l.producto.id] && !!(l.producto.extras?.length) && (
                    <div className="mt-1">
                      <div className="text-xs font-medium">Extras</div>
                      <div className="text-xs grid gap-1 mt-1">
                        {(l.producto.extras||[]).map(ex => {
                          const checked = (l.extras||[]).includes(ex.nombre)
                          return (
                            <label key={ex.nombre} className="flex items-center gap-2">
                              <input type="checkbox" checked={checked} onChange={(e)=>{
                                const on = e.target.checked
                                setCarrito(prev=>{
                                  const next: Record<number, Linea> = { ...prev }
                                  const line = next[l.producto.id]
                                  if (!line) return prev
                                  const cur = new Set(line.extras||[])
                                  if (on) cur.add(ex.nombre); else cur.delete(ex.nombre)
                                  line.extras = Array.from(cur)
                                  return next
                                })
                              }} />
                              <span className="select-none">{ex.nombre} (+{fmtCurrency(ex.precioCents)})</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {customOpen[l.producto.id] && (
                    <div className="mt-1">
                      <div className="text-xs font-medium">Nota</div>
                      <input
                        className="input w-full text-xs"
                        placeholder="Ej: sin salsa aparte, bien cocido…"
                        value={l.nota || ''}
                        onChange={e=>{
                          const v = e.target.value
                          setCarrito(prev=> ({ ...prev, [l.producto.id]: { ...prev[l.producto.id], nota: v } }))
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t grid gap-2 sticky bottom-0 bg-background" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span>{fmtCurrency(subtotal)}</span>
            </div>
            <div className="grid gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>Descuento</span>
                <span>{descuentoCents ? `- ${fmtCurrency(descuentoCents)}` : fmtCurrency(0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <select className="input" value={descTipo} onChange={e=>setDescTipo(e.target.value as 'monto'|'pct')}>
                  <option value="monto">Monto</option>
                  <option value="pct">%</option>
                </select>
                <input className="input w-32 text-right" placeholder={descTipo==='pct'? '0 %':'0.00'} value={descValor} onChange={e=>setDescValor(e.target.value)} />
                {descTipo==='pct' && (
                  <div className="flex gap-1">
                    {[5,10,15,20].map(p=> (
                      <button key={p} className="btn text-xs" onClick={()=>setDescValor(String(p))}>{p}%</button>
                    ))}
                  </div>
                )}
                {descValor && <button className="text-xs underline ml-auto" onClick={()=>setDescValor('')}>Limpiar</button>}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Impuesto ({IVA_PCT}%)</span>
              <span>{fmtCurrency(impuesto)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">{fmtCurrency(total)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{ if (total===0) return; if (window.confirm('¿Vaciar la orden?')) setCarrito({}) }} disabled={total===0} className="btn w-1/3 disabled:opacity-50">Vaciar</button>
              <button onClick={guardarAbierta} disabled={Object.values(carrito).length===0 || (tipo==='Mesa' && !mesaId)} title={tipo==='Mesa' && !mesaId ? 'Selecciona una mesa' : ''} className="btn w-1/3 disabled:opacity-50">Guardar</button>
              <button disabled={total===0} onClick={()=>setCobrando(true)} className="btn btn-primary w-2/3 disabled:opacity-50">Cobrar</button>
            </div>
            {editingPedidoId && (
              <div className="flex gap-2 mt-2">
                <button
                  className="btn text-red-600 border-red-300"
                  onClick={async ()=>{
                    if (!editingPedidoId) return
                    const confirma = window.confirm('¿Cancelar y eliminar esta orden?')
                    if (!confirma) return
                    const res = await fetch(`/api/pedidos/${editingPedidoId}`, { method: 'DELETE' })
                    if (res.ok) {
                      setCarrito({})
                      setEditingPedidoId(null)
                      alert('Orden eliminada')
                    } else {
                      const j = await res.json().catch(()=>null)
                      alert(j?.error || 'No se pudo eliminar la orden')
                    }
                  }}
                >Cancelar orden</button>
                <button
                  className="btn"
                  onClick={()=> setEditingPedidoId(null)}
                  title="Salir de edición"
                >Salir de edición</button>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                disabled={seleccionadas.length===0 || subtotalSel===0}
                onClick={()=> setCobrandoSel(true)}
                className="btn w-full disabled:opacity-50"
                title={seleccionadas.length===0? 'Selecciona líneas para dividir la cuenta': 'Cobrar solo los seleccionados'}
              >Cobrar seleccionados</button>
            </div>
          </div>
        </section>
      </div>
      {cobrando && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="bg-white text-black rounded-lg w-full max-w-md p-4 grid gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cobrar</h3>
              <button onClick={()=>setCobrando(false)} className="text-gray-500">✕</button>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between"><span>Total</span><strong>{fmtCurrency(total)}</strong></div>
              <label className="grid gap-1">
                <span className="text-sm text-gray-600">Método de pago</span>
                <select value={metodo} onChange={e=>{
                  const v = e.target.value
                  const isMetodo = (x: string): x is MetodoPago => x==='EFECTIVO' || x==='TARJETA' || x==='TRANSFERENCIA'
                  setMetodo(isMetodo(v) ? v : 'EFECTIVO')
                }} className="border rounded px-2 py-2">
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </label>
              {metodo==='EFECTIVO' && (
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Entregado</span>
                  <input value={entregado} onChange={e=>setEntregado(e.target.value)} placeholder="0.00" className="border rounded px-3 py-2"/>
                  <div className="text-sm text-gray-600">Cambio: <strong>{fmtCurrency(cambio)}</strong></div>
                </label>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={()=>setCobrando(false)}>Cancelar</button>
      <button className="btn btn-primary" onClick={async ()=>{
                const items = Object.values(carrito).map(l=> ({
                  productoId: l.producto.id,
                  cantidad: l.cantidad,
                  precioCents: precioLinea(l),
                  removidos: l.removidos,
                  extras: l.extras,
                  extrasCents: ((l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)),
                  notas: (l.nota||'').trim() || undefined,
                }))
                const url = editingPedidoId ? `/api/pedidos/${editingPedidoId}` : '/api/pedidos'
                const method = editingPedidoId ? 'PUT' : 'POST'
                const res = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...(editingPedidoId ? {} : { tipo, mesaId }),
                    items,
        impuestoCents: impuesto,
        descuentoCents: descuentoCents,
                    pago: { metodo, montoCents: total },
                  })
                })
                if (res.ok) {
                  const data = await res.json()
                  setCarrito({})
                  setCobrando(false)
                  setEditingPedidoId(null)
                  if (data?.pedidoId) {
                    window.open(`/ticket/${data.pedidoId}`, '_blank')
                    if (data?.autoKitchen) {
                      try { await fetch(`/api/print/kitchen/${data.pedidoId}`) } catch {}
                    }
                  }
                } else {
                  alert('Error al cobrar')
                }
              }}>Confirmar cobro</button>
            </div>
          </div>
        </div>
      )}
      {cobrandoSel && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="bg-white text-black rounded-lg w-full max-w-md p-4 grid gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cobrar seleccionados</h3>
              <button onClick={()=>setCobrandoSel(false)} className="text-gray-500">✕</button>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between"><span>Total</span><strong>{fmtCurrency(totalSel)}</strong></div>
              <div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>{fmtCurrency(subtotalSel)}</span></div>
              <div className="grid gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Descuento</span>
                  <span>{descuentoSelCents ? `- ${fmtCurrency(descuentoSelCents)}` : fmtCurrency(0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select className="input" value={descSelTipo} onChange={e=>setDescSelTipo(e.target.value as 'monto'|'pct')}>
                    <option value="monto">Monto</option>
                    <option value="pct">%</option>
                  </select>
                  <input className="input w-32 text-right" placeholder={descSelTipo==='pct'? '0 %':'0.00'} value={descSelValor} onChange={e=>setDescSelValor(e.target.value)} />
                  {descSelTipo==='pct' && (
                    <div className="flex gap-1">
                      {[5,10,15,20].map(p=> (
                        <button key={p} className="btn text-xs" onClick={()=>setDescSelValor(String(p))}>{p}%</button>
                      ))}
                    </div>
                  )}
                  {descSelValor && <button className="text-xs underline ml-auto" onClick={()=>setDescSelValor('')}>Limpiar</button>}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Impuesto ({IVA_PCT}%)</span>
                <span>{fmtCurrency(impuestoSel)}</span>
              </div>
              <label className="grid gap-1">
                <span className="text-sm text-gray-600">Método de pago</span>
                <select value={metodoSel} onChange={e=>{
                  const v = e.target.value
                  const isMetodo = (x: string): x is MetodoPago => x==='EFECTIVO' || x==='TARJETA' || x==='TRANSFERENCIA'
                  setMetodoSel(isMetodo(v) ? v : 'EFECTIVO')
                }} className="border rounded px-2 py-2">
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </label>
              {metodoSel==='EFECTIVO' && (
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600">Entregado</span>
                  <input value={entregadoSel} onChange={e=>setEntregadoSel(e.target.value)} placeholder="0.00" className="border rounded px-3 py-2"/>
                  <div className="text-sm text-gray-600">Cambio: <strong>{fmtCurrency(cambioSel)}</strong></div>
                </label>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={()=>setCobrandoSel(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={totalSel===0} onClick={async ()=>{
                if (totalSel===0) return
                const items = seleccionadas.map(s=> ({
                  productoId: s.id,
                  cantidad: s.qty,
                  precioCents: precioLinea(carrito[s.id]),
                  removidos: carrito[s.id].removidos,
                  extras: carrito[s.id].extras,
                  extrasCents: ((carrito[s.id].extras||[]).reduce((sum, name)=> sum + (((carrito[s.id].producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)),
                  notas: (carrito[s.id].nota||'').trim() || undefined,
                }))
                const res = await fetch('/api/pedidos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tipo,
                    mesaId,
                    items,
                    impuestoCents: impuestoSel,
                    descuentoCents: descuentoSelCents,
                    pago: { metodo: metodoSel, montoCents: totalSel },
                  })
                })
                if (res.ok) {
                  const data = await res.json()
                  // Descontar cantidades cobradas del carrito
                  setCarrito(prev=>{
                    const next = { ...prev }
                    for (const s of seleccionadas) {
                      const l = next[s.id]
                      if (!l) continue
                      const rem = l.cantidad - s.qty
                      if (rem <= 0) delete next[s.id]
                      else next[s.id] = { ...l, cantidad: rem }
                    }
                    return next
                  })
                  // Limpiar selección
                  setSel({})
                  setDescSelValor('')
                  setEntregadoSel('')
                  setCobrandoSel(false)
                  if (data?.pedidoId) window.open(`/ticket/${data.pedidoId}`, '_blank')
                } else {
                  alert('Error al cobrar seleccionados')
                }
              }}>Confirmar cobro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
