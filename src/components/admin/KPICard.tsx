import { ReactNode } from 'react'

interface KPICardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function KPICard({ title, value, icon, trend }: KPICardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm font-medium">{title}</span>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {trend && (
        <div className={`text-xs font-medium flex items-center gap-1 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          <span className="text-slate-400 font-normal ml-1">vs periodo anterior</span>
        </div>
      )}
    </div>
  )
}
