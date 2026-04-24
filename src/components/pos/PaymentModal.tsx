/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { useState, useMemo } from 'react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import { MetodoPago } from '@/store/posStore'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, Banknote, Landmark } from 'lucide-react'

interface PaymentModalProps {
  totalCents: number
  ajustes: any
  onClose: () => void
  onConfirm: (metodo: MetodoPago, entregadoCents: number) => void
}

export function PaymentModal({ totalCents, ajustes, onClose, onConfirm }: PaymentModalProps) {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO')
  const [entregado, setEntregado] = useState('')

  const fmt = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  const entregadoCents = useMemo(() => {
    const v = Number(entregado.replace(/[^0-9.]/g, ''))
    if (!isFinite(v)) return 0
    return Math.round(v * 100)
  }, [entregado])

  const cambioCents = Math.max(0, entregadoCents - totalCents)

  // Billetes rápidos basados en moneda local típica (ej. RD$ o $)
  const quickBills = [10000, 20000, 50000, 100000, 200000] // en centavos: 100, 200, 500, 1000, 2000
    .filter(b => b > totalCents)
    .slice(0, 4)

  const handleConfirm = () => {
    onConfirm(metodo, metodo === 'EFECTIVO' ? entregadoCents : totalCents)
  }

  return (
    <AnimatePresence>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-xl font-bold text-slate-800">Finalizar Cobro</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 grid gap-6">
            <div className="flex items-center justify-between bg-amber-50 rounded-xl p-4 border border-amber-100">
              <span className="text-amber-800 font-medium">Total a Pagar</span>
              <span className="text-3xl font-black text-amber-600">{fmt(totalCents)}</span>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-600 mb-2 block">Método de Pago</label>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setMetodo('EFECTIVO')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${metodo === 'EFECTIVO' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                >
                  <Banknote className="w-6 h-6 mb-1" />
                  <span className="text-sm font-semibold">Efectivo</span>
                </button>
                <button 
                  onClick={() => setMetodo('TARJETA')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${metodo === 'TARJETA' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                >
                  <CreditCard className="w-6 h-6 mb-1" />
                  <span className="text-sm font-semibold">Tarjeta</span>
                </button>
                <button 
                  onClick={() => setMetodo('TRANSFERENCIA')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${metodo === 'TRANSFERENCIA' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                >
                  <Landmark className="w-6 h-6 mb-1" />
                  <span className="text-sm font-semibold">Transf.</span>
                </button>
              </div>
            </div>

            {metodo === 'EFECTIVO' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                <label className="text-sm font-bold text-slate-600 mb-2 block">Monto Entregado</label>
                <input 
                  autoFocus
                  value={entregado} 
                  onChange={e => setEntregado(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full text-2xl font-bold p-3 border border-slate-300 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-right shadow-inner"
                />
                
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setEntregado((totalCents / 100).toString())}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors border border-slate-200"
                  >
                    Exacto
                  </button>
                  {quickBills.map(b => (
                    <button 
                      key={b}
                      onClick={() => setEntregado((b / 100).toString())}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors border border-slate-200"
                    >
                      ${b/100}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between p-3 bg-slate-800 text-white rounded-xl">
                  <span className="font-medium text-slate-300">Cambio a devolver</span>
                  <span className={`text-xl font-bold ${cambioCents > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {fmt(cambioCents)}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleConfirm} 
              disabled={metodo === 'EFECTIVO' && entregadoCents < totalCents}
              className="flex-[2] py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 transition-all active:scale-[0.98]"
            >
              Confirmar Pago
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
