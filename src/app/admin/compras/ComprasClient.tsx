"use client"
import { useState, useEffect } from 'react'
import { Plus, Brain, CheckCircle, Clock, XCircle, ChevronRight, PackageCheck, Truck } from 'lucide-react'
import { useToast } from '@/components/ui/Providers'
import { toCurrency } from '@/lib/money'
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
      // Quitar de las sugerencias
      setSugerencias(sugerencias.filter(s => s.proveedorId !== proveedorId))
      load() // recargar historial
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

  // Agrupar sugerencias por proveedor
  const proveedoresConSugerencias = Array.from(new Set(sugerencias.map(s => s.proveedorId)))

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <button onClick={()=>setVista('HISTORIAL')} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${vista==='HISTORIAL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
          <Clock className="w-5 h-5" /> Historial de Órdenes
        </button>
        <button onClick={correrMotorIA} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${vista==='SUGERENCIAS' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90'}`}>
          <Brain className="w-5 h-5" /> Motor JIT (Sugerencias)
        </button>
      </div>

      {vista === 'HISTORIAL' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {cargando ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                  <th className="p-4 font-bold">Orden #</th>
                  <th className="p-4 font-bold">Proveedor</th>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Estado</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenes.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-bold text-slate-700">OC-{o.id.toString().padStart(4,'0')}</td>
                    <td className="p-4 font-bold text-slate-800">{o.proveedor.nombre}</td>
                    <td className="p-4 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-medium text-slate-700">{toCurrency(o.totalCents)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        o.estado === 'BORRADOR' ? 'bg-slate-100 text-slate-600' :
                        o.estado === 'ENVIADA' ? 'bg-blue-100 text-blue-700' :
                        o.estado === 'RECIBIDA' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {o.estado}
                      </span>
                    </td>
                    <td className="p-4 flex items-center justify-end gap-2">
                      {o.estado === 'BORRADOR' && (
                        <button onClick={()=>cambiarEstado(o.id, 'ENVIADA')} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100 font-bold">
                          Marcar Enviada
                        </button>
                      )}
                      {o.estado === 'ENVIADA' && (
                        <button onClick={()=>recibirMercancia(o.id)} className="flex items-center gap-1 text-sm bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 font-bold shadow-sm">
                          <PackageCheck className="w-4 h-4" /> Recibir Stock
                        </button>
                      )}
                      {o.estado === 'BORRADOR' && (
                        <button onClick={()=>cambiarEstado(o.id, 'CANCELADA')} className="p-1 text-slate-400 hover:text-rose-600"><XCircle className="w-5 h-5"/></button>
                      )}
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay órdenes de compra. Genera sugerencias con el Motor JIT.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {vista === 'SUGERENCIAS' && (
        <div className="space-y-6">
          {cargandoIA ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-slate-500">
              <Brain className="w-12 h-12 mb-4 animate-pulse text-indigo-400" />
              <p className="font-bold text-lg text-slate-700">Analizando historial de consumo...</p>
              <p>Calculando promedios y cruzando con vida útil.</p>
            </div>
          ) : sugerencias.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-emerald-600">
              <CheckCircle className="w-16 h-16 mb-4 opacity-50" />
              <h2 className="text-2xl font-black mb-2">¡Inventario Óptimo!</h2>
              <p className="text-emerald-700/80 text-center max-w-md">El motor no detectó ningún insumo por debajo del mínimo, o no hay suficiente información para hacer un pedido inteligente.</p>
            </div>
          ) : (
            <div>
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 mb-6 flex gap-3 items-start">
                <Brain className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Análisis JIT (Just-In-Time) Completado</h4>
                  <p className="text-sm opacity-90 mt-1">El motor detectó insumos en nivel crítico. Las cantidades sugeridas te darán una cobertura de 7 días, limitadas estrictamente por la fecha de caducidad para evitar mermas.</p>
                </div>
              </div>

              {proveedoresConSugerencias.map(provId => {
                const itemsProv = sugerencias.filter(s => s.proveedorId === provId)
                const provNombre = itemsProv[0].proveedorNombre
                const totalCents = itemsProv.reduce((a,b) => a + b.totalEstimadoCents, 0)
                const isValidProv = provId !== null

                return (
                  <div key={provId ?? 'null'} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Truck className="w-6 h-6 text-slate-400" />
                        <div>
                          <h3 className="font-black text-lg text-slate-800">{provNombre}</h3>
                          <p className="text-sm text-slate-500">{itemsProv.length} insumo(s) requieren atención.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-700">{toCurrency(totalCents)}</div>
                        <p className="text-xs text-slate-400">Total estimado</p>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid gap-3">
                        {itemsProv.map(s => (
                          <div key={s.insumoId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <div className="font-bold text-slate-800 text-lg">{s.nombre}</div>
                              <div className="text-sm text-slate-500 mb-2">Stock: <span className="font-bold text-rose-500">{s.stockActual}</span> (Mínimo: {s.stockMinimo})</div>
                              <div className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 inline-block">
                                🤖 {s.razonSugerencia}
                              </div>
                            </div>
                            <div className="mt-3 sm:mt-0 text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end">
                              <div className="text-sm text-slate-500 sm:mb-1">Comprar:</div>
                              <div className="font-mono text-xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                                {s.cantidadSugerida} {s.unidadMedida}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                      {isValidProv ? (
                        <button onClick={()=>crearOrdenDesdeSugerencias(provId!)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95">
                          Generar Borrador de Compra <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <p className="text-rose-500 text-sm font-bold flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4"/> Asigna un proveedor a estos insumos para poder generar órdenes.
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
