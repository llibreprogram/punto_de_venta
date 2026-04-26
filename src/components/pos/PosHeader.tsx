/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { usePosStore, TipoOrden } from '@/store/posStore'
import { Search, Monitor, Maximize2, LogOut, Settings, ChefHat, Receipt, Users, Store, Utensils, Truck } from 'lucide-react'

interface PosHeaderProps {
  mesas: { id: number; nombre: string }[]
}

const TIPO_OPTIONS: { value: TipoOrden; label: string; icon: React.ReactNode }[] = [
  { value: 'Mostrador', label: 'Mostrador', icon: <Store className="w-3.5 h-3.5" /> },
  { value: 'Mesa',      label: 'Mesa',      icon: <Utensils className="w-3.5 h-3.5" /> },
  { value: 'Delivery',  label: 'Delivery',  icon: <Truck className="w-3.5 h-3.5" /> },
]

export function PosHeader({ mesas }: PosHeaderProps) {
  const { busqueda, setBusqueda, tipo, setTipo, mesaId, setMesaId, subCuenta, setSubCuenta, editingPedidoId, carrito } = usePosStore()

  return (
    <header className="px-3 py-2.5 md:px-4 md:py-3 flex gap-2 md:gap-3 items-center justify-between z-10 gradient-header flex-shrink-0 flex-wrap md:flex-nowrap">
      <div className="flex gap-2.5 md:gap-3 items-center min-w-0 flex-1">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <Monitor className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900">Punto de Venta</h1>
          <span className="text-[11px] text-slate-500 font-medium tracking-wide">RESTAURANTE</span>
        </div>
        
        {tipo === 'Mesa' && mesaId && (
          <span className="pill ml-1 px-3 py-1 text-xs animate-fade-in">
            Mesa {mesas.find(m => m.id === mesaId)?.nombre}{subCuenta ? ` · C${subCuenta}`: ''}
          </span>
        )}
        
        {editingPedidoId && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold ml-1 animate-fade-in flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Editando #{editingPedidoId}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
        {/* Segmented Control for Tipo */}
        <div className="segmented-control">
          {TIPO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTipo(opt.value)
                if (opt.value !== 'Mesa') setMesaId(undefined)
              }}
              className={`segmented-btn flex items-center gap-1.5 ${tipo === opt.value ? 'segmented-btn-active' : ''}`}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Mesa Selector */}
        {tipo === 'Mesa' && (
          <div className="flex items-center gap-2 animate-fade-in">
            <select 
              value={mesaId ?? ''} 
              onChange={e => setMesaId(Number(e.target.value) || undefined)} 
              className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
            >
              <option value="">Seleccionar mesa</option>
              {mesas.map(m => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
            </select>
            
            {mesaId && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-table-manager'))}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                title="Gestor Avanzado de Mesa"
              >
                <Users className="w-3.5 h-3.5" /> Gestor
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar (Ctrl+K)"
            id="search-input"
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm w-32 sm:w-44 md:w-56 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all placeholder:text-slate-400"
            aria-label="Buscar productos"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-0.5 border-l border-slate-200/60 pl-2 ml-1">
          {[
            { href: '/pos/abiertas', icon: <Receipt className="w-[18px] h-[18px]" />, title: 'Órdenes abiertas' },
            { href: '/kds', icon: <ChefHat className="w-[18px] h-[18px]" />, title: 'Cocina (KDS)' },
            { href: '/admin', icon: <Settings className="w-[18px] h-[18px]" />, title: 'Administración' },
          ].map(action => (
            <a 
              key={action.href}
              href={action.href} 
              className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" 
              title={action.title}
            >
              {action.icon}
            </a>
          ))}
          <button type="button" className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Pantalla completa" onClick={() => {
            if (document.fullscreenElement) { document.exitFullscreen(); return }
            document.documentElement.requestFullscreen().catch(()=>{})
          }}>
            <Maximize2 className="w-[18px] h-[18px]" />
          </button>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login' }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-0.5" title="Cerrar Sesión">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  )
}
