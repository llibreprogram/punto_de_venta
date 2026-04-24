/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"

import { useEffect, useState } from 'react'
import { KPICard } from '@/components/admin/KPICard'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { DollarSign, ShoppingBag, Receipt, TrendingUp, Package, Loader2 } from 'lucide-react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [ventasDia, setVentasDia] = useState<any[]>([])
  const [topProductos, setTopProductos] = useState<any[]>([])
  const [topCategorias, setTopCategorias] = useState<any[]>([])
  const [ajustes, setAjustes] = useState<any>(null)
  
  // Rango por defecto: Últimos 7 días
  const [days, setDays] = useState(7)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - days + 1)
        
        const fromStr = from.toISOString().split('T')[0]
        const toStr = to.toISOString().split('T')[0]

        const [resDia, resProd, resCat, resAjustes] = await Promise.all([
          fetch(`/api/reportes?type=dia&from=${fromStr}&to=${toStr}T23:59:59Z`),
          fetch(`/api/reportes?type=producto&top=5&from=${fromStr}&to=${toStr}T23:59:59Z`),
          fetch(`/api/reportes?type=categoria&from=${fromStr}&to=${toStr}T23:59:59Z`),
          fetch('/api/ajustes').catch(() => null)
        ])

        if (resDia.ok) setVentasDia(await resDia.json())
        if (resProd.ok) setTopProductos(await resProd.json())
        if (resCat.ok) setTopCategorias(await resCat.json())
        if (resAjustes && resAjustes.ok) setAjustes(await resAjustes.json())
      } catch (err) {
        console.error("Error al cargar dashboard", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  const fmt = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  // Calcular KPIs basados en ventasDia
  const totalIngresos = ventasDia.reduce((sum, d) => sum + d.totalCents, 0)
  const totalPedidos = ventasDia.reduce((sum, d) => sum + d.pedidos, 0)
  const ticketPromedio = totalPedidos > 0 ? Math.round(totalIngresos / totalPedidos) : 0

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard de Ventas</h1>
          <p className="text-sm text-slate-500">Resumen del rendimiento del negocio</p>
        </div>
        <select 
          className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>Hoy</option>
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard 
          title="Ingresos Totales" 
          value={fmt(totalIngresos)} 
          icon={<DollarSign className="w-5 h-5" />} 
        />
        <KPICard 
          title="Pedidos Totales" 
          value={totalPedidos} 
          icon={<ShoppingBag className="w-5 h-5" />} 
        />
        <KPICard 
          title="Ticket Promedio" 
          value={fmt(ticketPromedio)} 
          icon={<Receipt className="w-5 h-5" />} 
        />
      </div>

      {/* Gráficas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica de Ventas */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-800">Evolución de Ingresos</h2>
          </div>
          <div className="h-72 w-full">
            {ventasDia.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => new Date(v).toLocaleDateString(ajustes?.locale || LOCALE, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => `${ajustes?.currency === 'USD' ? '$' : ''}${v / 100}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [fmt(Number(value)), 'Ingresos']}
                    labelFormatter={(label) => new Date(label as string).toLocaleDateString(ajustes?.locale || LOCALE, { weekday: 'long', month: 'long', day: 'numeric' })}
                  />
                  <Bar dataKey="totalCents" fill="#b45309" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No hay datos de ventas para este periodo
              </div>
            )}
          </div>
        </div>

        {/* Top Productos */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-800">Top Productos</h2>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            {topProductos.length > 0 ? topProductos.map((p, i) => (
              <div key={p.productoId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{p.producto}</p>
                    <p className="text-xs text-slate-500">{p.cantidad} vendidos</p>
                  </div>
                </div>
                <div className="font-semibold text-slate-700">
                  {fmt(p.totalCents)}
                </div>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                No hay ventas en este periodo
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
