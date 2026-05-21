'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'

interface DataPoint {
  mes: string
  ingresos: number
  gastos: number
}

interface Props {
  data: DataPoint[]
}

const fmt = (cents: number) =>
  `RD$ ${(cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs min-w-[180px]">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider text-[10px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between items-center gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500 dark:text-slate-400">{p.dataKey === 'ingresos' ? 'Ingresos' : 'Gastos'}</span>
          </span>
          <span className="font-bold font-mono text-slate-800 dark:text-slate-100">{fmt(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="flex justify-between items-center gap-4 pt-1.5 mt-1.5 border-t border-slate-200 dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">Neto</span>
          <span className={`font-black font-mono ${
            payload[0].value - payload[1].value >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {fmt(payload[0].value - payload[1].value)}
          </span>
        </div>
      )}
    </div>
  )
}

export function CashFlowChart({ data }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Flujo de Caja</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Ingresos vs gastos · últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Gastos
          </span>
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-200)" opacity={0.3} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: 'var(--color-slate-400)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 100000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#colorIngresos)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#6366f1' }}
            />
            <Area
              type="monotone"
              dataKey="gastos"
              stroke="#fb7185"
              strokeWidth={2}
              fill="url(#colorGastos)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fb7185' }}
              strokeDasharray="6 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
