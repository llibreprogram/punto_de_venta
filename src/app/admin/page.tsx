"use client"

import { useEffect, useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { DollarSign, ShoppingBag, Receipt, TrendingUp, Package, Loader2, Clock, AlertTriangle, PieChart as PieChartIcon, Calendar } from 'lucide-react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6']

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [ventasDia, setVentasDia] = useState<any[]>([])
  const [topProductos, setTopProductos] = useState<any[]>([])
  const [topCategorias, setTopCategorias] = useState<any[]>([])
  const [horasPico, setHorasPico] = useState<any[]>([])
  const [alertasInventario, setAlertasInventario] = useState(0)
  const [ajustes, setAjustes] = useState<any>(null)
  
  const [rangoFechas, setRangoFechas] = useState(7)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const to = new Date()
        const from = new Date()
        
        // Ajuste para "Hoy" (0) o días anteriores
        if (rangoFechas > 1) {
          from.setDate(from.getDate() - rangoFechas + 1)
        }
        
        const fromStr = from.toISOString().split('T')[0]
        const toStr = to.toISOString().split('T')[0]

        const qs = `from=${fromStr}&to=${toStr}T23:59:59Z`

        const [resDia, resProd, resCat, resHora, resInv, resAjustes] = await Promise.all([
          fetch(`/api/reportes?type=dia&${qs}`),
          fetch(`/api/reportes?type=producto&top=5&${qs}`),
          fetch(`/api/reportes?type=categoria&${qs}`),
          fetch(`/api/reportes?type=hora&${qs}`),
          fetch('/api/inventario'),
          fetch('/api/ajustes').catch(() => null)
        ])

        if (resDia.ok) setVentasDia(await resDia.json())
        if (resProd.ok) setTopProductos(await resProd.json())
        if (resCat.ok) setTopCategorias(await resCat.json())
        if (resHora.ok) setHorasPico(await resHora.json())
        
        if (resInv.ok) {
          const inv = await resInv.json()
          const alertas = inv.filter((i:any) => i.stockMinimo > 0 && i.stockActual <= i.stockMinimo).length
          setAlertasInventario(alertas)
        }

        if (resAjustes && resAjustes.ok) setAjustes(await resAjustes.json())
      } catch (err) {
        console.error("Error al cargar dashboard", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [rangoFechas])

  const fmt = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  // Cálculos principales
  const totalIngresos = ventasDia.reduce((sum, d) => sum + d.totalCents, 0)
  const totalPedidos = ventasDia.reduce((sum, d) => sum + d.pedidos, 0)
  const ticketPromedio = totalPedidos > 0 ? Math.round(totalIngresos / totalPedidos) : 0
  
  // Categorías preparadas para el PieChart
  const catData = topCategorias.map((c) => ({ name: c.categoria, value: c.totalCents }))

  return (
    <div className="relative min-h-[85vh] overflow-x-hidden p-2 sm:p-4 lg:p-6">
      {/* Elementos decorativos del fondo */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10 -translate-y-1/2 -translate-x-1/4" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none -z-10 translate-y-1/4 translate-x-1/4" />

      {/* Cabecera */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-slate-700">Centro de Mando</h1>
          <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Analítica y métricas clave para tomar decisiones.
          </p>
        </div>
        <div className="relative group">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none" />
          <select 
            className="appearance-none pl-12 pr-10 py-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50"
            value={rangoFechas}
            onChange={(e) => setRangoFechas(Number(e.target.value))}
          >
            <option value={1}>Hoy (Tiempo Real)</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 3 Meses</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="w-16 h-16 animate-spin text-indigo-600 relative z-10" />
          </div>
          <p className="text-slate-400 font-bold mt-4 animate-pulse">Procesando millones de datos...</p>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { title: "Ingresos Totales", value: fmt(totalIngresos), icon: <DollarSign className="w-6 h-6"/>, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 text-emerald-600" },
                { title: "Pedidos Completados", value: totalPedidos, icon: <ShoppingBag className="w-6 h-6"/>, color: "from-indigo-500 to-purple-500", bg: "bg-indigo-50 text-indigo-600" },
                { title: "Ticket Promedio", value: fmt(ticketPromedio), icon: <Receipt className="w-6 h-6"/>, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50 text-blue-600" },
                { title: "Alertas de Inventario", value: alertasInventario, icon: <AlertTriangle className="w-6 h-6"/>, color: alertasInventario > 0 ? "from-rose-500 to-red-500" : "from-slate-400 to-slate-500", bg: alertasInventario > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500", alert: alertasInventario > 0 }
              ].map((kpi, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  key={kpi.title} 
                  className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.color} opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:opacity-10 transition-opacity`} />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                    <div className={`p-3 rounded-2xl ${kpi.bg} shadow-inner`}>
                      {kpi.icon}
                    </div>
                  </div>
                  <div className={`text-3xl font-black relative z-10 tracking-tight ${kpi.alert ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                    {kpi.value}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Gráfica Principal: Ingresos Diarios */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Tendencia de Ingresos</h2>
                    <p className="text-sm text-slate-500 font-medium">Evolución de ventas en el periodo seleccionado</p>
                  </div>
                </div>
                <div className="h-80 w-full">
                  {ventasDia.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ventasDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="fecha" 
                          tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={(v) => new Date(v).toLocaleDateString(ajustes?.locale || LOCALE, { month: 'short', day: 'numeric' })}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} 
                          axisLine={false} 
                          tickLine={false}
                          tickFormatter={(v) => `${v / 100}`}
                        />
                        <Tooltip 
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                          formatter={(value: any) => [fmt(Number(value)), 'Ingresos']}
                          labelFormatter={(label) => new Date(label as string).toLocaleDateString(ajustes?.locale || LOCALE, { weekday: 'long', month: 'long', day: 'numeric' })}
                        />
                        <Area type="monotone" dataKey="totalCents" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorIngresos)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                      <p className="font-bold">No hay datos suficientes</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Gráfico: Horas Pico (Personal/Staffing) */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Mapa de Horas Pico</h2>
                    <p className="text-sm text-slate-500 font-medium">Volumen de pedidos por hora (Staffing)</p>
                  </div>
                </div>
                <div className="h-80 w-full">
                  {horasPico.filter(h=>h.pedidos>0).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={horasPico} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="hora" 
                          tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                          axisLine={false} tickLine={false} 
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                          formatter={(value: any, name: string) => [name === 'pedidos' ? value : fmt(Number(value)), name === 'pedidos' ? 'Pedidos' : 'Ingresos']}
                          labelFormatter={(label) => `Hora: ${label}`}
                        />
                        <Bar dataKey="pedidos" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Clock className="w-12 h-12 mb-2 opacity-20" />
                      <p className="font-bold">No hay pedidos registrados</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Categorías más rentables */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><PieChartIcon className="w-5 h-5" /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Distribución de Ventas</h2>
                    <p className="text-sm text-slate-500 font-medium">Rendimiento por categoría</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[250px] relative">
                  {catData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={catData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {catData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [fmt(Number(value)), 'Ventas']}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold">Sin datos de categorías</div>
                  )}
                  {/* Leyenda manual */}
                  <div className="mt-4 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {catData.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-bold text-slate-700 truncate max-w-[120px]">{c.name}</span>
                        </div>
                        <span className="text-slate-500 font-mono font-medium">{fmt(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Top Productos List */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Package className="w-5 h-5" /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Top 5 Productos Estrella</h2>
                    <p className="text-sm text-slate-500 font-medium">Los artículos que generan más ingresos al negocio</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  {topProductos.length > 0 ? topProductos.map((p, i) => (
                    <div key={p.productoId} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${i === 0 ? 'bg-amber-400 text-white shadow-md shadow-amber-400/30' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-amber-700/40 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{p.producto}</p>
                          <p className="text-sm font-medium text-slate-400">{p.cantidad} unidades vendidas</p>
                        </div>
                      </div>
                      <div className="font-black text-xl text-slate-700 bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                        {fmt(p.totalCents)}
                      </div>
                    </div>
                  )) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-12 h-12 mb-2 opacity-20" />
                      <p className="font-bold">No hay ventas registradas</p>
                    </div>
                  )}
                </div>
              </motion.div>

            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
