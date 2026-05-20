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
import { OpenOrdersSidebar } from '@/components/pos/OpenOrdersSidebar'

export default function POSPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [mesas, setMesas] = useState<{id:number; nombre:string}[]>([])
  const [ajustes, setAjustes] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [subCuentasDisponibles, setSubCuentasDisponibles] = useState<{subCuenta: number; nombreCuenta?: string | null}[]>([{ subCuenta: 1 }])
  
  // Estado local para los modales de pago
  const [cobrando, setCobrando] = useState(false)
  const [cobrandoSel, setCobrandoSel] = useState(false)
  const [descuentoPendiente, setDescuentoPendiente] = useState(0)
  const [selPendiente, setSelPendiente] = useState<Record<number, number>>({})
  const [tableManagerOpen, setTableManagerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { push } = useToast()
  const { confirm } = useConfirm()
  
  const { 
    tipo, mesaId, subCuenta, nombreCuenta, setSubCuenta, setNombreCuenta, setTipo, setMesaId, 
    carrito, editingPedidoId, setEditingPedidoId, setCarrito, vaciarCarrito, limpiarTodo, getTotales
  } = usePosStore()

  const loadOrder = async (pedidoId: number, prods: Producto[]) => {
    const res = await fetch(`/api/pedidos/${pedidoId}`, { cache: 'no-store' })
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
        setEditingPedidoId(pedidoId)
        if (pedido.mesaId) {
          setTipo('Mesa')
          setMesaId(pedido.mesaId)
        }
        if (pedido.subCuenta) setSubCuenta(pedido.subCuenta)
        setNombreCuenta(pedido.nombreCuenta || null)
      }
    }
  }

  const cargarMesaCuenta = async (mId: number, sCuenta: number) => {
    limpiarTodo()
    setTipo('Mesa')
    setMesaId(mId)
    setSubCuenta(sCuenta)
    try {
      const r = await fetch(`/api/pedidos?mesaId=${mId}&estado=ABIERTO&subCuenta=${sCuenta}`, { cache:'no-store' })
      if (r.ok) {
        const lista = await r.json()
        if (Array.isArray(lista) && lista.length) {
          const ord = lista.sort((a:any,b:any)=> b.id - a.id)[0]
          await loadOrder(ord.id, productos)
        }
      }
    } catch {}
  }

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
        await loadOrder(Number(loadId), prods)
        url.searchParams.delete('load')
        window.history.replaceState({}, '', url.toString())
      }
    }).finally(() => setCargando(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleOpen = () => setTableManagerOpen(true)
    const handleSidebar = () => setSidebarOpen(true)
    window.addEventListener('open-table-manager', handleOpen)
    window.addEventListener('open-orders-sidebar', handleSidebar)
    return () => {
      window.removeEventListener('open-table-manager', handleOpen)
      window.removeEventListener('open-orders-sidebar', handleSidebar)
    }
  }, [])

  // Cargar subcuentas disponibles de la mesa
  useEffect(() => {
    if (tipo !== 'Mesa' || !mesaId) { 
      setSubCuentasDisponibles([{ subCuenta: 1 }])
      if (subCuenta !== 1) setSubCuenta(1)
      return 
    }
    fetch(`/api/pedidos?mesaId=${mesaId}&estado=ABIERTO`, { cache:'no-store' })
      .then(r => r.json())
      .then((ps: Array<{ subCuenta?: number; nombreCuenta?: string | null }>) => {
        const cuentasMap = new Map<number, string | null>()
        ps.forEach(p => {
           if (!cuentasMap.has(p.subCuenta || 1) || p.nombreCuenta) {
              cuentasMap.set(p.subCuenta || 1, p.nombreCuenta || null)
           }
        })
        const nums = Array.from(cuentasMap.keys()).sort((a,b)=>a-b)
        const arr = nums.map(n => ({ subCuenta: n, nombreCuenta: cuentasMap.get(n) }))
        if (!nums.includes(subCuenta)) {
           arr.push({ subCuenta })
           arr.sort((a,b) => a.subCuenta - b.subCuenta)
        }
        setSubCuentasDisponibles(arr.length ? arr : [{ subCuenta: 1 }])
      }).catch(()=>{})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, mesaId])

  // Lógica para enviar orden (Guardar o Cobrar)
  const procesarOrden = async (
    esCobro: boolean, 
    metodoPago?: MetodoPago, 
    montoEntregado?: number, 
    overrideCarrito?: Record<number, Linea>, 
    descuentoForce?: number, 
    printPrecuenta?: boolean,
    ncfTipo?: string,
    rncCedula?: string,
    nombreCliente?: string
  ) => {
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
      descuentoCents: descActual,
      ncfTipo: ncfTipo || 'B02',
      notas: ncfTipo === 'B01' && rncCedula ? `RNC: ${rncCedula}\nNombre: ${nombreCliente || ''}` : undefined,
      ...(nombreCuenta !== null && { nombreCuenta })
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
              const ps = await scRes.json()
              const cuentasMap = new Map<number, string | null>()
              ps.forEach((p: any) => {
                 if (!cuentasMap.has(p.subCuenta || 1) || p.nombreCuenta) {
                    cuentasMap.set(p.subCuenta || 1, p.nombreCuenta || null)
                 }
              })
              const nums = Array.from(cuentasMap.keys()).sort((a,b)=>a-b)
              const arr = nums.map(n => ({ subCuenta: n, nombreCuenta: cuentasMap.get(n) }))
              setSubCuentasDisponibles(arr.length ? arr : [{ subCuenta: 1 }])
              if (nums.length > 0 && !nums.includes(subCuenta)) {
                setSubCuenta(nums[0])
              }
            }
          } catch {}
        }
      } else {
        if (printPrecuenta && data?.pedidoId) {
          // Imprimir Pre-cuenta
          try {
            const linkRes = await fetch(`/api/tickets/signed-link/${data.pedidoId}`)
            if (linkRes.ok) {
              const j = await linkRes.json()
              window.open(j.url + (j.url.includes('?')?'&':'?') + 'print=1', '_blank')
            } else {
              window.open(`/ticket/${data.pedidoId}?print=1`, '_blank')
            }
          } catch { window.open(`/ticket/${data.pedidoId}?print=1`, '_blank') }
        }
        limpiarTodo()
        if (data?.autoKitchen) fetch(`/api/print/kitchen/${data.pedidoId}`).catch(()=>{})
        push(printPrecuenta ? 'Pre-cuenta impresa y guardada' : 'Orden guardada y pantalla lista', 'success')
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

      {tipo === 'Mesa' && mesaId && (
        <div className="bg-white border-b border-slate-200 px-3 md:px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">Cuentas:</span>
          {subCuentasDisponibles.map(sc => (
            <button
              key={sc.subCuenta}
              onClick={() => {
                if (subCuenta === sc.subCuenta) {
                  const newName = prompt('Personalizar nombre de cuenta (opcional):', nombreCuenta || sc.nombreCuenta || '')
                  if (newName !== null) {
                    setNombreCuenta(newName.trim() || null)
                  }
                  return
                }
                if (Object.keys(carrito).length > 0 && subCuenta !== sc.subCuenta) {
                  if (!confirm('Tienes productos sin guardar en esta cuenta. ¿Seguro que quieres cambiar de cuenta y perderlos?')) return
                }
                cargarMesaCuenta(mesaId, sc.subCuenta)
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                subCuenta === sc.subCuenta 
                ? 'bg-amber-100 text-amber-800 border-2 border-amber-400' 
                : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
              }`}
              title={subCuenta === sc.subCuenta ? "Haz clic de nuevo para cambiar el nombre" : ""}
            >
              {(subCuenta === sc.subCuenta && nombreCuenta) ? nombreCuenta : (sc.nombreCuenta ? sc.nombreCuenta : `C${sc.subCuenta}`)}
            </button>
          ))}
          <button
            onClick={() => {
              if (Object.keys(carrito).length > 0) {
                if (!confirm('Tienes productos sin guardar. ¿Seguro que quieres abrir una nueva cuenta y perderlos?')) return
              }
              const newName = prompt('Nombre para la nueva cuenta (opcional):')
              if (newName === null) return
              const maxSc = Math.max(...subCuentasDisponibles.map(s => s.subCuenta), 0)
              const nueva = maxSc + 1
              limpiarTodo()
              setTipo('Mesa')
              setMesaId(mesaId)
              setSubCuenta(nueva)
              setNombreCuenta(newName.trim() || null)
              setSubCuentasDisponibles([...subCuentasDisponibles, { subCuenta: nueva, nombreCuenta: newName.trim() || undefined }])
            }}
            className="px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all bg-slate-50 text-amber-600 border-2 border-dashed border-amber-300 hover:bg-amber-50 hover:border-amber-400 flex items-center gap-1 flex-shrink-0"
          >
            + Nueva
          </button>
        </div>
      )}
      
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-y-hidden">
        <div className="h-[55vh] lg:flex-1 lg:min-h-0 lg:h-auto w-full lg:w-2/3 flex flex-col flex-shrink-0">
          <ProductGrid 
            productos={productos} 
            cargando={cargando} 
            ajustes={ajustes} 
          />
        </div>
        
        <section className="min-h-[65vh] lg:h-auto lg:min-h-0 w-full lg:w-1/3 flex flex-col z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] bg-white border-t lg:border-t-0 flex-shrink-0">
          <CartPanel 
            ajustes={ajustes}
            ivaPct={ajustes?.taxPct || 0}
            propinaPct={ajustes?.propinaPct || 0}
            guardarAbierta={(desc, print) => procesarOrden(false, undefined, undefined, undefined, desc, print)}
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
          onConfirm={(metodo, entregado, ncfTipo, rnc, nombre) => {
            setCobrando(false)
            procesarOrden(true, metodo, entregado, undefined, undefined, false, ncfTipo, rnc, nombre)
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
          onConfirm={(metodo, entregado, ncfTipo, rnc, nombre) => {
            setCobrandoSel(false)
            const overrideCarrito: Record<number, Linea> = {}
            for (const [id, qty] of Object.entries(selPendiente)) {
              if (carrito[Number(id)]) {
                overrideCarrito[Number(id)] = { ...carrito[Number(id)], cantidad: qty }
              }
            }
            procesarOrden(true, metodo, entregado, overrideCarrito, undefined, false, ncfTipo, rnc, nombre)
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
      {/* Sidebar de Órdenes Abiertas */}
      <OpenOrdersSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ajustes={ajustes}
        onSelectOrder={async (id) => {
          setCargando(true)
          await loadOrder(id, productos)
          setCargando(false)
        }}
      />
    </div>
  )
}