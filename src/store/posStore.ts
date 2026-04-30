/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
import { create } from 'zustand'

export type Producto = {
  id: number
  nombre: string
  precioCents: number
  imagenUrl: string | null
  categoria: { id: number; nombre: string }
  ingredientes?: string[]
  extras?: Array<{ nombre:string; precioCents:number }>
}

export type Linea = {
  producto: Producto
  cantidad: number
  removidos?: string[]
  extras?: string[]
  nota?: string
}

export type TipoOrden = 'Mostrador' | 'Mesa' | 'Delivery'
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'

interface POSState {
  carrito: Record<number, Linea>
  tipo: TipoOrden
  mesaId: number | undefined
  subCuenta: number
  editingPedidoId: number | null
  
  busqueda: string
  catFiltro: string | null
  
  // Acciones
  setTipo: (tipo: TipoOrden) => void
  setMesaId: (id: number | undefined) => void
  setSubCuenta: (cuenta: number) => void
  setEditingPedidoId: (id: number | null) => void
  setCarrito: (carrito: Record<number, Linea>) => void
  setBusqueda: (q: string) => void
  setCatFiltro: (cat: string | null) => void
  
  agregarProducto: (p: Producto) => void
  quitarProducto: (id: number) => void
  eliminarProducto: (id: number) => void
  actualizarLinea: (id: number, actualizacion: Partial<Linea>) => void
  vaciarCarrito: () => void
  limpiarTodo: () => void
  
  // Helpers calculados
  getTotales: (ivaPct: number, propinaPct: number, descuentoCents: number) => {
    subtotal: number
    itebis: number
    propina: number
    total: number
  }
}

export const usePosStore = create<POSState>((set, get) => ({
  carrito: {},
  tipo: 'Mostrador',
  mesaId: undefined,
  subCuenta: 1,
  editingPedidoId: null,
  busqueda: '',
  catFiltro: null,

  setTipo: (tipo) => set({ tipo }),
  setMesaId: (mesaId) => set({ mesaId }),
  setSubCuenta: (subCuenta) => set({ subCuenta }),
  setEditingPedidoId: (editingPedidoId) => set({ editingPedidoId }),
  setCarrito: (carrito) => set({ carrito }),
  setBusqueda: (busqueda) => set({ busqueda }),
  setCatFiltro: (catFiltro) => set({ catFiltro }),

  agregarProducto: (p) => set((state) => {
    const linea = state.carrito[p.id]
    const cantidad = (linea?.cantidad ?? 0) + 1
    return {
      carrito: {
        ...state.carrito,
        [p.id]: linea ? { ...linea, cantidad } : { producto: p, cantidad }
      }
    }
  }),

  quitarProducto: (id) => set((state) => {
    const linea = state.carrito[id]
    if (!linea) return state
    
    const cantidad = linea.cantidad - 1
    const nuevoCarrito = { ...state.carrito }
    
    if (cantidad <= 0) {
      delete nuevoCarrito[id]
    } else {
      nuevoCarrito[id] = { ...linea, cantidad }
    }
    
    return { carrito: nuevoCarrito }
  }),

  eliminarProducto: (id) => set((state) => {
    const nuevoCarrito = { ...state.carrito }
    delete nuevoCarrito[id]
    return { carrito: nuevoCarrito }
  }),

  actualizarLinea: (id, actualizacion) => set((state) => {
    const linea = state.carrito[id]
    if (!linea) return state
    return {
      carrito: {
        ...state.carrito,
        [id]: { ...linea, ...actualizacion }
      }
    }
  }),

  vaciarCarrito: () => set({ carrito: {}, editingPedidoId: null }),

  limpiarTodo: () => set({ carrito: {}, editingPedidoId: null, mesaId: undefined, subCuenta: 1, tipo: 'Mostrador' }),

  getTotales: (ivaPct, propinaPct, descuentoCents) => {
    const { carrito } = get()
    
    const subtotal = Object.values(carrito).reduce((acc, l) => {
      const base = l.producto.precioCents
      const extraSum = (l.extras || []).reduce((s, name) => {
        const extraPrecio = (l.producto.extras || []).find(e => e.nombre === name)?.precioCents ?? 0
        return s + extraPrecio
      }, 0)
      return acc + ((base + extraSum) * l.cantidad)
    }, 0)

    const baseImponible = Math.max(0, subtotal - descuentoCents)
    const itebis = Math.round(baseImponible * (ivaPct / 100))
    const propina = Math.round(baseImponible * (propinaPct / 100))
    const total = baseImponible + itebis + propina

    return { subtotal, itebis, propina, total }
  }
}))
