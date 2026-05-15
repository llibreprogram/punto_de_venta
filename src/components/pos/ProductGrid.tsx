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

// Category-to-emoji mapping for placeholder icons
const CATEGORY_ICONS: Record<string, string> = {
  'hamburguesas': '🍔',
  'hamburguesa': '🍔',
  'bebidas': '🥤',
  'bebida': '🥤',
  'acompañantes': '🍟',
  'acompañante': '🍟',
  'combos': '🍱',
  'combo': '🍱',
  'postres': '🍨',
  'postre': '🍨',
  'entradas': '🥗',
  'entrada': '🥗',
  'pizzas': '🍕',
  'pizza': '🍕',
  'sopas': '🍲',
  'sopa': '🍲',
  'ensaladas': '🥗',
  'ensalada': '🥗',
  'pollos': '🍗',
  'pollo': '🍗',
  'carnes': '🥩',
  'carne': '🥩',
  'pescados': '🐟',
  'pescado': '🐟',
  'mariscos': '🦐',
  'marisco': '🦐',
  'desayunos': '🍳',
  'desayuno': '🍳',
  'cafe': '☕',
  'café': '☕',
  'jugos': '🧃',
  'jugo': '🧃',
  'snacks': '🍿',
  'tacos': '🌮',
  'wraps': '🌯',
  'helados': '🍦',
  'helado': '🍦',
  'panadería': '🥐',
  'pan': '🥐',
}

function getCategoryIcon(categoryName: string): string {
  const normalized = categoryName.toLowerCase().trim()
  return CATEGORY_ICONS[normalized] || '🍽️'
}

export function ProductGrid({ productos, cargando, ajustes }: ProductGridProps) {
  const { busqueda, catFiltro, setCatFiltro, agregarProducto, carrito } = usePosStore()

  const categorias = useMemo(() => Array.from(new Set(productos.map(p => p.categoria.nombre))), [productos])

  const visibles = useMemo(() => productos.filter(p => {
    const okCat = !catFiltro || p.categoria.nombre === catFiltro
    const okTxt = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return okCat && okTxt
  }), [productos, catFiltro, busqueda])

  const fmtCurrency = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  return (
    <aside className="xl:col-span-2 flex flex-col overflow-y-hidden min-w-0">
      {/* Category chips */}
      <div className="flex gap-2 py-2.5 px-1 flex-shrink-0 sticky top-0 z-10 bg-slate-100/80 backdrop-blur-md overflow-x-auto no-scrollbar">
        <button 
          className={`chip whitespace-nowrap transition-all ${catFiltro === null ? 'chip-active' : ''}`} 
          onClick={() => setCatFiltro(null)}
        >
          Todo
        </button>
        {categorias.map(c => (
          <button 
            key={c} 
            className={`chip whitespace-nowrap transition-all ${catFiltro === c ? 'chip-active' : ''}`} 
            onClick={() => setCatFiltro(c)}
          >
            <span>{getCategoryIcon(c)}</span>
            {c}
          </button>
        ))}
      </div>
      
      {/* Products grid */}
      <div className="grid products-grid gap-3 flex-1 min-h-0 overflow-y-auto p-2">
        <AnimatePresence>
          {cargando ? (
            Array.from({ length: 8 }).map((_, i) => (
              <motion.div 
                key={`skeleton-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-2xl overflow-hidden bg-white border border-slate-100"
              >
                <div className="aspect-square animate-shimmer" />
                <div className="p-3">
                  <div className="h-4 bg-slate-100 rounded-lg w-3/4 mb-2 animate-shimmer" />
                  <div className="h-3 bg-slate-100 rounded-lg w-1/2 animate-shimmer" />
                </div>
              </motion.div>
            ))
          ) : (
            visibles.map((p, index) => {
              const cantidadEnCarrito = carrito[p.id]?.cantidad || 0
              const agotado = p.stockMaximo !== null && p.stockMaximo !== undefined && p.stockMaximo <= 0
              return (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.25, delay: index * 0.015 }}
                  onClick={() => { if (!agotado) agregarProducto(p) }} 
                  role="button"
                  tabIndex={agotado ? -1 : 0}
                  className={`product-card min-h-[160px] sm:min-h-[180px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 group relative ${agotado ? 'opacity-50 cursor-not-allowed grayscale-[50%]' : 'cursor-pointer'}`} 
                  whileTap={agotado ? {} : { scale: 0.95 }}
                  onKeyDown={(e) => { if(!agotado && (e.key==='Enter' || e.key===' ')) agregarProducto(p) }}
                >
                  {/* Etiqueta de Agotado */}
                  {agotado && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-2xl">
                      <div className="bg-red-600 text-white font-black text-sm px-4 py-1.5 rounded-lg shadow-lg -rotate-12 border-2 border-white tracking-widest uppercase">
                        Agotado
                      </div>
                    </div>
                  )}

                  {/* Quantity badge */}
                  {cantidadEnCarrito > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="product-qty-badge"
                    >
                      {cantidadEnCarrito}
                    </motion.div>
                  )}

                  {/* Image / Placeholder */}
                  <div className="relative w-full h-[110px] sm:h-[130px] overflow-hidden flex-shrink-0">
                    {p.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={p.imagenUrl} 
                        alt={p.nombre} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="product-placeholder w-full h-full flex flex-col justify-center items-center">
                        <span className="product-placeholder-icon">
                          {getCategoryIcon(p.categoria.nombre)}
                        </span>
                      </div>
                    )}
                    {/* Price badge */}
                    <div className="absolute bottom-2 right-2 price-badge text-white px-2.5 py-1 rounded-lg text-xs shadow-lg">
                      {fmtCurrency(p.precioCents)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex-shrink-0 min-w-0 p-2.5 pb-2">
                    <div className="font-semibold text-[13px] leading-snug text-slate-800 line-clamp-2" title={p.nombre}>{p.nombre}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{p.categoria.nombre}</div>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
