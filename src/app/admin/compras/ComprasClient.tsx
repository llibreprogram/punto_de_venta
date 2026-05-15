"use client"
import { useState, useEffect } from 'react'
import { Plus, Brain, CheckCircle, Clock, XCircle, ChevronRight, PackageCheck, Truck, Receipt, Calendar, AlertTriangle, Building2 } from 'lucide-react'
import { useToast } from '@/components/ui/Providers'
import { toCurrency } from '@/lib/money'
import { motion, AnimatePresence } from 'framer-motion'
import type { SugerenciaCompra } from '@/lib/inventoryPredictor'

type OrdenCompra = {
  id: number
  estado: string
  totalCents: number
  proveedor: { nombre: string }
  fechaEsperada: string | null
  createdAt: string
  items: any[]
}

export default function ComprasClient() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [sugerencias, setSugerencias] = useState<SugerenciaCompra[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoIA, setCargandoIA] = useState(false)
  const [vista, setVista] = useState<'HISTORIAL' | 'SUGERENCIAS'>('HISTORIAL')
  const { push } = useToast()

  const load = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/compras')
      if (res.ok) setOrdenes(await res.json())
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { load() }, [])

  const correrMotorIA = async () => {
    setCargandoIA(true)
    setVista('SUGERENCIAS')
    try {
      const res = await fetch('/api/compras/sugerencias')
      if (res.ok) {
        const data = await res.json()
        setSugerencias(data)
        if (data.length === 0) push('Tu inventario está en niveles óptimos', 'success')
      }
    } finally {
      setCargandoIA(false)
    }
  }

  const crearOrdenDesdeSugerencias = async (proveedorId: number) => {
    const items = sugerencias.filter(s => s.proveedorId === proveedorId)
    if (items.length === 0) return

    const res = await fetch('/api/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proveedorId,
        items: items.map(i => ({
          insumoId: i.insumoId,
          cantidadPedida: i.cantidadSugerida,
          costoUnitarioCents: i.costoCents
        }))
      })
    })

    if (res.ok) {
      push('Orden de compra borrador generada', 'success')
      setSugerencias(sugerencias.filter(s => s.proveedorId !== proveedorId))
      load()
    } else push('Error al crear orden', 'error')
  }

  const cambiarEstado = async (id: number, estado: string) => {
    const res = await fetch(`/api/compras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    })
    if (res.ok) {
      push('Estado actualizado', 'success')
      load()
    } else push('Error al actualizar', 'error')
  }

  const recibirMercancia = async (id: number) => {
    if (!confirm('¿Seguro que recibiste esta mercancía? Esto aumentará tu stock en el inventario real.')) return
    const res = await fetch(`/api/compras/${id}/recibir`, { method: 'POST' })
    if (res.ok) {
      push('Mercancía recibida e inventario actualizado', 'success')
      load()
    } else push('Error al recibir mercancía', 'error')
  }

  const proveedoresConSugerencias = Array.from(new Set(sugerencias.map(s => s.proveedorId)))

  return (
    <div className="relative min-h-[75vh]">
      {/* Decorative background element */}
      {vista === 'SUGERENCIAS' && (
        <div className="fixed top-20 right-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      )}

      <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl w-max mb-8 border border-slate-200/50 shadow-sm">
        <button onClick={()=>setVista('HISTORIAL')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 ${vista==='HISTORIAL' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
          <Receipt className="w-5 h-5" /> Historial de Órdenes
        </button>
        <button onClick={correrMotorIA} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 ${vista==='SUGERENCIAS' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
          <Brain className={`w-5 h-5 ${vista==='SUGERENCIAS' ? 'animate-pulse' : ''}`} /> Motor Predictivo JIT
        </button>
      </div>

      <AnimatePresence mode="wait">
        {vista === 'HISTORIAL' ? (
          <motion.div key="historial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-200/60 overflow-hidden">
              {cargando ? (
                <div className="flex justify-center p-20"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-sm text-slate-500 uppercase tracking-wider font-bold">
                        <th className="p-5">Orden #</th>
                        <th className="p-5">Proveedor</th>
                        <th className="p-5">Fecha</th>
                        <th className="p-5">Total</th>
                        <th className="p-5">Estado</th>
                        <th className="p-5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      <AnimatePresence>
                        {ordenes.map(o => (
                          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={o.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="p-5 font-mono font-black text-indigo-900/80">OC-{o.id.toString().padStart(4,'0')}</td>
                            <td className="p-5">
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" /> {o.proveedor.nombre}
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="flex items-center gap-2 text-slate-600 font-medium">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(o.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-5 font-black text-slate-700 text-lg">{toCurrency(o.totalCents)}</td>
                            <td className="p-5">
                              <span className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg border flex w-max items-center gap-1.5 ${
                                o.estado === 'BORRADOR' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                                o.estado === 'ENVIADA' ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100' :
                                o.estado === 'RECIBIDA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {o.estado === 'RECIBIDA' && <CheckCircle className="w-3.5 h-3.5" />}
                                {o.estado === 'ENVIADA' && <Truck className="w-3.5 h-3.5" />}
                                {o.estado}
                              </span>
                            </td>
                            <td className="p-5 flex items-center justify-end gap-3">
                              {o.estado === 'BORRADOR' && (
                                <button onClick={()=>cambiarEstado(o.id, 'ENVIADA')} className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white font-bold transition-all shadow-sm">
                                  Marcar Enviada
                                </button>
                              )}
                              {o.estado === 'ENVIADA' && (
                                <button onClick={()=>recibirMercancia(o.id)} className="flex items-center gap-2 text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl hover:opacity-90 font-bold shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 transition-all">
                                  <PackageCheck className="w-4 h-4" /> Recibir Stock
                                </button>
                              )}
                              {o.estado === 'BORRADOR' && (
                                <button onClick={()=>cambiarEstado(o.id, 'CANCELADA')} className="p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"><XCircle className="w-5 h-5"/></button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {ordenes.length === 0 && (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-500">
                          <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          No hay órdenes de compra registradas. Usa el motor JIT para generar compras inteligentes.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="sugerencias" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            {cargandoIA ? (
              <div className="bg-white/80 backdrop-blur-xl p-20 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-200/60 flex flex-col items-center justify-center text-slate-500">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                  <Brain className="w-20 h-20 text-emerald-500 relative z-10 animate-bounce" />
                </div>
                <p className="font-black text-2xl text-slate-800 mb-2">Procesando Inteligencia Logística</p>
                <p className="text-lg">Cruzando velocidad de consumo con fechas de caducidad...</p>
              </div>
            ) : sugerencias.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-xl p-20 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-200/60 flex flex-col items-center justify-center text-emerald-600 text-center">
                <CheckCircle className="w-24 h-24 mb-6 opacity-80 drop-shadow-md" />
                <h2 className="text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">¡Inventario Perfecto!</h2>
                <p className="text-slate-600 text-lg max-w-lg">El motor predictivo indica que tu inventario está en niveles óptimos de salud. No hay productos críticos ni riesgo de mermas.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 p-6 rounded-3xl border border-emerald-200/60 flex flex-col sm:flex-row gap-5 items-start sm:items-center shadow-lg shadow-emerald-100/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="p-4 bg-white/60 rounded-2xl shadow-sm backdrop-blur-sm border border-emerald-100">
                    <Brain className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black mb-1">Análisis JIT Completado Exitosamente</h4>
                    <p className="text-emerald-800/80 font-medium">Se han calculado las órdenes exactas para una <span className="font-bold">cobertura de 7 días</span>, limitadas inteligentemente por la fecha de caducidad de cada producto para garantizar 0% merma.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {proveedoresConSugerencias.map((provId, idx) => {
                    const itemsProv = sugerencias.filter(s => s.proveedorId === provId)
                    const provNombre = itemsProv[0].proveedorNombre
                    const totalCents = itemsProv.reduce((a,b) => a + b.totalEstimadoCents, 0)
                    const isValidProv = provId !== null

                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                        key={provId ?? 'null'} 
                        className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-200/60 overflow-hidden flex flex-col"
                      >
                        <div className="bg-slate-50/80 p-6 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                              <Truck className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-black text-xl text-slate-800">{provNombre}</h3>
                              <p className="text-sm font-bold text-slate-400">{itemsProv.length} artículos requeridos</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-2xl text-slate-800">{toCurrency(totalCents)}</div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Proyectado</p>
                          </div>
                        </div>
                        
                        <div className="p-6 flex-1 bg-white">
                          <div className="space-y-4">
                            {itemsProv.map(s => (
                              <div key={s.insumoId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div>
                                  <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    {s.nombre}
                                    {s.razonSugerencia.includes('caducidad') && <AlertTriangle className="w-4 h-4 text-amber-500" title="Limitado por caducidad" />}
                                  </div>
                                  <div className="text-sm text-slate-500 font-medium mb-3">Stock actual: <span className="font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">{s.stockActual}</span> / Min: {s.stockMinimo}</div>
                                  <div className="text-xs font-medium bg-white border border-slate-200/60 px-3 py-1.5 rounded-lg text-slate-600 inline-block shadow-sm">
                                    <span className="text-indigo-500 mr-1">🤖 AI:</span> {s.razonSugerencia}
                                  </div>
                                </div>
                                <div className="mt-4 sm:mt-0 text-right w-full sm:w-auto bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Comprar</div>
                                  <div className="font-mono text-2xl font-black text-emerald-600">
                                    {s.cantidadSugerida} <span className="text-sm text-slate-400">{s.unidadMedida}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-slate-50/80 p-6 border-t border-slate-100">
                          {isValidProv ? (
                            <button onClick={()=>crearOrdenDesdeSugerencias(provId!)} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-2xl font-black hover:shadow-lg hover:shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 group">
                              Crear Borrador Oficial <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                          ) : (
                            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl font-bold flex items-center gap-3 border border-rose-100">
                              <AlertTriangle className="w-6 h-6 flex-shrink-0"/> Asigna un proveedor a estos insumos en el módulo de Inventario para poder procesar la compra.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
