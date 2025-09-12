"use client"
import { useCallback, useEffect, useState } from 'react'
import { useToast, useConfirm } from '@/components/ui/Providers'
import AdminLayout from '@/components/AdminLayout'
import { toCents, toCurrency, LOCALE, CURRENCY } from '@/lib/money'

type Producto = { id:number; nombre:string; imagenUrl:string|null; precioCents:number; costoCents?:number; categoriaId:number; activo?: boolean; ingredientes?: string[]; extras?: Array<{ nombre:string; precioCents:number }> }
type Categoria = { id:number; nombre:string }

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mostrarPapelera, setMostrarPapelera] = useState(false)
  const [q, setQ] = useState('')
  const [order, setOrder] = useState<'cat_name'|'name'>('cat_name')
  const [showNew, setShowNew] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newPrecio, setNewPrecio] = useState('')
  const [newCosto, setNewCosto] = useState('')
  const [newCategoriaId, setNewCategoriaId] = useState<number|undefined>(undefined)
  const [newFile, setNewFile] = useState<File|null>(null)
  const [newIngredientes, setNewIngredientes] = useState('')
  const [newExtras, setNewExtras] = useState<Array<{nombre:string; precioCents:string}>>([])
  const [ajustes, setAjustes] = useState<{ locale?:string; currency?:string }|null>(null)
  const [editExtras, setEditExtras] = useState<null | { id:number; nombre:string; rows: Array<{nombre:string; precio:string}> }>(null)
  
  // Validación y utilidades de extras
  const titleCase = useCallback((s: string) => {
    const trimmed = (s||'').trim()
    if (!trimmed) return ''
    return trimmed
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }, [])
  const validateRows = useCallback((rows: Array<{nombre:string; precio:string}>) => {
    const dup = new Set<number>()
    const badPrice = new Set<number>()
    const needName = new Set<number>()
    const seen = new Map<string, number>()
    const priceRegex = /^\d*(?:[.,]\d{0,2})?$/
    rows.forEach((r, i) => {
      const nameRaw = (r.nombre||'').trim()
      const name = nameRaw.toLowerCase()
      const precioStr = (r.precio||'').trim()
      if (precioStr && !priceRegex.test(precioStr)) badPrice.add(i)
      if (precioStr && !nameRaw) needName.add(i)
      if (name) {
        if (seen.has(name)) { dup.add(i); dup.add(seen.get(name)!) }
        else seen.set(name, i)
      }
    })
    const hasErrors = dup.size>0 || badPrice.size>0 || needName.size>0
    return { dup, badPrice, needName, hasErrors }
  }, [])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (mostrarPapelera) params.set('all','1')
    if (q.trim()) params.set('q', q.trim())
    if (order) params.set('order', order)
    const [resP, resC, resA] = await Promise.all([
      fetch(`/api/productos?${params.toString()}`),
      fetch('/api/categorias'),
      fetch('/api/ajustes').catch(()=>null as unknown as Response)
    ])
    const data: Producto[] = await resP.json()
    const cats: Categoria[] = await resC.json()
  if (resA) { try { const aj = await resA.json(); setAjustes({ locale: aj?.locale, currency: aj?.currency }) } catch {} }
    // Si estamos en papelera, mostrar solo inactivos; si no, activos (cuando all=0 ya viene filtrado)
    const filtered = mostrarPapelera ? data.filter(p=>p.activo===false) : data.filter(p=>p.activo!==false)
    setProductos(filtered)
    setCategorias(cats)
  }, [mostrarPapelera, q, order])
  useEffect(()=>{ load() }, [load])

  const subir = async (id:number, file: File) => {
    const form = new FormData()
    form.set('file', file)
    const res = await fetch('/api/upload', { method:'POST', body: form })
    const { url } = await res.json()
    await fetch(`/api/producto/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imagenUrl: url }) })
    await load()
  }

  const setUrl = async (id:number, url:string) => {
    await fetch(`/api/producto/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imagenUrl: url }) })
    await load()
  }

  const crear = async () => {
    const nombre = newNombre.trim()
    if (!nombre) return
  const precioCents = toCents(newPrecio || '0')
  const costoCents = toCents(newCosto || '0')
    const categoriaId = newCategoriaId || categorias[0]?.id
    if (!categoriaId) return
  const ingredientes = newIngredientes.split(',').map(s=>s.trim()).filter(Boolean)
  const extras = newExtras.map(e=> ({ nombre: e.nombre.trim(), precioCents: toCents(e.precioCents||'0') })).filter(e=> e.nombre)
  const res = await fetch('/api/productos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre, precioCents, costoCents, categoriaId, ingredientes, extras }) })
    const created: Producto = await res.json()
    if (newFile) {
      const form = new FormData()
      form.set('file', newFile)
      const up = await fetch('/api/upload', { method:'POST', body: form })
      const { url } = await up.json()
      await fetch(`/api/producto/${created.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ imagenUrl: url }) })
    }
    setShowNew(false)
    setNewNombre('')
    setNewPrecio('')
  setNewCategoriaId(undefined)
  setNewCosto('')
  setNewFile(null)
  setNewIngredientes('')
  setNewExtras([])
    await load()
  }
  const { push } = useToast()
  const { confirm } = useConfirm()

  return (
    <AdminLayout
      title="Productos"
      actions={(
        <div className="flex flex-wrap gap-2 items-center">
          <input className="input w-56" placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="input" value={order} onChange={e=>setOrder(e.target.value as 'cat_name'|'name')}>
            <option value="cat_name">Categoría + Nombre</option>
            <option value="name">Nombre</option>
          </select>
          <button onClick={()=>setShowNew(true)} className="btn btn-primary">Nuevo</button>
          <button onClick={()=>setMostrarPapelera(v=>!v)} className="btn">{mostrarPapelera?'Ver activos':'Papelera'}</button>
        </div>
      )}
    >
      <div className="grid gap-3">
        <div className="text-sm muted">Categorías: {categorias.map(c=> `${c.id}:${c.nombre}`).join(' • ')}</div>
        {productos.map(p => (
          <div key={p.id} className="glass-panel rounded-xl p-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imagenUrl || '/placeholder.png'} alt={p.nombre} className="w-20 h-20 object-cover rounded bg-gray-100" />
            <div className="flex-1 grid gap-1">
              <div className="flex items-center gap-2">
                <input className="input" defaultValue={p.nombre} onBlur={async(e)=>{
                  const nombre = e.currentTarget.value.trim(); if (!nombre || nombre===p.nombre) return
                  await fetch(`/api/producto/${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre }) })
                  await load()
                }} />
                <input className="input w-28 text-right" defaultValue={(p.precioCents/100).toFixed(2)} onBlur={async(e)=>{
                  const precioCents = toCents(e.currentTarget.value); if (precioCents===p.precioCents) return
                  await fetch(`/api/producto/${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ precioCents }) })
                  await load()
                }} />
                <input title="Costo" className="input w-28 text-right" defaultValue={((p.costoCents||0)/100).toFixed(2)} onBlur={async(e)=>{
                  const costoCents = toCents(e.currentTarget.value); if (costoCents===(p.costoCents||0)) return
                  await fetch(`/api/producto/${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ costoCents }) })
                  await load()
                }} />
                <span className="text-sm text-gray-600">{toCurrency(p.precioCents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)}</span>
                <span className="text-xs text-gray-500">Margen: {toCurrency(p.precioCents - (p.costoCents||0), ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)}</span>
                <select className="input" value={p.categoriaId} onChange={async(e)=>{
                  const categoriaId = Number(e.currentTarget.value)
                  if (!categoriaId || categoriaId===p.categoriaId) return
                  await fetch(`/api/producto/${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ categoriaId }) })
                  await load()
                }}>
                  {categorias.map(c=> (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                </select>
        {!mostrarPapelera ? (
                  <button
                  className="ml-auto btn text-red-600 border-red-300"
                  onClick={async ()=>{
          const ok = await confirm({ message: `¿Borrar ${p.nombre}?` })
          if (!ok) return
                    await fetch(`/api/producto/${p.id}`, { method:'DELETE' })
                    await load()
                  }}
                >Borrar</button>
                ) : (
                  <div className="ml-auto flex gap-2">
                    <button className="btn" onClick={async ()=>{
                      await fetch(`/api/producto/${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ activo: true }) })
                      await load()
                    }}>Restaurar</button>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600 break-words">{p.imagenUrl}</div>
              <div className="text-xs text-gray-600">
                Ingredientes: {(p.ingredientes||[]).join(', ') || '—'}
              </div>
              <div className="text-xs text-gray-600">
                Extras: {(p.extras||[]).map((e)=> `${e.nombre} (+${toCurrency(e.precioCents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)})`).join(', ') || '—'}
              </div>
              <div className="flex gap-2 items-center text-xs">
                <input
                  className="input flex-1"
                  placeholder="Editar ingredientes (coma)"
                  defaultValue={(p.ingredientes||[]).join(', ')}
                  onBlur={async(e)=>{
                    const ingredientes = e.currentTarget.value.split(',').map(s=>s.trim()).filter(Boolean)
                    await fetch(`/api/producto/${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ingredientes }) })
                    await load()
                  }}
                />
                <button className="btn" onClick={async()=>{
                  const current = (p.ingredientes||[]).join(', ')
                  const raw = prompt('Ingredientes (separados por coma)\nEj: Lechuga, Tomate, Queso', current)
                  if (raw === null) return
                  const ingredientes = raw.split(',').map(s=>s.trim()).filter(Boolean)
                  await fetch(`/api/producto/${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ingredientes }) })
                  await load()
                }}>Editar ingredientes…</button>
                <button className="btn" onClick={()=>{
                  const rows = (p.extras||[]).map(e=> ({ nombre: e.nombre, precio: (e.precioCents/100).toFixed(2) }))
                  setEditExtras({ id: p.id, nombre: p.nombre, rows })
                }}>Editar extras…</button>
              </div>
            </div>
            <label className="text-sm btn cursor-pointer">
              Subir…
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) subir(p.id,f) }} />
            </label>
            <button className="btn" onClick={async ()=>{
              const url = prompt('Pega la URL de la imagen')
              if (url) await setUrl(p.id, url)
            }}>Usar URL</button>
          </div>
        ))}
      </div>

      {editExtras && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl p-4 w-full max-w-lg grid gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Extras de {editExtras.nombre}</h3>
              <button onClick={()=>setEditExtras(null)} className="text-gray-500">✕</button>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span>Ordenar por:</span>
                <select
                  className="input"
                  onChange={e=>{
                    const by = e.target.value as 'nombre'|'precio'
                    setEditExtras(prev=> prev ? {
                      ...prev,
                      rows: [...prev.rows].sort((a,b)=> {
                        if (by==='nombre') return (a.nombre||'').localeCompare(b.nombre||'')
                        // precio
                        const pa = toCents(a.precio||'0'); const pb = toCents(b.precio||'0')
                        return pa - pb
                      })
                    } : prev)
                  }}
                  defaultValue="nombre"
                >
                  <option value="nombre">Nombre</option>
                  <option value="precio">Precio</option>
                </select>
              </div>
              {editExtras.rows.length===0 && <div className="text-sm text-gray-600">Sin extras</div>}
              {editExtras.rows.map((row, idx)=> {
                const v = validateRows(editExtras.rows)
                const isDup = v.dup.has(idx)
                const isBadPrice = v.badPrice.has(idx)
                const isNeedName = v.needName.has(idx)
                return (
        <div key={idx} className="flex items-center gap-2">
                  <input
          className="input flex-1"
                    placeholder="Nombre"
                    value={row.nombre}
                    onChange={e=>{
                      const nombre = e.target.value
                      setEditExtras(prev=> prev ? { ...prev, rows: prev.rows.map((r,i)=> i===idx ? { ...r, nombre } : r) } : prev)
                    }}
                    onBlur={e=>{
                      const nombre = titleCase(e.target.value)
                      setEditExtras(prev=> prev ? { ...prev, rows: prev.rows.map((r,i)=> i===idx ? { ...r, nombre } : r) } : prev)
                    }}
                  />
                  <input
                    className="input w-28 text-right"
                    placeholder="0.00"
                    value={row.precio}
                    onChange={e=>{
                      const precio = e.target.value
                      setEditExtras(prev=> prev ? { ...prev, rows: prev.rows.map((r,i)=> i===idx ? { ...r, precio } : r) } : prev)
                    }}
                  />
                  <button className="btn text-red-600 border-red-300" onClick={()=>{
                    setEditExtras(prev=> prev ? { ...prev, rows: prev.rows.filter((_,i)=> i!==idx) } : prev)
                  }}>Quitar</button>
                  {(isDup || isBadPrice || isNeedName) && (
                    <div className="text-xs text-red-600 ml-2">
                      {isDup && <span>Duplicado. </span>}
                      {isBadPrice && <span>Precio inválido. </span>}
                      {isNeedName && <span>Nombre requerido. </span>}
                    </div>
                  )}
                </div>
              )})}
              <div>
                <button className="btn" onClick={()=> setEditExtras(prev=> prev ? { ...prev, rows: [...prev.rows, { nombre:'', precio:'' }] } : prev)}>
                  + Agregar extra
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn" onClick={()=>setEditExtras(null)}>Cancelar</button>
              {(()=>{ const v = validateRows(editExtras.rows); return (
              <button className="btn btn-primary disabled:opacity-50" disabled={v.hasErrors} onClick={async()=>{
                if (!editExtras) return
                const extras = editExtras.rows
                  .map(r=> ({ nombre: titleCase(r.nombre), precioCents: toCents(r.precio||'0') }))
                  .filter(e=> e.nombre)
                  .sort((a,b)=> a.nombre.localeCompare(b.nombre))
                const res = await fetch(`/api/producto/${editExtras.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ extras }) })
                if (!res.ok) {
                  const j = await res.json().catch(()=>null)
                  push(j?.error || 'No se pudo guardar los extras', 'error')
                  return
                }
                setEditExtras(null)
                await load()
              }}>Guardar</button>
              )})()}
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="glass-panel rounded-xl p-4 w-full max-w-md grid gap-3">
            <h2 className="text-lg font-semibold">Nuevo producto</h2>
            <label className="grid gap-1">
              <span className="text-sm">Nombre</span>
              <input className="input" value={newNombre} onChange={e=>setNewNombre(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Precio</span>
              <input className="input" placeholder="0.00" value={newPrecio} onChange={e=>setNewPrecio(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Costo</span>
              <input className="input" placeholder="0.00" value={newCosto} onChange={e=>setNewCosto(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Categoría</span>
              <select className="input" value={newCategoriaId ?? ''} onChange={e=>setNewCategoriaId(Number(e.target.value))}>
                <option value="" disabled>Selecciona…</option>
                {categorias.map(c=> (<option key={c.id} value={c.id}>{c.nombre}</option>))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Imagen (opcional)</span>
              <input type="file" accept="image/*" onChange={e=>setNewFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Ingredientes (separados por coma)</span>
              <input className="input" placeholder="ej. Lechuga, Tomate, Queso" value={newIngredientes} onChange={e=>setNewIngredientes(e.target.value)} />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn" onClick={()=>{ setShowNew(false); setNewNombre(''); setNewPrecio(''); setNewCosto(''); setNewCategoriaId(undefined); setNewFile(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={crear}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
