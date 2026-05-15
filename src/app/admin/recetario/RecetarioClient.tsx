"use client"
import { useState, useEffect } from 'react'
import { Search, ChevronRight, Plus, Trash2, Save, ChefHat, PackageCheck } from 'lucide-react'
import { useToast } from '@/components/ui/Providers'

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
    <div className="flex flex-col lg:flex-row gap-6 min-h-[70vh]">
      {/* Sidebar Productos */}
      <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {productosFiltrados.map(p => (
            <button
              key={p.id}
              onClick={() => loadReceta(p)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                seleccionado?.id === p.id 
                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {p.requiereCocina ? <ChefHat className="w-4 h-4 text-amber-500" /> : <PackageCheck className="w-4 h-4 text-emerald-500" />}
                <span>{p.nombre}</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${seleccionado?.id === p.id ? 'text-indigo-400' : 'text-slate-300'}`} />
            </button>
          ))}
          {productosFiltrados.length === 0 && (
            <p className="text-center p-4 text-slate-500">No se encontraron productos.</p>
          )}
        </div>
      </div>

      {/* Main Receta */}
      <div className="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
        {seleccionado ? (
          cargando ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{seleccionado.nombre}</h2>
                  <p className="text-slate-500">Configura cuándo y qué descontar.</p>
                </div>
                <button onClick={saveReceta} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl shadow hover:bg-indigo-700 font-bold flex items-center gap-2 transition-transform active:scale-95">
                  <Save className="w-5 h-5" /> Guardar Cambios
                </button>
              </div>

              {/* Ajuste de Estrategia */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <h3 className="font-bold text-slate-800 mb-3">Estrategia de Descuento (Cuándo descontar)</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className={`flex-1 flex p-4 rounded-xl cursor-pointer border-2 transition-all ${requiereCocina ? 'bg-white border-amber-500 shadow-md' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                    <input type="radio" name="req" className="hidden" checked={requiereCocina} onChange={()=>setRequiereCocina(true)} />
                    <div>
                      <div className="font-bold text-amber-600 flex items-center gap-2"><ChefHat className="w-5 h-5"/> Requiere Cocina</div>
                      <p className="text-sm mt-1">Se descuenta cuando el cocinero lo marca como LISTO en el KDS.</p>
                    </div>
                  </label>
                  <label className={`flex-1 flex p-4 rounded-xl cursor-pointer border-2 transition-all ${!requiereCocina ? 'bg-white border-emerald-500 shadow-md' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                    <input type="radio" name="req" className="hidden" checked={!requiereCocina} onChange={()=>setRequiereCocina(false)} />
                    <div>
                      <div className="font-bold text-emerald-600 flex items-center gap-2"><PackageCheck className="w-5 h-5"/> Producto Directo</div>
                      <p className="text-sm mt-1">Se descuenta automáticamente al pagar la orden (Ej. Bebidas).</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Agregar Insumo */}
              <h3 className="font-bold text-slate-800 mb-3">Ingredientes a descontar (Qué descontar)</h3>
              <div className="flex gap-3 mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <select 
                  className="flex-1 border-2 border-white bg-white rounded-lg p-2.5 outline-none focus:border-indigo-500 font-medium text-slate-700"
                  value={insumoSel} onChange={e=>setInsumoSel(e.target.value)}
                >
                  <option value="">Selecciona un insumo...</option>
                  {insumosRaw.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre} ({i.unidadMedida})</option>
                  ))}
                </select>
                <input 
                  type="number" step="0.01" min="0.01"
                  placeholder="Cant..." 
                  className="w-24 border-2 border-white bg-white rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono text-center font-bold"
                  value={cantidadSel} onChange={e=>setCantidadSel(e.target.value)}
                />
                <button onClick={addInsumo} disabled={!insumoSel || !cantidadSel} className="bg-indigo-600 disabled:bg-indigo-300 text-white p-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Lista Receta */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                {receta.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400">
                    <ChefHat className="w-12 h-12 mb-3 opacity-20" />
                    <p>Este producto no tiene insumos configurados.</p>
                    <p className="text-sm">Si se vende, no descontará nada del inventario.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 uppercase">
                        <th className="p-3">Insumo</th>
                        <th className="p-3">Porción Requerida</th>
                        <th className="p-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receta.map(r => (
                        <tr key={r.insumoId} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-700">{r.insumo?.nombre || 'Desconocido'}</td>
                          <td className="p-3 font-mono text-indigo-700 bg-indigo-50 w-max rounded-md font-bold px-3 py-1 my-2 inline-block">
                            {r.cantidadRequerida} {r.insumo?.unidadMedida}
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={()=>removeInsumo(r.insumoId)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <PackageCheck className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-slate-600 mb-2">Selecciona un producto</h3>
            <p>Elige un producto de la lista izquierda para configurar sus ingredientes y regla de descuento.</p>
          </div>
        )}
      </div>
    </div>
  )
}
