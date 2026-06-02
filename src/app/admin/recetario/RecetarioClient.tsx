"use client"
import { useState, useEffect } from 'react'
import { Search, ChevronRight, Plus, Trash2, Save, ChefHat, PackageCheck, AlertCircle, ShoppingCart, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/Providers'
import { motion, AnimatePresence } from 'framer-motion'

type ProductoLight = { id: number; nombre: string; requiereCocina: boolean; costoCents?: number }
type InsumoLight = { id: number; nombre: string; unidadMedida: string; costoCents?: number; stockActual?: number }
type RecetaItem = { id?: number; insumoId: number; cantidadRequerida: number; insumo?: InsumoLight }

const UNIDADES = ['Gramos', 'Kilogramos', 'Litros', 'Mililitros', 'Unidad']

export default function RecetarioClient({ productosRaw, insumosRaw }: { productosRaw: ProductoLight[], insumosRaw: InsumoLight[] }) {
  const [productos, setProductos] = useState<ProductoLight[]>(productosRaw)
  const [insumos, setInsumos] = useState<InsumoLight[]>(insumosRaw)
  const [seleccionado, setSeleccionado] = useState<ProductoLight | null>(null)
  
  const [receta, setReceta] = useState<RecetaItem[]>([])
  const [requiereCocina, setRequiereCocina] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  
  // Agregar insumo existente
  const [insumoSel, setInsumoSel] = useState<number | ''>('')
  const [cantidadSel, setCantidadSel] = useState<string>('')

  // Crear insumo nuevo inline
  const [creandoNuevo, setCreandoNuevo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoUnidad, setNuevoUnidad] = useState('Gramos')
  const [nuevoCantidad, setNuevoCantidad] = useState('')
  const [creandoLoading, setCreandoLoading] = useState(false)

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
    const fullInsumo = insumos.find(i => i.id === id)
    setReceta([...receta, { insumoId: id, cantidadRequerida: Number(cantidadSel), insumo: fullInsumo }])
    setInsumoSel('')
    setCantidadSel('')
  }

  const crearInsumoNuevo = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre || !nuevoCantidad || Number(nuevoCantidad) <= 0) return
    
    // Verificar que no exista ya un insumo con ese nombre
    const existente = insumos.find(i => i.nombre.toLowerCase() === nombre.toLowerCase())
    if (existente) {
      if (receta.find(r => r.insumoId === existente.id)) {
        push('Este ingrediente ya está en la receta', 'error')
        return
      }
      // Ya existe, simplemente agregarlo
      setReceta([...receta, { insumoId: existente.id, cantidadRequerida: Number(nuevoCantidad), insumo: existente }])
      setNuevoNombre('')
      setNuevoCantidad('')
      setCreandoNuevo(false)
      push(`"${existente.nombre}" ya existía en inventario, agregado a la receta`, 'success')
      return
    }

    setCreandoLoading(true)
    try {
      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          unidadMedida: nuevoUnidad,
          stockActual: 0,
          stockMinimo: 0,
          costoCents: 0
        })
      })
      if (res.ok) {
        const nuevoInsumo = await res.json()
        const insumoLight: InsumoLight = {
          id: nuevoInsumo.id,
          nombre: nuevoInsumo.nombre,
          unidadMedida: nuevoInsumo.unidadMedida,
          costoCents: 0,
          stockActual: 0
        }
        setInsumos(prev => [...prev, insumoLight].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setReceta([...receta, { insumoId: insumoLight.id, cantidadRequerida: Number(nuevoCantidad), insumo: insumoLight }])
        setNuevoNombre('')
        setNuevoCantidad('')
        setCreandoNuevo(false)
        push(`Ingrediente "${nombre}" creado y agregado a la receta`, 'success')
      } else {
        const err = await res.json().catch(() => ({ error: 'Error' }))
        push(err.error || 'Error al crear ingrediente', 'error')
      }
    } catch {
      push('Error de conexión al crear ingrediente', 'error')
    } finally {
      setCreandoLoading(false)
    }
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
      const data = await res.json()
      const newCosto = data.newCostoCents !== undefined ? data.newCostoCents : (seleccionado.costoCents || 0)
      push('Receta guardada exitosamente', 'success')
      // Update local state
      setProductos(productos.map(p => p.id === seleccionado.id ? { ...p, requiereCocina, costoCents: newCosto } : p))
      setSeleccionado({ ...seleccionado, requiereCocina, costoCents: newCosto })
    } else {
      push('Error al guardar receta', 'error')
    }
  }

  const updateProductCost = async () => {
    if (!seleccionado) return
    const currentCost = receta.reduce((acc, r) => acc + (r.cantidadRequerida * (r.insumo?.costoCents || 0)), 0)
    const costoCents = Math.round(currentCost)
    const res = await fetch(`/api/producto/${seleccionado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costoCents })
    })
    if (res.ok) {
      push('Costo del producto actualizado', 'success')
      setProductos(productos.map(p => p.id === seleccionado.id ? { ...p, costoCents } : p))
      setSeleccionado({ ...seleccionado, costoCents })
    } else {
      push('Error al actualizar costo', 'error')
    }
  }

  const totalCost = receta.reduce((acc, r) => acc + (r.cantidadRequerida * (r.insumo?.costoCents || 0)), 0)

  // Lista de compra: insumos de la receta que no tienen stock suficiente
  const faltantes = receta.filter(r => {
    const insumo = r.insumo || insumos.find(i => i.id === r.insumoId)
    const stock = insumo?.stockActual ?? 0
    return stock < r.cantidadRequerida
  }).map(r => {
    const insumo = r.insumo || insumos.find(i => i.id === r.insumoId)
    const stock = insumo?.stockActual ?? 0
    const falta = Math.max(0, r.cantidadRequerida - stock)
    return {
      insumoId: r.insumoId,
      nombre: insumo?.nombre || 'Desconocido',
      unidadMedida: insumo?.unidadMedida || '',
      stockActual: stock,
      cantidadRequerida: r.cantidadRequerida,
      cantidadFaltante: falta,
      costoCents: insumo?.costoCents || 0
    }
  })

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[75vh] h-auto lg:h-[calc(100vh-12rem)] lg:max-h-[850px]">
      {/* Sidebar Productos */}
      <div className="w-full lg:w-1/3 bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-[500px] lg:h-full">
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
      <div className="w-full lg:w-2/3 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 flex flex-col relative overflow-hidden h-[600px] lg:h-full">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        {seleccionado ? (
          cargando ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-medium animate-pulse">Cargando receta...</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
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

              {/* Scroll container for form fields */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-6">

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

              {/* Panel de Costos */}
              <div className="mb-8 p-5 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Costo Real de Preparación</h3>
                  <div className="text-3xl font-black">${(totalCost / 100).toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-1">Costo actual del producto: ${( (seleccionado.costoCents || 0) / 100 ).toFixed(2)}</div>
                </div>
                <button onClick={updateProductCost} className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Sincronizar Costo
                </button>
              </div>

              {/* Lista de Compra - Faltantes */}
              {receta.length > 0 && faltantes.length > 0 && (
                <div className="mb-8 p-5 bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border-2 border-rose-200/60 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-rose-100 rounded-xl">
                      <ShoppingCart className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-rose-800 text-lg">Lista de Compra</h3>
                      <p className="text-sm text-rose-600/80 font-medium">
                        {faltantes.length} ingrediente{faltantes.length !== 1 ? 's' : ''} sin stock suficiente — este producto no se podrá facturar hasta que se abastezca.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {faltantes.map(f => (
                      <div key={f.insumoId} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{f.nombre}</div>
                            <div className="text-xs text-slate-500 font-medium">
                              Stock actual: <span className={`font-bold ${f.stockActual === 0 ? 'text-rose-600' : 'text-amber-600'}`}>{f.stockActual}</span> / Necesita: <span className="font-bold text-slate-700">{f.cantidadRequerida}</span> {f.unidadMedida}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-rose-700 bg-rose-100 px-3 py-1.5 rounded-lg">
                            Comprar: {f.cantidadFaltante.toFixed(2)} {f.unidadMedida}
                          </div>
                          {f.costoCents > 0 && (
                            <div className="text-xs text-slate-400 mt-1 font-medium">~${((f.cantidadFaltante * f.costoCents) / 100).toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between">
                    <span className="text-sm font-bold text-rose-700">Costo estimado total de faltantes:</span>
                    <span className="text-lg font-black text-rose-800">${(faltantes.reduce((acc, f) => acc + (f.cantidadFaltante * f.costoCents), 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {receta.length > 0 && faltantes.length === 0 && (
                <div className="mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-800">Stock Completo</div>
                    <div className="text-sm text-emerald-600/80 font-medium">Todos los ingredientes están disponibles — este producto se puede facturar.</div>
                  </div>
                </div>
              )}

              {/* Lista Receta */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ingredientes de la Receta</h3>
                
                {/* Selector: Existente o Nuevo */}
                <div className="mb-6">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setCreandoNuevo(false)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!creandoNuevo ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Ingrediente Existente
                    </button>
                    <button
                      onClick={() => setCreandoNuevo(true)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${creandoNuevo ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Plus className="w-4 h-4" /> Ingrediente Nuevo
                    </button>
                  </div>

                  {!creandoNuevo ? (
                    <div className="flex flex-col sm:flex-row gap-3 p-2 bg-slate-100/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-inner">
                      <select 
                        className="flex-1 border-none bg-white rounded-xl p-4 outline-none shadow-sm text-slate-700 font-bold cursor-pointer"
                        value={insumoSel} onChange={e=>setInsumoSel(e.target.value)}
                      >
                        <option value="" disabled>Selecciona un insumo para agregar...</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre} ({i.unidadMedida}) {(i.stockActual ?? 0) === 0 ? '⚠️ Sin stock' : ''}</option>
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
                  ) : (
                    <div className="p-4 bg-amber-50/80 backdrop-blur-sm rounded-2xl border-2 border-amber-200/60 shadow-inner">
                      <p className="text-xs font-bold text-amber-700 mb-3 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Este ingrediente se creará en el inventario con stock 0 y aparecerá en la Lista de Compra.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text"
                          placeholder="Nombre del ingrediente nuevo..." 
                          className="flex-1 bg-white rounded-xl p-4 outline-none shadow-sm text-slate-700 font-bold border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
                          value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}
                        />
                        <select 
                          className="bg-white rounded-xl p-4 outline-none shadow-sm text-slate-700 font-bold cursor-pointer border border-amber-200"
                          value={nuevoUnidad} onChange={e=>setNuevoUnidad(e.target.value)}
                        >
                          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <div className="flex gap-3">
                          <input 
                            type="number" step="0.01" min="0.01"
                            placeholder="Porción" 
                            className="w-32 bg-white rounded-xl p-4 outline-none shadow-sm font-mono font-bold text-center text-amber-700 placeholder:text-slate-400 border border-amber-200"
                            value={nuevoCantidad} onChange={e=>setNuevoCantidad(e.target.value)}
                          />
                          <button 
                            onClick={crearInsumoNuevo} 
                            disabled={!nuevoNombre.trim() || !nuevoCantidad || creandoLoading} 
                            className="bg-amber-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center group"
                          >
                            {creandoLoading ? (
                              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Plus className="w-6 h-6 group-hover:scale-125 transition-transform" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pr-1">
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
                                <div className="text-sm font-medium">
                                  Stock: <span className={`font-bold ${(r.insumo?.stockActual ?? 0) === 0 ? 'text-rose-500' : (r.insumo?.stockActual ?? 0) < r.cantidadRequerida ? 'text-amber-500' : 'text-emerald-500'}`}>{r.insumo?.stockActual ?? 0} {r.insumo?.unidadMedida}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Porción</div>
                                <div className="font-mono text-lg text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg font-black px-4 py-1.5 shadow-inner">
                                  {r.cantidadRequerida} <span className="text-sm text-indigo-400">{r.insumo?.unidadMedida}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-400 mt-1">${((r.cantidadRequerida * (r.insumo?.costoCents || 0)) / 100).toFixed(2)}</div>
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
              </div> {/* Closes Lista Receta */}
            </div> {/* Closes Scroll Container */}
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
