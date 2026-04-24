/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { usePosStore, TipoOrden } from '@/store/posStore'
import { Search, Monitor, Maximize2, LogOut, Settings, ChefHat, Receipt, UtensilsCrossed, Users } from 'lucide-react'

interface PosHeaderProps {
  mesas: { id: number; nombre: string }[]
}

export function PosHeader({ mesas }: PosHeaderProps) {
  const { busqueda, setBusqueda, tipo, setTipo, mesaId, setMesaId, subCuenta, setSubCuenta, editingPedidoId, carrito } = usePosStore()

  return (
    <header className="p-2 md:p-3 flex gap-2 md:gap-3 items-center justify-between z-10 gradient-header flex-shrink-0 flex-wrap md:flex-nowrap shadow-sm">
      <div className="flex gap-2 md:gap-3 items-center min-w-0 flex-1">
        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shadow-inner text-white">
          <Monitor className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Punto de Venta</h1>
          <span className="text-xs text-slate-500 font-medium">Fast Food Moderno</span>
        </div>
        
        {tipo === 'Mesa' && mesaId && (
          <span className="pill ml-2 px-3 py-1 text-xs">
            Mesa {mesas.find(m => m.id === mesaId)?.nombre}{subCuenta ? `· C${subCuenta}`: ''}
          </span>
        )}
        
        {editingPedidoId && (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 shadow-sm border border-red-200 font-semibold ml-2 animate-pulse">
            Editando #{editingPedidoId}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
        {/* Selector de Tipo */}
        <div className="relative flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-1">
          <UtensilsCrossed className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            value={tipo} 
            onChange={(e) => {
              const v = e.target.value as TipoOrden
              setTipo(v)
              if (v !== 'Mesa') setMesaId(undefined)
            }} 
            className="bg-transparent border-none py-2 px-2 text-sm font-medium focus:ring-0 cursor-pointer"
          >
            <option>Mostrador</option>
            <option>Mesa</option>
            <option>Delivery</option>
          </select>
        </div>

        {/* Selector de Mesa */}
        {tipo === 'Mesa' && (
          <div className="flex items-center gap-2 animate-fade-in">
            <select 
              value={mesaId ?? ''} 
              onChange={e => setMesaId(Number(e.target.value) || undefined)} 
              className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Selecciona mesa</option>
              {mesas.map(m => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
            </select>
            
            {mesaId && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-table-manager'))}
                className="ml-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm flex items-center gap-1"
                title="Gestor Avanzado de Mesa"
              >
                <Users className="w-4 h-4" /> Gestor de Cuentas
              </button>
            )}
          </div>
        )}

        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar (Ctrl+K)..."
            id="search-input"
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm w-32 sm:w-48 md:w-64 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            aria-label="Buscar productos"
          />
        </div>

        {/* Accesos rápidos */}
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
          <a href="/pos/abiertas" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Órdenes abiertas">
            <Receipt className="w-5 h-5" />
          </a>
          <a href="/kds" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Cocina (KDS)">
            <ChefHat className="w-5 h-5" />
          </a>
          <a href="/admin" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Configuración">
            <Settings className="w-5 h-5" />
          </a>
          <button type="button" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Pantalla completa" onClick={() => {
            if (document.fullscreenElement) { document.exitFullscreen(); return }
            document.documentElement.requestFullscreen().catch(()=>{})
          }}>
            <Maximize2 className="w-5 h-5" />
          </button>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login' }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1" title="Salir">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
