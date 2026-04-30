"use client"
import { useEffect, useState } from 'react'
import { X, Loader2, Receipt } from 'lucide-react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

export function OpenOrdersSidebar({ isOpen, onClose, onSelectOrder, ajustes }: { isOpen: boolean, onClose: () => void, onSelectOrder: (id: number) => void, ajustes: any }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    fetch('/api/pedidos?estado=ABIERTO', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRows(data)
        else setRows([])
      })
      .catch(() => setError('Error al cargar órdenes'))
      .finally(() => setLoading(false))
  }, [isOpen])


  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />
      <div 
        className={`fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-[51] flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            Órdenes Abiertas
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-500 text-center p-4 bg-red-50 rounded-xl">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-center p-6 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay órdenes abiertas.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {rows.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    onSelectOrder(r.id)
                    onClose()
                  }}
                  className="w-full text-left p-3 border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all group bg-white relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800">Pedido #{r.numero}</span>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                      {toCurrency(r.totalCents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                    {r.mesa?.nombre ? (
                      <span>{r.mesa.nombre} <span className="font-semibold text-amber-600">{r.nombreCuenta ? ` • ${r.nombreCuenta}` : ` • C${r.subCuenta || 1}`}</span></span>
                    ) : (
                      <span>Para Llevar / Mostrador</span>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
