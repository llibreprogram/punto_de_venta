"use client"
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  Utensils, 
  CheckCircle2, 
  AlertCircle, 
  Timer, 
  ChefHat, 
  Filter, 
  RefreshCcw,
  Maximize,
  Minimize
} from 'lucide-react'

type KItem = {
  id:number
  cantidad:number
  notas?:string|null
  removidos?: string[]|null
  extras?: string[]|null
  estado: 'PENDIENTE'|'EN_PROCESO'|'LISTO'
  pedido: { id:number; numero:number; subCuenta:number; nombreCuenta?:string|null; createdAt:string; mesa?:{nombre:string}|null }
  producto: { nombre:string }
}

function KDSOrderCard({ its, onMarkReady, onUpdateEstado }: { its: KItem[], onMarkReady: () => Promise<void>, onUpdateEstado: (id: number, estado: KItem['estado']) => Promise<void> }) {
  const [elapsed, setElapsed] = useState('')
  const [mins, setMins] = useState(0)
  const createdAt = its[0]?.pedido?.createdAt

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    const update = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((now - start) / 1000))
      const m = Math.floor(diff / 60)
      const s = diff % 60
      const h = Math.floor(diff / 3600)
      setMins(m)
      if (h > 0) {
        setElapsed(`${h}:${(m % 60).toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      } else {
        setElapsed(`${m}:${s.toString().padStart(2, '0')}`)
      }
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [createdAt])

  const isWarning = mins >= 15
  const isDanger = mins >= 30

  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  }

  const getStatusColors = () => {
    if (isDanger) return {
      card: 'bg-white/95 border-red-200 shadow-xl shadow-red-100/50',
      accent: 'bg-red-500',
      timer: 'text-red-700 bg-red-100',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
    }
    if (isWarning) return {
      card: 'bg-white/95 border-amber-200 shadow-lg shadow-amber-100/40',
      accent: 'bg-amber-500',
      timer: 'text-amber-700 bg-amber-100',
      glow: ''
    }
    return {
      card: 'bg-white border-slate-200 shadow-md',
      accent: 'bg-slate-400',
      timer: 'text-slate-600 bg-slate-100',
      glow: ''
    }
  }

  const colors = getStatusColors()

  return (
    <motion.section 
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={`relative overflow-hidden group card rounded-2xl p-5 grid gap-4 border-2 transition-all duration-500 ${colors.card} ${colors.glow}`}
    >
      {/* Side Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colors.accent} transition-colors duration-500`} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Orden</span>
              <span className="text-2xl font-black text-slate-900 leading-none">#{its[0]?.pedido?.numero}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black font-mono transition-colors duration-500 ${colors.timer}`}>
              <Timer className="w-4 h-4" />
              {elapsed}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-lg transition-colors duration-500 ${isDanger ? 'bg-red-50 text-red-800' : isWarning ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
              <Utensils className="w-3.5 h-3.5 opacity-70" />
              {its[0]?.pedido?.mesa ? its[0].pedido.mesa.nombre : 'Para Llevar'}
            </div>
            {its[0]?.pedido?.nombreCuenta && (
              <span className="text-xs font-bold text-slate-500 truncate max-w-[120px]">
                👤 {its[0].pedido.nombreCuenta}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={onMarkReady}
          className="ml-4 p-2 bg-slate-900 hover:bg-green-600 text-white rounded-xl shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group/btn"
        >
          <CheckCircle2 className="w-8 h-8 group-hover/btn:scale-110 transition-transform" />
        </button>
      </div>

      <div className="space-y-3 mt-1">
        {its.map(it => (
          <div key={it.id} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="font-bold text-slate-800 text-lg flex gap-2">
                <span className="text-orange-600">{it.cantidad}×</span>
                <span>{it.producto.nombre}</span>
              </div>
              <select 
                className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded border-none focus:ring-0 cursor-pointer transition-colors ${
                  it.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-700' : 
                  it.estado === 'PENDIENTE' ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'
                }`}
                value={it.estado} 
                onChange={e => onUpdateEstado(it.id, e.target.value as any)}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">Preparando</option>
                <option value="LISTO">Listo</option>
              </select>
            </div>

            {(it.extras?.length || it.removidos?.length || it.notas) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {it.extras?.map(e => (
                  <span key={e} className="text-[10px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 uppercase tracking-tighter">
                    + {e}
                  </span>
                ))}
                {it.removidos?.map(r => (
                  <span key={r} className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-tighter line-through decoration-2 opacity-80">
                    SIN {r}
                  </span>
                ))}
                {it.notas && (
                  <span className="w-full text-xs font-medium text-slate-500 italic mt-1 pl-2 border-l-2 border-orange-200">
                    "{it.notas}"
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  )
}

export default function KDSPage() {
  const [items, setItems] = useState<KItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ocultarListos, setOcultarListos] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const load = async () => {
    const res = await fetch('/api/kds', { cache: 'no-store' })
    const json = await res.json()
    setItems(json)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    
    // Listen for fullscreen changes
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    
    return () => {
      clearInterval(t)
      document.removeEventListener('fullscreenchange', handleFsChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const grupos = useMemo(() => {
    const byPedido = new Map<number, KItem[]>()
    for (const it of items) {
      const arr = byPedido.get(it.pedido.id) || []
      arr.push(it); byPedido.set(it.pedido.id, arr)
    }
    let entries = Array.from(byPedido.entries())
    if (ocultarListos) entries = entries.filter(([, arr]) => arr.some(it => it.estado !== 'LISTO'))
    return entries.sort((a, b) => new Date(a[1][0].pedido.createdAt).getTime() - new Date(b[1][0].pedido.createdAt).getTime())
  }, [items, ocultarListos])

  const updateEstado = async (id: number, estado: KItem['estado']) => {
    await fetch('/api/kds', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) })
    await load()
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12">
      {/* Background Mesh/Gradient Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-20 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-200 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200 blur-[120px]" />
      </div>

      {/* Header Glassmorphism */}
      <header className="sticky top-0 z-50 gradient-header px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none uppercase">Cocina</h1>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Monitor KDS</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center bg-white/10 rounded-2xl p-1 backdrop-blur-md border border-white/10">
              <button 
                onClick={() => setOcultarListos(!ocultarListos)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  ocultarListos ? 'bg-white text-orange-600 shadow-lg' : 'text-white hover:bg-white/5'
                }`}
              >
                <Filter className="w-4 h-4" />
                {ocultarListos ? 'Pendientes' : 'Todos'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleFullscreen}
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
                title="Pantalla Completa"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>

              <button 
                onClick={load} 
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md border border-white/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-200 rounded-full text-xs font-bold text-slate-600">
            <Clock className="w-3.5 h-3.5" />
            {grupos.length} Pedidos en cola
          </div>
        </div>

        {grupos.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200"
          >
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-black text-slate-800">¡Todo al día!</h2>
            <p className="text-slate-500 font-medium">No hay pedidos pendientes en este momento.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 auto-rows-max">
            <AnimatePresence mode="popLayout">
              {grupos.map(([pedidoId, its]) => (
                <KDSOrderCard 
                  key={pedidoId} 
                  its={its} 
                  onMarkReady={async () => {
                    await Promise.all(its.map(it => fetch('/api/kds', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, estado: 'LISTO' }) })))
                    await load()
                  }}
                  onUpdateEstado={updateEstado}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  )
}


