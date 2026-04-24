/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Receipt, Loader2, ArrowRight, GripVertical, Trash2 } from 'lucide-react'
import { DndContext, DragOverlay, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

type PedidoItem = {
  id: number
  productoId: number
  cantidad: number
  precioCents: number
  totalCents: number
  producto: { nombre: string; imagenUrl: string | null }
}

type Pedido = {
  id: number
  subCuenta: number
  subtotalCents: number
  totalCents: number
  items: PedidoItem[]
}

interface TableManagerModalProps {
  mesaId: number
  mesaNombre: string
  ajustes: any
  onClose: (changed: boolean) => void
  onPay: (pedidoId: number) => void
}

/* ── Tarjeta arrastrable ── */
function DraggableItemCard({ item }: { item: PedidoItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `item-${item.id}` })

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    touchAction: 'none',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing flex items-center gap-2.5 mb-2 hover:border-amber-300 hover:shadow-md transition-all select-none"
    >
      <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
        {item.producto.imagenUrl ? (
          <img src={item.producto.imagenUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">?</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-slate-800 truncate">{item.producto.nombre}</div>
        <div className="text-[10px] text-slate-500">
          {item.cantidad} × {toCurrency(item.precioCents, LOCALE, CURRENCY)}
        </div>
      </div>
      <div className="text-xs font-bold text-amber-700 flex-shrink-0">
        {toCurrency(item.precioCents * item.cantidad, LOCALE, CURRENCY)}
      </div>
    </div>
  )
}

/* ── Columna droppable (cuenta existente) ── */
function DroppableColumn({ pedido, isOver, ajustes, onPay, onDelete }: { pedido: Pedido; isOver: boolean; ajustes: any; onPay: () => void; onDelete: () => void }) {
  const { setNodeRef } = useDroppable({ id: `col-${pedido.id}` })

  return (
    <div
      ref={setNodeRef}
      className={`w-72 rounded-2xl flex flex-col flex-shrink-0 border-2 shadow-sm overflow-hidden transition-all duration-200 ${isOver ? 'border-amber-400 bg-amber-50/50 shadow-amber-200/50 scale-[1.02]' : 'border-slate-300 bg-slate-200/50'}`}
      style={{ height: 'calc(100vh - 14rem)', minHeight: '350px' }}
    >
      {/* Header */}
      <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center flex-shrink-0">
        <div className="font-bold text-slate-700 text-sm">Cuenta C{pedido.subCuenta}</div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-md">
            {toCurrency(pedido.totalCents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)}
          </div>
          <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar cuenta">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3">
        {pedido.items.length === 0 ? (
          <div className="text-center text-xs text-slate-400 mt-10 border-2 border-dashed border-slate-300 rounded-xl p-4">
            Arrastra productos aquí
          </div>
        ) : (
          pedido.items.map(item => <DraggableItemCard key={item.id} item={item} />)
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
        <button
          onClick={onPay}
          disabled={pedido.items.length === 0}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          <Receipt className="w-4 h-4" /> Cobrar C{pedido.subCuenta}
        </button>
      </div>
    </div>
  )
}

/* ── Columna droppable (nueva cuenta) ── */
function DroppableNewColumn({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: 'col-new' })

  return (
    <div
      ref={setNodeRef}
      className={`w-72 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center flex-shrink-0 transition-all duration-200 min-h-[350px] ${isOver ? 'border-amber-400 bg-amber-50 opacity-100 scale-[1.02] shadow-lg' : 'border-slate-300 opacity-60 hover:opacity-100'}`}
    >
      <div className="text-center p-6 flex flex-col items-center justify-center gap-3">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isOver ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-400'}`}>
          <Plus className="w-7 h-7" />
        </div>
        <span className="font-bold text-slate-600">Nueva Cuenta</span>
        <span className="text-xs text-slate-400 leading-snug">Arrastra un producto aquí para crear una cuenta separada</span>
      </div>
    </div>
  )
}

/* ── Modal Principal ── */
export function TableManagerModal({ mesaId, mesaNombre, ajustes, onClose, onPay }: TableManagerModalProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [transfering, setTransfering] = useState(false)
  const [changed, setChanged] = useState(false)
  const [activeItem, setActiveItem] = useState<PedidoItem | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  const fetchPedidos = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedidos?mesaId=${mesaId}&estado=ABIERTO`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const fullPedidos: Pedido[] = await Promise.all(
          data.map(async (p: any) => {
            const detail = await fetch(`/api/pedidos/${p.id}`, { cache: 'no-store' }).then(r => r.json())
            return detail
          })
        )
        setPedidos(fullPedidos.sort((a, b) => a.subCuenta - b.subCuenta))
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }, [mesaId])

  useEffect(() => {
    fetchPedidos()
  }, [fetchPedidos])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const idStr = String(event.active.id).replace('item-', '')
    const item = pedidos.flatMap(p => p.items).find(i => i.id === Number(idStr))
    setActiveItem(item || null)
  }

  const handleDragOver = (event: any) => {
    setOverColumnId(event.over ? String(event.over.id) : null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null)
    setOverColumnId(null)
    const { active, over } = event
    if (!over) return

    const itemId = Number(String(active.id).replace('item-', ''))
    const overId = String(over.id)

    let targetPedidoId: number | null = null

    if (overId === 'col-new') {
      targetPedidoId = null
    } else if (overId.startsWith('col-')) {
      targetPedidoId = Number(overId.replace('col-', ''))
    } else {
      // Dropped over another item – no-op for now, requires container detection
      return
    }

    // Find source pedido
    const sourcePedido = pedidos.find(p => p.items.some(i => i.id === itemId))
    if (!sourcePedido) return

    // Same column? Don't transfer
    if (targetPedidoId === sourcePedido.id) return

    const itemData = sourcePedido.items.find(i => i.id === itemId)
    if (!itemData) return

    setTransfering(true)
    try {
      const res = await fetch('/api/pedidos/transfer-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          qtyToMove: itemData.cantidad,
          targetPedidoId,
          mesaId,
        }),
      })
      if (res.ok) {
        setChanged(true)
        await fetchPedidos()
      } else {
        const err = await res.json().catch(() => ({ error: 'Error' }))
        alert(err.error || 'Error al transferir ítem')
      }
    } catch {
      alert('Error de conexión al transferir')
    } finally {
      setTransfering(false)
    }
  }

  const handleDeleteCuenta = async (pedidoId: number) => {
    if (!confirm('¿Eliminar esta cuenta por completo? Los ítems en preparación no se podrán eliminar.')) return
    setTransfering(true)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`, { method: 'DELETE' })
      if (res.ok) {
        setChanged(true)
        await fetchPedidos()
      } else {
        const err = await res.json().catch(() => ({ error: 'Error' }))
        alert(err.error || 'Error al eliminar cuenta')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setTransfering(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm p-3 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="flex-1 bg-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-7xl mx-auto w-full relative"
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10 shadow-sm flex-shrink-0">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                Gestor de Cuentas <ArrowRight className="text-amber-500 w-5 h-5" /> Mesa {mesaNombre}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {pedidos.length} cuenta{pedidos.length !== 1 ? 's' : ''} abierta{pedidos.length !== 1 ? 's' : ''} · Arrastra para mover productos
              </p>
            </div>
            <button
              onClick={() => onClose(changed)}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-x-auto p-4 md:p-6 flex gap-4 items-start">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p>Cargando cuentas de la mesa...</p>
              </div>
            ) : pedidos.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <Receipt className="w-10 h-10 text-slate-300" />
                <p className="font-medium">No hay cuentas abiertas en esta mesa</p>
                <p className="text-xs">Agrega productos desde el POS y guárdalos para verlos aquí</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                {pedidos.map(p => (
                  <DroppableColumn
                    key={p.id}
                    pedido={p}
                    isOver={overColumnId === `col-${p.id}`}
                    ajustes={ajustes}
                    onPay={() => {
                      onClose(changed)
                      onPay(p.id)
                    }}
                    onDelete={() => handleDeleteCuenta(p.id)}
                  />
                ))}

                <DroppableNewColumn isOver={overColumnId === 'col-new'} />

                <DragOverlay>
                  {activeItem ? (
                    <div className="bg-white p-2.5 rounded-xl shadow-2xl border-2 border-amber-500 flex items-center gap-2.5 w-72 ring-4 ring-amber-200/50">
                      <GripVertical className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                        {activeItem.producto.imagenUrl ? (
                          <img src={activeItem.producto.imagenUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">?</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{activeItem.producto.nombre}</div>
                        <div className="text-[10px] text-slate-500">
                          {activeItem.cantidad} × {toCurrency(activeItem.precioCents, LOCALE, CURRENCY)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>

          {transfering && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-medium">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                Procesando...
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
