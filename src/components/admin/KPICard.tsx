import { ReactNode } from 'react'

interface KPICardProps {
  title: string
  value: string | number
  icon: ReactNode
  accent?: 'green' | 'blue' | 'amber' | 'purple'
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function KPICard({ title, value, icon, accent = 'amber', trend }: KPICardProps) {
  return (
    <div className={`bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-2 kpi-accent-${accent} hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className="text-slate-400 opacity-60">{icon}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</div>
      {trend && (
        <div className={`text-xs font-semibold flex items-center gap-1 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          <span className="text-slate-400 font-normal ml-1">vs periodo anterior</span>
        </div>
      )}
    </div>
  )
}
