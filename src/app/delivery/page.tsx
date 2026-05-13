import React from 'react';
import { DeliveryKanbanBoard } from '@/components/delivery/DeliveryKanbanBoard';
import { Truck } from 'lucide-react';

export default function DeliveryDashboardPage() {
  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden flex flex-col font-sans">
      {/* Top Navigation Bar for Delivery */}
      <header className="flex-none h-16 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
            <Truck className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              DELIVERY <span className="text-blue-400">DISPATCH</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">Panel de Gestión Logística</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2 text-sm font-semibold">
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
              ● UberEats Activo
            </span>
            <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30">
              ● PedidosYa Activo
            </span>
          </div>
          <a href="/pos" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-white/10">
            Volver al POS
          </a>
        </div>
      </header>

      {/* Main Kanban Area */}
      <main className="flex-1 overflow-hidden relative">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <DeliveryKanbanBoard />
      </main>

      {/* Global styles for custom scrollbar within this page scope */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
