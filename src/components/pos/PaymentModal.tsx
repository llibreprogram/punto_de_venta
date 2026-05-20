/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { useState, useMemo, useEffect } from 'react'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'
import { MetodoPago } from '@/store/posStore'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, Banknote, Landmark, CheckCircle2 } from 'lucide-react'
import { validarDocumentoIdentidad } from '@/lib/ncf-client'

interface PaymentModalProps {
  totalCents: number
  ajustes: any
  onClose: () => void
  onConfirm: (
    metodo: MetodoPago,
    entregadoCents: number,
    ncfTipo: string,
    rncCedula?: string,
    nombreCliente?: string
  ) => void
}

const METHODS: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { value: 'EFECTIVO',      label: 'Efectivo',  icon: <Banknote className="w-6 h-6" /> },
  { value: 'TARJETA',       label: 'Tarjeta',   icon: <CreditCard className="w-6 h-6" /> },
  { value: 'TRANSFERENCIA', label: 'Transf.',    icon: <Landmark className="w-6 h-6" /> },
]

export function PaymentModal({ totalCents, ajustes, onClose, onConfirm }: PaymentModalProps) {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO')
  const [entregado, setEntregado] = useState('')
  const [ncfTipo, setNcfTipo] = useState<'B02' | 'B01'>('B02')
  const [rncCedula, setRncCedula] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [loadingRnc, setLoadingRnc] = useState(false)
  const [rncError, setRncError] = useState('')

  const docStatus = useMemo(() => {
    if (!rncCedula) return { valido: false, tipo: 'DESCONOCIDO', mensaje: '' }
    const res = validarDocumentoIdentidad(rncCedula)
    if (!res.valido) {
      return { ...res, mensaje: 'Documento inválido (checksum incorrecto)' }
    }
    return { ...res, mensaje: `✓ ${res.tipo} Válido` }
  }, [rncCedula])

  useEffect(() => {
    if (ncfTipo !== 'B01') return
    if (!docStatus.valido) {
      setRncError('')
      return
    }

    let active = true
    const fetchRnc = async () => {
      setLoadingRnc(true)
      setRncError('')
      try {
        const response = await fetch(`/api/contabilidad/consulta-rnc?rnc=${rncCedula}`)
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || 'No encontrado en DGII')
        }
        const data = await response.json()
        if (active && data.razonSocial) {
          setNombreCliente(data.razonSocial)
        }
      } catch (err: any) {
        if (active) {
          setRncError(err.message || 'Error al consultar RNC')
        }
      } finally {
        if (active) {
          setLoadingRnc(false)
        }
      }
    }

    // Debounce query to avoid spamming the backend during typing
    const timeout = setTimeout(() => {
      fetchRnc()
    }, 450)

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [rncCedula, docStatus.valido, ncfTipo])

  const fmt = (cents: number) => toCurrency(cents, ajustes?.locale || LOCALE, ajustes?.currency || CURRENCY)

  const entregadoCents = useMemo(() => {
    const v = Number(entregado.replace(/[^0-9.]/g, ''))
    if (!isFinite(v)) return 0
    return Math.round(v * 100)
  }, [entregado])

  const cambioCents = Math.max(0, entregadoCents - totalCents)

  // Billetes rápidos basados en moneda local típica (ej. RD$ o $)
  const quickBills = [10000, 20000, 50000, 100000, 200000]
    .filter(b => b > totalCents)
    .slice(0, 4)

  const canConfirm = useMemo(() => {
    if (metodo === 'EFECTIVO' && entregadoCents < totalCents) return false
    if (ncfTipo === 'B01') {
      if (!docStatus.valido) return false
      if (!nombreCliente.trim()) return false
    }
    return true
  }, [metodo, entregadoCents, totalCents, ncfTipo, docStatus, nombreCliente])

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(
      metodo,
      metodo === 'EFECTIVO' ? entregadoCents : totalCents,
      ncfTipo,
      ncfTipo === 'B01' ? rncCedula : undefined,
      ncfTipo === 'B01' ? nombreCliente : undefined
    )
  }

  return (
    <AnimatePresence>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/50"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Finalizar Cobro</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-5 grid gap-5 max-h-[70vh] overflow-y-auto no-scrollbar">
            {/* Total display */}
            <div className="flex items-center justify-between rounded-xl p-4 border border-orange-100"
              style={{ background: 'var(--gradient-brand-soft)' }}
            >
              <span className="text-orange-800 font-semibold">Total a Pagar</span>
              <span className="text-3xl font-black text-orange-600 tracking-tight">{fmt(totalCents)}</span>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="text-sm font-bold text-slate-600 mb-2.5 block">Método de Pago</label>
              <div className="grid grid-cols-3 gap-3">
                {METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMetodo(m.value)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 ${
                      metodo === m.value 
                        ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md shadow-orange-500/10' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {metodo === m.value && (
                      <motion.div 
                        layoutId="payment-check"
                        className="absolute top-1.5 right-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      </motion.div>
                    )}
                    <div className="mb-1.5">{m.icon}</div>
                    <span className="text-sm font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de Factura (NCF) */}
            <div>
              <label className="text-sm font-bold text-slate-600 mb-2 block">Tipo de Factura</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNcfTipo('B02')}
                  className={`py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                    ncfTipo === 'B02'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-extrabold shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Consumidor Final (B02)
                </button>
                <button
                  type="button"
                  onClick={() => setNcfTipo('B01')}
                  className={`py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                    ncfTipo === 'B01'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-extrabold shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Crédito Fiscal (B01)
                </button>
              </div>
            </div>

            {/* Campos adicionales para Crédito Fiscal */}
            {ncfTipo === 'B01' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="grid gap-3.5 p-4 bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden"
              >
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">RNC / Cédula del Cliente</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={rncCedula}
                      onChange={(e) => setRncCedula(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Ej: 101850043 o 00116452285"
                      className="w-full text-sm font-bold p-2.5 pr-10 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                    />
                    {loadingRnc && (
                      <div className="absolute right-3 top-3">
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {rncCedula && !loadingRnc && (
                    <span className={`text-xs font-semibold mt-1 block ${docStatus.valido ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {docStatus.mensaje}
                    </span>
                  )}
                  {loadingRnc && (
                    <span className="text-xs font-semibold mt-1 text-amber-600 animate-pulse block">
                      🔍 Consultando Razón Social en DGII...
                    </span>
                  )}
                  {rncError && (
                    <span className="text-xs font-semibold mt-1 text-amber-500 block">
                      ⚠️ {rncError} (Puedes escribir el nombre manualmente)
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nombre / Razón Social</label>
                  <input
                    type="text"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    placeholder="Ej: Dominicana Corp SRL"
                    className="w-full text-sm font-bold p-2.5 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Cash details */}
            {metodo === 'EFECTIVO' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden grid gap-3">
                <label className="text-sm font-bold text-slate-600 block">Monto Entregado</label>
                <input 
                  autoFocus
                  value={entregado} 
                  onChange={e => setEntregado(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full text-2xl font-extrabold p-3.5 border border-slate-200 rounded-xl focus:ring-3 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-right shadow-inner tracking-tight"
                  style={{ fontFamily: "'Inter', system-ui, monospace" }}
                />
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEntregado((totalCents / 100).toString())}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all border border-slate-200 active:scale-95"
                  >
                    Exacto
                  </button>
                  {quickBills.map(b => (
                    <button 
                      key={b}
                      onClick={() => setEntregado((b / 100).toString())}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all border border-slate-200 active:scale-95"
                    >
                      RD${b/100}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl text-white"
                  style={{ background: 'var(--gradient-dark)' }}
                >
                  <span className="font-medium text-slate-300">Cambio a devolver</span>
                  <span className={`text-xl font-extrabold tracking-tight ${cambioCents > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {fmt(cambioCents)}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all active:scale-[.98]">
              Cancelar
            </button>
            <button 
              onClick={handleConfirm} 
              disabled={!canConfirm}
              className="flex-[2] py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[.98] disabled:opacity-40 disabled:shadow-none"
              style={{ 
                background: !canConfirm ? '#cbd5e1' : 'var(--gradient-brand)',
                boxShadow: !canConfirm ? 'none' : '0 4px 14px rgba(234,88,12,.3)'
              }}
            >
              Confirmar Pago
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
