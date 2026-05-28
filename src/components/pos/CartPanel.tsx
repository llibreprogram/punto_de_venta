/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { useState, useMemo } from 'react'
import { usePosStore, Linea } from '@/store/posStore'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import { Trash2, Plus, Minus, Settings2, ReceiptText, ShoppingBag, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CartPanelProps {
  ajustes: any
  ivaPct: number
  propinaPct: number
  onCobrar: (descuento: number) => void
  onCobrarSel: (sel: Record<number, number>, descuentoSel: number) => void
  guardarAbierta: (descuento: number, printPrecuenta?: boolean) => void
}

export function CartPanel({ ajustes, ivaPct, propinaPct, onCobrar, onCobrarSel, guardarAbierta }: CartPanelProps) {
  const { carrito, tipo, mesaId, editingPedidoId, vaciarCarrito, actualizarLinea, quitarProducto, agregarProducto, eliminarProducto } = usePosStore()
  
  const [customOpen, setCustomOpen] = useState<Record<number, boolean>>({})
  const [sel, setSel] = useState<Record<number, number>>({})
  const [descTipo, setDescTipo] = useState<'monto'|'pct'>('monto')
  const [descValor, setDescValor] = useState('')

  const fmtCurrency = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  // Descuentos locales
  const subtotalCart = useMemo(() => {
    return Object.values(carrito).reduce((acc, l) => {
      const base = l.producto.precioCents
      const extraSum = (l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)
      return acc + (base + extraSum) * l.cantidad
    }, 0)
  }, [carrito])

  const descuentoCents = useMemo(() => {
    const v = Number(String(descValor).replace(/[^0-9.]/g,''))
    if (!isFinite(v) || v<=0) return 0
    if (descTipo==='pct') return Math.max(0, Math.min(subtotalCart, Math.round(subtotalCart * (v/100))))
    return Math.max(0, Math.min(subtotalCart, Math.round(v*100)))
  }, [descValor, descTipo, subtotalCart])

  const getTotales = usePosStore(state => state.getTotales)
  const storeTotales = getTotales(ivaPct, propinaPct, descuentoCents)

  // Funciones de Selección para Dividir Cuenta
  const seleccionadas = useMemo(()=> Object.entries(sel).filter(([id, q])=>{
    const l = carrito[Number(id)]?.cantidad || 0
    return (q||0) > 0 && l > 0
  }).map(([id, q])=>({ id: Number(id), qty: Math.min(q, carrito[Number(id)]?.cantidad || 0) })), [sel, carrito])
  
  const subtotalSel = useMemo(()=> seleccionadas.reduce((acc, s)=> {
    const l = carrito[s.id]
    if (!l) return acc
    const base = l.producto.precioCents
    const extraSum = (l.extras||[]).reduce((sum, name)=> sum + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)
    return acc + (base + extraSum) * s.qty
  }, 0), [seleccionadas, carrito])

  const handleVaciar = async () => {
    const msg = editingPedidoId ? '¿Estás seguro de ELIMINAR esta orden guardada completamente?' : '¿Estás seguro de vaciar la orden actual?'
    if (confirm(msg)) {
      if (editingPedidoId) {
        try {
          const res = await fetch(`/api/pedidos/${editingPedidoId}`, { method: 'DELETE' })
          if (!res.ok) {
            const err = await res.json()
            alert(err.error || 'Error al eliminar')
            return
          }
        } catch {
          alert('Error de red al eliminar')
          return
        }
      }
      vaciarCarrito()
      setSel({})
      setDescValor('')
      window.dispatchEvent(new CustomEvent('reload-orders')) // Forzar recarga si es necesario
      if (editingPedidoId) window.location.href = '/pos' // Recargar UI limpio
    }
  }

  const itemsArray = Object.values(carrito)
  const totalItems = itemsArray.reduce((acc, l) => acc + l.cantidad, 0)

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-sm border-l border-slate-200/50">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200/60 flex items-center justify-between bg-white/90 backdrop-blur-md">
        <h2 className="font-bold flex items-center gap-2 text-slate-800">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <ReceiptText className="w-4 h-4" />
          </div>
          Orden Actual
        </h2>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
        </span>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {itemsArray.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
            <ShoppingBag className="w-16 h-16 opacity-30" strokeWidth={1} />
            <p className="text-sm font-medium text-slate-400">Agrega productos para comenzar</p>
          </div>
        ) : (
          <div className="grid gap-2">
            <AnimatePresence>
              {itemsArray.map(l => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  key={l.producto.id} 
                  className="bg-white border border-slate-200/70 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 leading-tight text-[13px]">{l.producto.nombre}</div>
                      <div className="text-orange-600 font-bold text-sm mt-0.5">
                        {fmtCurrency(l.producto.precioCents + (l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0))}
                      </div>
                      
                      {/* Opciones activas (visual) */}
                      {(l.removidos?.length || l.extras?.length || l.nota) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {l.removidos?.map(r => <span key={r} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md border border-red-100 line-through font-medium">Sin {r}</span>)}
                          {l.extras?.map(e => <span key={e} className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-100 font-medium">+{e}</span>)}
                          {l.nota && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100 italic font-medium">📝 {l.nota}</span>}
                        </div>
                      )}
                      
                      <button 
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 mt-2 transition-colors"
                        onClick={() => setCustomOpen(p => ({ ...p, [l.producto.id]: !p[l.producto.id] }))}
                      >
                        <Settings2 className="w-3 h-3" /> {customOpen[l.producto.id] ? 'Ocultar opciones' : 'Personalizar'}
                      </button>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-sm">
                        {fmtCurrency((l.producto.precioCents + (l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)) * l.cantidad)}
                      </div>
                      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-red-50 hover:text-red-600 text-slate-600 transition-all active:scale-90" onClick={() => quitarProducto(l.producto.id)}>
                          {l.cantidad === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="w-7 text-center font-bold text-sm">{l.cantidad}</span>
                        <button className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 transition-all active:scale-90" onClick={() => agregarProducto(l.producto)}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Personalización Expandible */}
                  <AnimatePresence>
                    {customOpen[l.producto.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t border-slate-100 space-y-3">
                          {!!l.producto.ingredientes?.length && (
                            <div>
                              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ingredientes (Desmarca para quitar)</div>
                              <div className="flex flex-wrap gap-2">
                                {l.producto.ingredientes.map(ing => {
                                  const quitado = (l.removidos || []).includes(ing)
                                  return (
                                    <label key={ing} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border cursor-pointer transition-all ${quitado ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-white border-orange-200 text-slate-800 shadow-sm'}`}>
                                      <input type="checkbox" className="hidden" checked={!quitado} onChange={(e) => {
                                        const on = e.target.checked
                                        const set = new Set(l.removidos || [])
                                        if (!on) set.add(ing); else set.delete(ing)
                                        actualizarLinea(l.producto.id, { removidos: Array.from(set) })
                                      }} />
                                      {ing}
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {!!l.producto.extras?.length && (
                            <div>
                              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Extras Añadidos</div>
                              <div className="flex flex-wrap gap-2">
                                {l.producto.extras.map(ex => {
                                  const tiene = (l.extras || []).includes(ex.nombre)
                                  return (
                                    <label key={ex.nombre} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border cursor-pointer transition-all ${tiene ? 'bg-orange-50 border-orange-300 text-orange-800 shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}>
                                      <input type="checkbox" className="hidden" checked={tiene} onChange={(e) => {
                                        const on = e.target.checked
                                        const set = new Set(l.extras || [])
                                        if (on) set.add(ex.nombre); else set.delete(ex.nombre)
                                        actualizarLinea(l.producto.id, { extras: Array.from(set) })
                                      }} />
                                      {ex.nombre} (+{fmtCurrency(ex.precioCents)})
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nota Especial</div>
                            <input 
                              type="text" 
                              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                              placeholder="Ej. Término medio, para llevar..."
                              value={l.nota || ''}
                              onChange={(e) => actualizarLinea(l.producto.id, { nota: e.target.value })}
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <label className="text-xs flex items-center gap-1.5 text-slate-600 font-medium">
                              <input type="checkbox" checked={!!sel[l.producto.id]} onChange={e => {
                                setSel(prev => {
                                  const next = { ...prev }
                                  if (e.target.checked) next[l.producto.id] = l.cantidad
                                  else delete next[l.producto.id]
                                  return next
                                })
                              }} className="rounded text-orange-600 focus:ring-orange-500" />
                              Seleccionar para dividir cuenta
                            </label>
                            {sel[l.producto.id] !== undefined && (
                              <input 
                                type="number" 
                                min={1} max={l.cantidad}
                                value={Math.min(sel[l.producto.id] || 1, l.cantidad)}
                                onChange={e => setSel(prev => ({ ...prev, [l.producto.id]: Math.max(1, Math.min(l.cantidad, Number(e.target.value)||1)) }))}
                                className="w-12 text-center text-xs p-1 border border-slate-300 rounded-lg ml-auto"
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Totals Panel */}
      <div className="border-t border-slate-200/60 p-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-10 flex-shrink-0" style={{ background: 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,.95))' }}>
        <div className="space-y-1.5 text-sm mb-3">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal</span>
            <span>{fmtCurrency(storeTotales.subtotal)}</span>
          </div>
          
          {/* Descuento interactivo */}
          <div className="flex justify-between items-center text-slate-500 font-medium">
            <span>Descuento</span>
            <div className="flex items-center gap-1">
              <select className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer p-0 pr-4 font-semibold" value={descTipo} onChange={e=>setDescTipo(e.target.value as 'monto'|'pct')}>
                <option value="monto">$</option>
                <option value="pct">%</option>
              </select>
              <input 
                className="w-16 text-right text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-orange-500 outline-none transition-all" 
                placeholder="0" 
                value={descValor} 
                onChange={e=>setDescValor(e.target.value)} 
              />
              <span className="w-16 text-right ml-2 font-semibold">{descuentoCents ? `-${fmtCurrency(descuentoCents)}`: '$0.00'}</span>
            </div>
          </div>

          {ivaPct > 0 && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>ITBIS ({ivaPct}%)</span>
              <span>{fmtCurrency(storeTotales.itebis)}</span>
            </div>
          )}
          {propinaPct > 0 && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Propina ({propinaPct}%)</span>
              <span>{fmtCurrency(storeTotales.propina)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-lg text-slate-900 pt-2 border-t border-slate-200/60">
            <span>Total</span>
            <span className="text-orange-600">{fmtCurrency(storeTotales.total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button 
            onClick={handleVaciar} 
            disabled={itemsArray.length === 0 && !editingPedidoId} 
            className="col-span-1 flex items-center justify-center py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 disabled:opacity-40 transition-all text-sm border border-red-100"
            title={editingPedidoId ? 'Eliminar orden' : 'Vaciar carrito'}
          >
            {editingPedidoId ? <Trash2 className="w-4 h-4"/> : <Trash2 className="w-4 h-4"/>}
          </button>
          <button 
            onClick={() => guardarAbierta(descuentoCents, false)} 
            disabled={itemsArray.length === 0 || (tipo === 'Mesa' && !mesaId)} 
            title={tipo === 'Mesa' && !mesaId ? 'Selecciona una mesa' : 'Guardar en la mesa sin imprimir'} 
            className="col-span-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 disabled:opacity-40 transition-all text-sm border border-slate-200"
          >
            Guardar
          </button>
          <button 
            onClick={() => guardarAbierta(descuentoCents, true)} 
            disabled={itemsArray.length === 0 || (tipo === 'Mesa' && !mesaId)} 
            title={tipo === 'Mesa' && !mesaId ? 'Selecciona una mesa' : 'Imprimir recibo para el cliente'} 
            className="col-span-2 py-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 disabled:opacity-40 transition-all text-sm border border-amber-200"
          >
            <Printer className="w-4 h-4" /> Pre-cuenta
          </button>
          <button 
            onClick={() => onCobrar(descuentoCents)} 
            disabled={itemsArray.length === 0} 
            className="col-span-4 py-2.5 rounded-xl text-white font-bold disabled:opacity-40 shadow-lg transition-all active:scale-[.97] text-sm mt-1"
            style={{ background: 'var(--gradient-brand)', boxShadow: '0 4px 12px rgba(234,88,12,.25)' }}
          >
            Cobrar (Elegir Pago)
          </button>
        </div>
        
        {/* Dividir Cuenta */}
        <AnimatePresence>
          {seleccionadas.length > 0 && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              onClick={() => onCobrarSel(sel, 0)}
              className="mt-2 w-full py-2.5 bg-slate-900 text-white font-semibold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-[.98] text-sm"
            >
              Cobrar {seleccionadas.length} seleccionados ({fmtCurrency(subtotalSel)})
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
