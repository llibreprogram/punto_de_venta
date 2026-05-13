"use client"
import Link from 'next/link'
import { ReactNode } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

type Props = { title: string; actions?: ReactNode; children: ReactNode; minimal?: boolean }

const NAV_ITEMS = [
  { href: '/pos',               label: 'POS',         icon: '🖥️' },
  { href: '/delivery',          label: 'Delivery',    icon: '🛵' },
  { href: '/admin',             label: 'Dashboard',   icon: '📈' },
  { href: '/admin/productos',   label: 'Productos',   icon: '📦' },
  { href: '/admin/categorias',  label: 'Categorías',  icon: '🏷️' },
  { href: '/admin/mesas',       label: 'Mesas',       icon: '🍽️' },
  { href: '/admin/usuarios',    label: 'Usuarios',    icon: '👥' },
  { href: '/admin/integraciones', label: 'Integraciones', icon: '🔗' },
  { href: '/reportes',          label: 'Reportes',    icon: '📋' },
  { href: '/ventas',            label: 'Ventas',      icon: '📊' },
  { href: '/configuracion',     label: 'Config',      icon: '⚙️' },
  { href: '/admin/salud',       label: 'Salud',       icon: '💚' },
]

export default function AdminLayout({ title, actions, children, minimal }: Props) {
  return (
    <div className={minimal ? undefined : "min-h-screen grid grid-rows-[auto_1fr]"}>
      {!minimal && (
        <header className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between gradient-header sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>
            <nav className="flex gap-1.5 flex-wrap">
              {NAV_ITEMS.map(item => (
                <Link 
                  key={item.href} 
                  className="chip text-xs" 
                  href={item.href}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <a className="chip text-xs" href="/manual" target="_blank" rel="noopener">
              <span className="text-sm">📖</span>
              <span className="hidden sm:inline">Manual</span>
            </a>
            <ThemeToggle />
          </div>
        </header>
      )}
      <main className={minimal ? undefined : "p-4 mx-auto w-full max-w-6xl grid gap-4"}>{children}</main>
    </div>
  )
}
