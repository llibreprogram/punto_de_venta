'use client'
import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
  trend?: number        // % change vs previous period
  trendLabel?: string
  accent: 'emerald' | 'red' | 'indigo' | 'amber'
  delay?: number
}

const accentMap = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    glow: 'hover:shadow-emerald-200/40 dark:hover:shadow-emerald-900/30',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200/60 dark:border-red-800/40',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconColor: 'text-red-600 dark:text-red-400',
    glow: 'hover:shadow-red-200/40 dark:hover:shadow-red-900/30',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200/60 dark:border-indigo-800/40',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    glow: 'hover:shadow-indigo-200/40 dark:hover:shadow-indigo-900/30',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200/60 dark:border-amber-800/40',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glow: 'hover:shadow-amber-200/40 dark:hover:shadow-amber-900/30',
  },
}

export function FinancialKPI({ title, value, subtitle, icon, trend, trendLabel, accent, delay = 0 }: Props) {
  const a = accentMap[accent]
  const trendPositive = trend !== undefined && trend > 0
  const trendNegative = trend !== undefined && trend < 0
  const trendNeutral = trend !== undefined && trend === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`
        relative overflow-hidden rounded-2xl border p-5 
        ${a.bg} ${a.border} ${a.glow}
        shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5
        group cursor-default
      `}
    >
      {/* Background decoration */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${a.iconBg} opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{title}</p>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate">{value}</h3>
          {subtitle && (
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${a.iconBg} ${a.iconColor} flex-shrink-0`}>
          {icon}
        </div>
      </div>

      {trend !== undefined && (
        <div className="relative flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/30">
          {trendPositive && <TrendingUp size={14} className="text-emerald-500" />}
          {trendNegative && <TrendingDown size={14} className="text-red-500" />}
          {trendNeutral && <Minus size={14} className="text-slate-400" />}
          <span className={`text-xs font-bold ${
            trendPositive ? 'text-emerald-600 dark:text-emerald-400' :
            trendNegative ? 'text-red-600 dark:text-red-400' :
            'text-slate-400'
          }`}>
            {trendPositive && '+'}{trend}%
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {trendLabel || 'vs mes anterior'}
          </span>
        </div>
      )}
    </motion.div>
  )
}
