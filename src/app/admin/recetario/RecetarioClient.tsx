"use client"
import { useState, useEffect } from 'react'
import { Search, ChevronRight, Plus, Trash2, Save, ChefHat, PackageCheck, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Providers'
import { motion, AnimatePresence } from 'framer-motion'

type ProductoLight = { id: number; nombre: string; requiereCocina: boolean }
type InsumoLight = { id: number; nombre: string; unidadMedida: string }
type RecetaItem = { id?: number; insumoId: number; cantidadRequerida: number; insumo?: InsumoLight }

export default function RecetarioClient({ productosRaw, insumosRaw }: { productosRaw: ProductoLight[], insumosRaw: InsumoLight[] }) {
  const [productos, setProductos] = useState<ProductoLight[]>(productosRaw)
  const [seleccionado, setSeleccionado] = useState<ProductoLight | null>(null)
  
  const [receta, setReceta] = useState<RecetaItem[]>([])
  const [requiereCocina, setRequiereCocina] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  
  // Agregar insumo
  const [insumoSel, setInsumoSel] = useState<number | ''>('')
  const [cantidadSel, setCantidadSel] = useState<string>('')

  const { push } = useToast()

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const loadReceta = async (prod: ProductoLight) => {
    setSeleccionado(prod)
    setRequiereCocina(prod.requiereCocina)
    setCargando(true)
    try {
      const res = await fetch(`/api/recetario/${prod.id}`)
      if (res.ok) {
        setReceta(await res.json())
      }
    } finally {
      setCargando(false)
    }
  }

  const addInsumo = () => {
    if (!insumoSel || !cantidadSel || Number(cantidadSel) <= 0) return
    const id = Number(insumoSel)
    if (receta.find(r => r.insumoId === id)) {
      push('Este insumo ya está en la receta', 'error')
      return
    }
    const fullInsumo = insumosRaw.find(i => i.id === id)
    setReceta([...receta, { insumoId: id, cantidadRequerida: Number(cantidadSel), insumo: fullInsumo }])
    setInsumoSel('')
    setCantidadSel('')
  }

  const removeInsumo = (insumoId: number) => {
    setReceta(receta.filter(r => r.insumoId !== insumoId))
  }

  const saveReceta = async () => {
    if (!seleccionado) return
    const res = await fetch(`/api/recetario/${seleccionado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requiereCocina,
        items: receta.map(r => ({ insumoId: r.insumoId, cantidadRequerida: r.cantidadRequerida }))
      })
    })
    
    if (res.ok) {
      push('Receta guardada exitosamente', 'success')
      // Update local state
      setProductos(productos.map(p => p.id === seleccionado.id ? { ...p, requiereCocina } : p))
      setSeleccionado({ ...seleccionado, requiereCocina })
    } else {
      push('Error al guardar receta', 'error')
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[75vh]">
      {/* Sidebar Productos */}
      <div className="w-full lg:w-1/3 bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-white/50">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar producto en el menú..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-100/50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          <AnimatePresence>
            {productosFiltrados.map((p, i) => (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                key={p.id}
                onClick={() => loadReceta(p)}
                className={`w-full group flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-300 ${
                  seleccionado?.id === p.id 
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl flex items-center justify-center transition-colors ${seleccionado?.id === p.id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                    {p.requiereCocina ? <ChefHat className={`w-4 h-4 ${seleccionado?.id === p.id ? 'text-white' : 'text-amber-500'}`} /> : <PackageCheck className={`w-4 h-4 ${seleccionado?.id === p.id ? 'text-white' : 'text-emerald-500'}`} />}
                  </div>
                  <span className="font-bold">{p.nombre}</span>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${seleccionado?.id === p.id ? 'text-white/70 translate-x-1' : 'text-slate-300 group-hover:text-slate-400 group-hover:translate-x-1'}`} />
              </motion.button>
            ))}
          </AnimatePresence>
          {productosFiltrados.length === 0 && (
            <div className="text-center p-8 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No se encontraron productos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Receta */}
      <div className="w-full lg:w-2/3 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 flex flex-col relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        {seleccionado ? (
          cargando ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-medium animate-pulse">Cargando receta...</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col h-full relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-5 mb-6 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">{seleccionado.nombre}</h2>
                  <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-400" /> Configura la lógica de deducción de inventario.
                  </p>
                </div>
                <button onClick={saveReceta} className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-8 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Save className="w-5 h-5" /> Guardar Cambios
                </button>
              </div>

              {/* Ajuste de Estrategia */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Estrategia de Descuento</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className={`flex-1 relative overflow-hidden flex p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 ${requiereCocina ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400 shadow-md scale-[1.02]' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                    {requiereCocina && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />}
                    <input type="radio" name="req" className="hidden" checked={requiereCocina} onChange={()=>setRequiereCocina(true)} />
                    <div className="relative z-10">
                      <div className={`font-black text-lg flex items-center gap-3 mb-1 ${requiereCocina ? 'text-amber-700' : 'text-slate-600'}`}>
                        <div className={`p-2 rounded-xl ${requiereCocina ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                          <ChefHat className="w-6 h-6"/>
                        </div>
                        Requiere Cocina
                      </div>
                      <p className={`text-sm leading-relaxed ${requiereCocina ? 'text-amber-700/80' : 'text-slate-500'}`}>Se descuenta cuando el cocinero marca la orden como <span className="font-bold">LISTA</span> en la pantalla del KDS.</p>
                    </div>
                  </label>

                  <label className={`flex-1 relative overflow-hidden flex p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 ${!requiereCocina ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 shadow-md scale-[1.02]' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                    {!requiereCocina && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />}
                    <input type="radio" name="req" className="hidden" checked={!requiereCocina} onChange={()=>setRequiereCocina(false)} />
                    <div className="relative z-10">
                      <div className={`font-black text-lg flex items-center gap-3 mb-1 ${!requiereCocina ? 'text-emerald-700' : 'text-slate-600'}`}>
                        <div className={`p-2 rounded-xl ${!requiereCocina ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          <PackageCheck className="w-6 h-6"/>
                        </div>
                        Producto Directo
                      </div>
                      <p className={`text-sm leading-relaxed ${!requiereCocina ? 'text-emerald-700/80' : 'text-slate-500'}`}>Se descuenta <span className="font-bold">automáticamente</span> del inventario en el instante en que el cajero procesa el pago.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Lista Receta */}
              <div className="flex-1 flex flex-col min-h-[300px]">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ingredientes de la Receta</h3>
                
                <div className="flex flex-col sm:flex-row gap-3 mb-6 p-2 bg-slate-100/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-inner">
                  <select 
                    className="flex-1 border-none bg-white rounded-xl p-4 outline-none shadow-sm text-slate-700 font-bold cursor-pointer"
                    value={insumoSel} onChange={e=>setInsumoSel(e.target.value)}
                  >
                    <option value="" disabled>Selecciona un insumo para agregar...</option>
                    {insumosRaw.map(i => (
                      <option key={i.id} value={i.id}>{i.nombre} ({i.unidadMedida})</option>
                    ))}
                  </select>
                  <div className="flex gap-3">
                    <input 
                      type="number" step="0.01" min="0.01"
                      placeholder="Cantidad" 
                      className="w-32 border-none bg-white rounded-xl p-4 outline-none shadow-sm font-mono font-bold text-center text-indigo-700 placeholder:text-slate-400"
                      value={cantidadSel} onChange={e=>setCantidadSel(e.target.value)}
                    />
                    <button onClick={addInsumo} disabled={!insumoSel || !cantidadSel} className="bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl hover:bg-black transition-colors shadow-sm flex items-center justify-center group">
                      <Plus className="w-6 h-6 group-hover:scale-125 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {receta.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                      <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                        <ChefHat className="w-16 h-16 text-slate-300" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-600 mb-2">Receta Vacía</h4>
                      <p className="text-slate-500 max-w-sm">No hay insumos vinculados. Cuando se venda este producto, no se descontará nada del inventario físico.</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {receta.map(r => (
                          <motion.div 
                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            key={r.insumoId} 
                            className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black">
                                {r.insumo?.nombre.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-lg">{r.insumo?.nombre || 'Desconocido'}</div>
                                <div className="text-sm text-slate-500 font-medium">Inventario Actual</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Porción</div>
                                <div className="font-mono text-lg text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg font-black px-4 py-1.5 shadow-inner">
                                  {r.cantidadRequerida} <span className="text-sm text-indigo-400">{r.insumo?.unidadMedida}</span>
                                </div>
                              </div>
                              <button onClick={()=>removeInsumo(r.insumoId)} className="p-3 text-slate-300 hover:text-white hover:bg-rose-500 rounded-xl transition-all shadow-sm opacity-50 group-hover:opacity-100">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50 rounded-3xl">
            <div className="bg-white p-8 rounded-full shadow-sm mb-6 relative">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping" />
              <PackageCheck className="w-20 h-20 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-600 mb-3">Selecciona un producto</h3>
            <p className="max-w-md text-lg leading-relaxed">Elige un platillo o bebida de la lista a la izquierda para definir su receta y configurar la regla de descuento de inventario.</p>
          </div>
        )}
      </div>
    </div>
  )
}
