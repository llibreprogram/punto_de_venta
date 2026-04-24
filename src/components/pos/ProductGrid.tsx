/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { usePosStore, Producto } from '@/store/posStore'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

interface ProductGridProps {
  productos: Producto[]
  cargando: boolean
  ajustes: any
}

export function ProductGrid({ productos, cargando, ajustes }: ProductGridProps) {
  const { busqueda, catFiltro, setCatFiltro, agregarProducto } = usePosStore()

  const categorias = useMemo(() => Array.from(new Set(productos.map(p => p.categoria.nombre))), [productos])

  const visibles = useMemo(() => productos.filter(p => {
    const okCat = !catFiltro || p.categoria.nombre === catFiltro
    const okTxt = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return okCat && okTxt
  }), [productos, catFiltro, busqueda])

  const fmtCurrency = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  return (
    <aside className="xl:col-span-2 flex flex-col overflow-y-hidden min-w-0">
      <div className="flex gap-2 mb-3 py-2 flex-shrink-0 sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-x-auto no-scrollbar">
        <button 
          className={`chip whitespace-nowrap transition-colors ${catFiltro === null ? 'chip-active' : ''}`} 
          onClick={() => setCatFiltro(null)}
        >
          Todo
        </button>
        {categorias.map(c => (
          <button 
            key={c} 
            className={`chip whitespace-nowrap transition-colors ${catFiltro === c ? 'chip-active' : ''}`} 
            onClick={() => setCatFiltro(c)}
          >
            {c}
          </button>
        ))}
      </div>
      
      <div className="grid products-grid gap-3 flex-1 min-h-0 overflow-y-auto p-1">
        <AnimatePresence mode="popLayout">
          {cargando ? (
            Array.from({ length: 8 }).map((_, i) => (
              <motion.div 
                key={`skeleton-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card rounded-2xl p-3"
              >
                <div className="aspect-square bg-slate-100 rounded-xl mb-2 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-2/3 mb-1 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-1/3 animate-pulse" />
              </motion.div>
            ))
          ) : (
            visibles.map((p, index) => (
              <motion.button 
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                onClick={() => agregarProducto(p)} 
                className="product-card text-left focus:outline-none focus:ring-2 flex flex-col gap-2 p-2 group" 
                style={{ outlineColor: 'var(--ring)' }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
              >
                <div className="relative aspect-square w-full bg-slate-50/50 rounded-xl overflow-hidden flex-shrink-0">
                  {p.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={p.imagenUrl} 
                      alt={p.nombre} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-slate-400 text-xs font-medium">Sin imagen</div>
                  )}
                  <div className="absolute bottom-2 right-2 price-badge text-white px-2 py-1 rounded-lg text-xs shadow-lg">
                    {fmtCurrency(p.precioCents)}
                  </div>
                </div>
                <div className="flex-1 min-w-0 px-1 pb-1">
                  <div className="font-semibold text-sm truncate text-slate-800" title={p.nombre}>{p.nombre}</div>
                  <div className="text-[11px] text-slate-500 truncate">{p.categoria.nombre}</div>
                </div>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
