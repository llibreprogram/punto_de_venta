"use client"
import Link from 'next/link'
import { ReactNode } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

type Props = { title: string; actions?: ReactNode; children: ReactNode; minimal?: boolean }

export default function AdminLayout({ title, actions, children, minimal }: Props) {
  return (
    <div className={minimal ? undefined : "min-h-screen grid grid-rows-[auto_1fr]"}>
      {!minimal && (
        <header className="p-4 flex flex-wrap gap-4 items-center justify-between gradient-header sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <nav className="flex gap-2 text-sm">
              <Link className="chip" href="/pos">POS</Link>
              <Link className="chip" href="/admin/productos">Productos</Link>
              <Link className="chip" href="/admin/categorias">Categorías</Link>
              <Link className="chip" href="/admin/mesas">Mesas</Link>
              <Link className="chip" href="/admin/usuarios">Usuarios</Link>
              <Link className="chip" href="/reportes">Reportes</Link>
              <Link className="chip" href="/ventas">Ventas</Link>
              <Link className="chip" href="/configuracion">Config</Link>
              <Link className="chip" href="/admin/salud">Salud</Link>
              <Link className="chip" href="/admin/manual">Manual</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">{actions}<a className="chip" href="/manual" target="_blank" rel="noopener">Manual</a><ThemeToggle /></div>
        </header>
      )}
      <main className={minimal ? undefined : "p-4 mx-auto w-full max-w-6xl grid gap-4"}>{children}</main>
    </div>
  )
}
