'use client';

import React, { useState } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeliveryOrder, DeliveryStatus, initialMockOrders } from '@/lib/mockDeliveryData';
import { DeliveryOrderCard } from './DeliveryOrderCard';

const COLUMNS: { id: DeliveryStatus; title: string; color: string; borderGlow: string }[] = [
  { id: 'new', title: 'Nuevas', color: 'text-blue-400', borderGlow: 'border-t-blue-500' },
  { id: 'preparing', title: 'Preparando', color: 'text-orange-400', borderGlow: 'border-t-orange-500' },
  { id: 'ready', title: 'Listas', color: 'text-green-400', borderGlow: 'border-t-green-500' },
  { id: 'in_transit', title: 'En Camino', color: 'text-purple-400', borderGlow: 'border-t-purple-500' },
  { id: 'delivered', title: 'Entregadas', color: 'text-gray-400', borderGlow: 'border-t-gray-500' },
];

function SortableItem({ order }: { order: DeliveryOrder }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id, data: { type: 'Order', order } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <DeliveryOrderCard order={order} isDragging={isDragging} />
    </div>
  );
}

export function DeliveryKanbanBoard() {
  const [orders, setOrders] = useState<DeliveryOrder[]>(initialMockOrders);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getOrdersByStatus = (status: DeliveryStatus) => orders.filter(o => o.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find(o => o.id === active.id);
    if (order) setActiveOrder(order);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Order';
    const isOverTask = over.data.current?.type === 'Order';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    // Moving order over another order
    if (isActiveTask && isOverTask) {
      setOrders((orders) => {
        const activeIndex = orders.findIndex((t) => t.id === activeId);
        const overIndex = orders.findIndex((t) => t.id === overId);

        if (orders[activeIndex].status !== orders[overIndex].status) {
          const updatedOrders = [...orders];
          updatedOrders[activeIndex].status = orders[overIndex].status;
          return arrayMove(updatedOrders, activeIndex, overIndex);
        }

        return arrayMove(orders, activeIndex, overIndex);
      });
    }

    // Moving order into an empty column
    if (isActiveTask && isOverColumn) {
      setOrders((orders) => {
        const activeIndex = orders.findIndex((t) => t.id === activeId);
        const updatedOrders = [...orders];
        updatedOrders[activeIndex].status = overId as DeliveryStatus;
        return arrayMove(updatedOrders, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    setOrders((orders) => {
      const activeIndex = orders.findIndex((t) => t.id === activeId);
      const overIndex = orders.findIndex((t) => t.id === overId);
      
      // Update status if dropped in different column (handled mostly by dragOver, this is a fallback)
      if (over.data.current?.type === 'Column') {
         const updatedOrders = [...orders];
         updatedOrders[activeIndex].status = overId as DeliveryStatus;
         return updatedOrders;
      }

      return arrayMove(orders, activeIndex, overIndex);
    });
  };

  return (
    <div className="flex h-full w-full overflow-x-auto p-6 space-x-6">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((column) => {
          const columnOrders = getOrdersByStatus(column.id);
          return (
            <DroppableColumn 
              key={column.id} 
              column={column} 
              orders={columnOrders} 
            />
          );
        })}
        
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
        }}>
          {activeOrder ? <DeliveryOrderCard order={activeOrder} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DroppableColumn({ column, orders }: { column: typeof COLUMNS[0], orders: DeliveryOrder[] }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'Column' }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col flex-shrink-0 w-80 bg-white/5 backdrop-blur-xl border-t-4 ${column.borderGlow} rounded-2xl overflow-hidden`}
      style={{ minHeight: '500px' }}
    >
      <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
        <h2 className={`font-black text-lg uppercase tracking-widest ${column.color}`}>
          {column.title}
        </h2>
        <span className="bg-white/10 text-white text-xs font-bold px-2 py-1 rounded-full">
          {orders.length}
        </span>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {orders.map((order) => (
            <SortableItem key={order.id} order={order} />
          ))}
        </SortableContext>
        {orders.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl m-2">
            <span className="text-gray-500 text-sm font-medium">Soltar aquí</span>
          </div>
        )}
      </div>
    </div>
  );
}
