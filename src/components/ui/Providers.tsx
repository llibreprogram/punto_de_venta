"use client"
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Toast system
export type Toast = { id: number; message: string; type?: 'info'|'success'|'error'; ttl?: number }
type ToastCtx = { push: (message: string, type?: Toast['type']) => void }
const ToastContext = createContext<ToastCtx | null>(null)

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(1)
  const push = useCallback((message: string, type: Toast['type']='info') => {
    const id = idRef.current++
    setToasts(t => [...t, { id, message, type, ttl: 3500 }])
  }, [])
  useEffect(()=>{
    if (!toasts.length) return
    const timers = toasts.map(t => setTimeout(()=>{
      setToasts(ts => ts.filter(x=>x.id!==t.id))
    }, t.ttl))
    return ()=> { timers.forEach(clearTimeout) }
  }, [toasts])
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="fixed z-[100] top-3 right-3 w-72 grid gap-2">
        {toasts.map(t=> (
          <div key={t.id} className={`rounded-lg px-3 py-2 text-sm shadow bg-white/90 backdrop-blur border flex items-start gap-2 animate-fade-in toast-${t.type}`}> 
            <span className={`w-2 h-2 rounded-full mt-1 ${t.type==='success'?'bg-green-500':t.type==='error'?'bg-red-500':'bg-amber-500'}`}></span>
            <div className="flex-1">{t.message}</div>
            <button onClick={()=>setToasts(ts=>ts.filter(x=>x.id!==t.id))} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <Providers>')
  return ctx
}

// Confirm system
type ConfirmOptions = { message: string; confirmText?: string; cancelText?: string }
type ConfirmCtx = { confirm: (opts: ConfirmOptions) => Promise<boolean> }
const ConfirmContext = createContext<ConfirmCtx | null>(null)

function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; opts: ConfirmOptions; resolve?: (v:boolean)=>void }>({ open:false, opts:{ message:'' } })
  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setState({ open: true, opts, resolve })
    })
  }, [])
  const close = (v:boolean) => { state.resolve?.(v); setState(s=> ({ ...s, open:false })) }
  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-[99]">
          <div className="bg-white text-black rounded-lg w-full max-w-sm p-5 grid gap-4 shadow-xl border">
            <div className="text-sm whitespace-pre-line">{state.opts.message}</div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={()=>close(false)}>{state.opts.cancelText || 'Cancelar'}</button>
              <button className="btn btn-primary" onClick={()=>close(true)}>{state.opts.confirmText || 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <Providers>')
  return ctx
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </ToastProvider>
  )
}

// Animación simple
// tailwind utilities assumed; add keyframes fallback
// (could be moved to global CSS if desired)
export const _style = ''
