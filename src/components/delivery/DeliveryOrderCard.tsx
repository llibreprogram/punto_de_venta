import React, { useEffect, useState } from 'react';
import { DeliveryOrder } from '@/lib/mockDeliveryData';
import { Clock, ShoppingBag, MapPin, User, CheckCircle, Car } from 'lucide-react';

interface DeliveryOrderCardProps {
  order: DeliveryOrder;
  isDragging?: boolean;
}

const getPlatformColors = (platform: string) => {
  switch (platform) {
    case 'ubereats':
      return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20 text-green-300' };
    case 'pedidosya':
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' };
    default:
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' };
  }
};

const getStatusGlow = (status: string) => {
  switch(status) {
    case 'new': return 'shadow-[0_0_15px_rgba(59,130,246,0.15)]'; // Blue
    case 'preparing': return 'shadow-[0_0_15px_rgba(249,115,22,0.15)]'; // Orange
    case 'ready': return 'shadow-[0_0_15px_rgba(34,197,94,0.15)]'; // Green
    case 'in_transit': return 'shadow-[0_0_15px_rgba(168,85,247,0.15)]'; // Purple
    case 'delivered': return '';
    default: return '';
  }
}

export function DeliveryOrderCard({ order, isDragging }: DeliveryOrderCardProps) {
  const colors = getPlatformColors(order.platform);
  const glow = getStatusGlow(order.status);
  
  const [elapsedMins, setElapsedMins] = useState(0);

  useEffect(() => {
    const calcElapsed = () => {
      const now = new Date();
      const created = new Date(order.createdAt);
      setElapsedMins(Math.floor((now.getTime() - created.getTime()) / 60000));
    };
    calcElapsed();
    const interval = setInterval(calcElapsed, 60000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  return (
    <div 
      className={`
        relative w-full rounded-2xl p-4 mb-3 
        bg-white/5 backdrop-blur-md border ${colors.border}
        transition-all duration-300 ease-in-out
        ${isDragging ? 'opacity-50 scale-105 z-50' : 'hover:scale-[1.02] hover:bg-white/10'}
        ${glow}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${colors.badge}`}>
            {order.platform}
          </span>
          <h3 className="text-xl font-black text-white mt-2 tracking-tight">
            {order.platformId}
          </h3>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1 bg-white/10 rounded-full px-2 py-1">
            <Clock size={12} className={elapsedMins > 15 && order.status !== 'delivered' ? 'text-red-400' : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${elapsedMins > 15 && order.status !== 'delivered' ? 'text-red-400' : 'text-gray-300'}`}>
              {elapsedMins}m
            </span>
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center space-x-2 text-gray-300 mb-3">
        <User size={14} className="text-gray-500"/>
        <span className="text-sm font-medium truncate">{order.customerName}</span>
      </div>

      {/* Items Summary */}
      <div className="bg-black/20 rounded-xl p-3 mb-3 border border-white/5">
        <ul className="space-y-1">
          {order.items.slice(0, 2).map((item, i) => (
            <li key={i} className="text-sm text-gray-400 flex justify-between">
              <span className="truncate pr-2">{item.quantity}x {item.name}</span>
            </li>
          ))}
          {order.items.length > 2 && (
            <li className="text-xs text-gray-500 italic mt-1">+ {order.items.length - 2} más</li>
          )}
        </ul>
      </div>

      {/* Footer / Driver Info */}
      <div className="flex justify-between items-end mt-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Total</span>
          <span className="text-lg font-bold text-white">${order.total.toFixed(2)}</span>
        </div>
        
        {order.driverName && (
          <div className="flex items-center space-x-1 text-xs font-medium text-amber-300 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
            <Car size={12} />
            <span>{order.driverName}</span>
            {order.driverEta && <span className="ml-1 opacity-70">({order.driverEta}m)</span>}
          </div>
        )}
      </div>
    </div>
  );
}
