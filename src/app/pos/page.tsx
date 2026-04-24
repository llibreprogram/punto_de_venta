/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
"use client"
import { useEffect, useState } from 'react'
import { useToast, useConfirm } from '@/components/ui/Providers'
import { usePosStore, Producto, Linea, MetodoPago } from '@/store/posStore'
import { PosHeader } from '@/components/pos/PosHeader'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { TableManagerModal } from '@/components/pos/TableManagerModal'

export default function POSPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [mesas, setMesas] = useState<{id:number; nombre:string}[]>([])
  const [ajustes, setAjustes] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [subCuentasDisponibles, setSubCuentasDisponibles] = useState<number[]>([1])
  
  // Estado local para los modales de pago
  const [cobrando, setCobrando] = useState(false)
  const [cobrandoSel, setCobrandoSel] = useState(false)
  const [descuentoPendiente, setDescuentoPendiente] = useState(0)
  const [selPendiente, setSelPendiente] = useState<Record<number, number>>({})
  const [tableManagerOpen, setTableManagerOpen] = useState(false)

  const { push } = useToast()
  const { confirm } = useConfirm()
  
  const { 
    tipo, mesaId, subCuenta, setSubCuenta, setTipo, setMesaId, 
    carrito, editingPedidoId, setEditingPedidoId, setCarrito, vaciarCarrito, getTotales
  } = usePosStore()

  useEffect(() => {
    setCargando(true)
    Promise.all([
      fetch('/api/productos').then(r => r.json()),
      fetch('/api/mesas').then(r => r.json()),
      fetch('/api/ajustes').then(r=>r.json()).catch(()=>null),
    ]).then(async ([prods, ms, ajs]) => {
      setProductos(prods)
      setMesas(ms)
      setAjustes(ajs)
      
      const url = new URL(window.location.href)
      const loadId = url.searchParams.get('load')
      if (loadId) {
        const res = await fetch(`/api/pedidos/${loadId}`, { cache: 'no-store' })
        if (res.ok) {
          const pedido = await res.json()
          if (pedido?.estado === 'ABIERTO' && Array.isArray(pedido.items)) {
            const nuevo: Record<number, Linea> = {}
            for (const it of pedido.items) {
              const prod = prods.find((p: Producto) => p.id === it.productoId)
              if (!prod) continue
              nuevo[prod.id] = {
                producto: prod,
                cantidad: it.cantidad,
                removidos: it.removidos || undefined,
                extras: it.extras || undefined,
                nota: it.notas || undefined,
              }
            }
            setCarrito(nuevo)
            setEditingPedidoId(Number(loadId))
            if (pedido.mesaId) {
              setTipo('Mesa')
              setMesaId(pedido.mesaId)
            }
            if (pedido.subCuenta) setSubCuenta(pedido.subCuenta)
          }
        }
        url.searchParams.delete('load')
        window.history.replaceState({}, '', url.toString())
      }
    }).finally(() => setCargando(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleOpen = () => setTableManagerOpen(true)
    window.addEventListener('open-table-manager', handleOpen)
    return () => window.removeEventListener('open-table-manager', handleOpen)
  }, [])

  // Cargar subcuentas disponibles de la mesa
  useEffect(() => {
    if (tipo !== 'Mesa' || !mesaId) { 
      setSubCuentasDisponibles([1])
      if (subCuenta !== 1) setSubCuenta(1)
      return 
    }
    fetch(`/api/pedidos?mesaId=${mesaId}&estado=ABIERTO`, { cache:'no-store' })
      .then(r => r.json())
      .then((ps: Array<{ subCuenta?: number }>) => {
        const nums = Array.from(new Set(ps.map(p => p.subCuenta || 1))).sort((a,b)=>a-b)
        if (!nums.includes(subCuenta)) {
          setSubCuentasDisponibles([...nums, subCuenta].sort((a,b)=>a-b))
        } else {
          setSubCuentasDisponibles(nums.length ? nums : [1])
        }
      }).catch(()=>{})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, mesaId])

  // Lógica para enviar orden (Guardar o Cobrar)
  const procesarOrden = async (esCobro: boolean, metodoPago?: MetodoPago, montoEntregado?: number, overrideCarrito?: Record<number, Linea>, descuentoForce?: number) => {
    const carritoActual = overrideCarrito || carrito
    const descActual = descuentoForce ?? descuentoPendiente
    if (Object.values(carritoActual).length === 0) return

    const totales = getTotales(ajustes?.taxPct || 0, ajustes?.propinaPct || 0, descActual)
    
    // Si pasamos un overrideCarrito (dividir cuenta), recalculamos esos totales localmente
    let finalImpuestoCents = totales.itebis + totales.propina
    let finalItebis = totales.itebis
    let finalPropina = totales.propina
    let finalTotal = totales.total

    if (overrideCarrito) {
      const sub = Object.values(overrideCarrito).reduce((acc, l) => {
        const base = l.producto.precioCents
        const extraSum = (l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)
        return acc + (base + extraSum) * l.cantidad
      }, 0)
      const baseImp = Math.max(0, sub - descActual)
      finalItebis = Math.round(baseImp * ((ajustes?.taxPct || 0) / 100))
      finalPropina = Math.round(baseImp * ((ajustes?.propinaPct || 0) / 100))
      finalImpuestoCents = finalItebis + finalPropina
      finalTotal = baseImp + finalImpuestoCents
    }

    const items = Object.values(carritoActual).map(l => ({
      productoId: l.producto.id,
      cantidad: l.cantidad,
      precioCents: l.producto.precioCents + ((l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)),
      removidos: l.removidos,
      extras: l.extras,
      extrasCents: ((l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)),
      notas: (l.nota||'').trim() || undefined,
    }))

    // Lógica para saber a qué pedido le estamos haciendo update
    let pedidoIdForUpdate = editingPedidoId
    if (!pedidoIdForUpdate && tipo === 'Mesa' && mesaId && !overrideCarrito) {
      try {
        const r = await fetch(`/api/pedidos?mesaId=${mesaId}&estado=ABIERTO&subCuenta=${subCuenta}`, { cache:'no-store' })
        if (r.ok) {
          const lista = await r.json()
          if (Array.isArray(lista) && lista.length) {
            const ord = lista.sort((a,b)=> b.id - a.id)[0]
            pedidoIdForUpdate = ord.id
            setEditingPedidoId(ord.id)
          }
        }
      } catch {}
    }

    const url = pedidoIdForUpdate && !overrideCarrito ? `/api/pedidos/${pedidoIdForUpdate}`: '/api/pedidos'
    const method = pedidoIdForUpdate && !overrideCarrito ? 'PUT' : 'POST'

    const body: any = {
      items,
      impuestoCents: finalImpuestoCents,
      itebisCents: finalItebis,
      propinaCents: finalPropina,
      descuentoCents: descActual
    }

    if (!pedidoIdForUpdate || overrideCarrito) {
      body.tipo = tipo
      body.mesaId = mesaId
      body.subCuenta = subCuenta
    }

    if (esCobro && metodoPago) {
      body.pago = { metodo: metodoPago, montoCents: finalTotal }
    }

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    
    if (res.ok) {
      const data = await res.json()
      
      if (esCobro) {
        if (!overrideCarrito) {
          vaciarCarrito()
        } else {
          // Remover del carrito principal los ítems cobrados de la cuenta dividida
          const c = { ...carrito }
          for (const k of Object.keys(overrideCarrito)) {
            const id = Number(k)
            c[id].cantidad -= overrideCarrito[id].cantidad
            if (c[id].cantidad <= 0) delete c[id]
          }
          setCarrito(c)
        }

        if (data?.pedidoId) {
          // Imprimir Ticket e ir al KDS
          try {
            const linkRes = await fetch(`/api/tickets/signed-link/${data.pedidoId}`)
            if (linkRes.ok) {
              const j = await linkRes.json()
              window.open(j.url + (j.url.includes('?')?'&':'?') + 'print=1', '_blank')
            } else {
              window.open(`/ticket/${data.pedidoId}?print=1`, '_blank')
            }
            if (data?.autoKitchen) fetch(`/api/print/kitchen/${data.pedidoId}`).catch(()=>{})
          } catch { window.open(`/ticket/${data.pedidoId}?print=1`, '_blank') }
        }

        // Limpiar el carrito después de cobro exitoso
        vaciarCarrito()

        push('Cobro realizado con éxito', 'success')

        // Si es mesa, recargar subcuentas automáticamente
        if (tipo === 'Mesa' && mesaId) {
          try {
            const scRes = await fetch(`/api/pedidos?mesaId=${mesaId}&estado=ABIERTO`, { cache: 'no-store' })
            if (scRes.ok) {
              const scData = await scRes.json()
              const nums = Array.from(new Set((scData as Array<{subCuenta?: number}>).map(p => p.subCuenta || 1))).sort((a: number, b: number) => a - b) as number[]
              setSubCuentasDisponibles(nums.length ? nums : [1])
              if (nums.length > 0 && !nums.includes(subCuenta)) {
                setSubCuenta(nums[0])
              }
            }
          } catch {}
        }
      } else {
        if (data?.pedidoId) setEditingPedidoId(data.pedidoId)
        if (data?.autoKitchen) fetch(`/api/print/kitchen/${data.pedidoId}`).catch(()=>{})
        push('Orden abierta guardada', 'success')
      }
    } else {
      push('No se pudo procesar la orden', 'error')
    }
  }

  return (
    <div className={`h-dvh flex flex-col overflow-hidden bg-slate-50 ${ajustes?.touchMode ? 'touch-mode' : ''}`}>
      <PosHeader 
        mesas={mesas} 
      />
      
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-3 min-h-0">
        <ProductGrid 
          productos={productos} 
          cargando={cargando} 
          ajustes={ajustes} 
        />
        
        <section className="hidden xl:flex xl:col-span-1 z-20 shadow-2xl">
          <CartPanel 
            ajustes={ajustes}
            ivaPct={ajustes?.taxPct || 0}
            propinaPct={ajustes?.propinaPct || 0}
            guardarAbierta={(desc) => procesarOrden(false, undefined, undefined, undefined, desc)}
            onCobrar={(desc) => {
              setDescuentoPendiente(desc)
              setCobrando(true)
            }}
            onCobrarSel={(sel, desc) => {
              setDescuentoPendiente(desc)
              setSelPendiente(sel)
              setCobrandoSel(true)
            }}
          />
        </section>
      </main>

      {/* Modal de Cobro Completo */}
      {cobrando && (
        <PaymentModal 
          totalCents={getTotales(ajustes?.taxPct || 0, ajustes?.propinaPct || 0, descuentoPendiente).total}
          ajustes={ajustes}
          onClose={() => setCobrando(false)}
          onConfirm={(metodo, entregado) => {
            setCobrando(false)
            procesarOrden(true, metodo, entregado)
          }}
        />
      )}

      {/* Modal de Cobro Parcial (Dividir cuenta) */}
      {cobrandoSel && (
        <PaymentModal 
          totalCents={(() => {
            // Calculo rápido del total parcial para pasar al modal
            const overrideCarrito: Record<number, Linea> = {}
            for (const [id, qty] of Object.entries(selPendiente)) {
              if (carrito[Number(id)]) {
                overrideCarrito[Number(id)] = { ...carrito[Number(id)], cantidad: qty }
              }
            }
            const sub = Object.values(overrideCarrito).reduce((acc, l) => {
              const base = l.producto.precioCents
              const extraSum = (l.extras||[]).reduce((s, name)=> s + (((l.producto.extras||[]).find(e=>e.nombre===name)?.precioCents) ?? 0), 0)
              return acc + (base + extraSum) * l.cantidad
            }, 0)
            const baseImp = Math.max(0, sub - descuentoPendiente)
            const itebis = Math.round(baseImp * ((ajustes?.taxPct || 0) / 100))
            const propina = Math.round(baseImp * ((ajustes?.propinaPct || 0) / 100))
            return baseImp + itebis + propina
          })()}
          ajustes={ajustes}
          onClose={() => setCobrandoSel(false)}
          onConfirm={(metodo, entregado) => {
            setCobrandoSel(false)
            const overrideCarrito: Record<number, Linea> = {}
            for (const [id, qty] of Object.entries(selPendiente)) {
              if (carrito[Number(id)]) {
                overrideCarrito[Number(id)] = { ...carrito[Number(id)], cantidad: qty }
              }
            }
            procesarOrden(true, metodo, entregado, overrideCarrito)
          }}
        />
      )}

      {/* Modal del Gestor de Mesa */}
      {tableManagerOpen && tipo === 'Mesa' && mesaId && (
        <TableManagerModal
          mesaId={mesaId}
          mesaNombre={mesas.find(m => m.id === mesaId)?.nombre || ''}
          ajustes={ajustes}
          onClose={(changed) => {
            setTableManagerOpen(false)
            if (changed) {
              window.location.reload()
            }
          }}
          onPay={(pedidoId) => {
            setTableManagerOpen(false)
            window.location.href = `/pos?load=${pedidoId}`
          }}
        />
      )}
    </div>
  )
}