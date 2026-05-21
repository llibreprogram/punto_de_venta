/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 */

"use client"
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useToast } from '@/components/ui/Providers'
import {
  Wallet, Landmark, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Plus,
  Calendar, Layers, CheckCircle2, ChevronRight, Search, FileText,
  DollarSign, Clock, Users, Building, PlusCircle, CreditCard, Paperclip
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area } from 'recharts'

type Banco = {
  id: number
  nombre: string
  banco: string
  tipoCuenta: string
  numeroCuenta: string | null
  cuentaContableId: number
  cuentaContable: {
    id: number
    codigo: string
    nombre: string
  }
  activa: boolean
  saldoCents: number
  movimientos?: Movimiento[]
}

type Movimiento = {
  id: number
  cuentaBancariaId: number
  tipo: string
  montoCents: number
  descripcion: string
  referencia: string | null
  fecha: string
}

type Proveedor = {
  id: number
  nombre: string
}

type DocumentoCXP = {
  id: number
  proveedorId: number | null
  proveedor: Proveedor | null
  categoria: string
  descripcion: string
  ncf: string | null
  montoCents: number
  pagadoCents: number
  estado: string
  fechaVencimiento: string | null
  fechaDocumento: string
  pagos: Array<{ id: number; montoCents: number; fecha: string }>
  facturaEscaneadaUrl: string | null
}

type DocumentoCXC = {
  id: number
  clienteNombre: string
  clienteRnc: string | null
  clienteTelefono: string | null
  descripcion: string
  ncf: string | null
  montoCents: number
  cobradoCents: number
  estado: string
  fechaVencimiento: string | null
  fechaDocumento: string
  cobros: Array<{ id: number; montoCents: number; fecha: string }>
}

type CuentaContable = {
  id: number
  codigo: string
  nombre: string
  tipo: string
}

export default function TesorereriaDashboard() {
  const [activeTab, setActiveTab] = useState<'bancos' | 'cxp' | 'cxc'>('bancos')
  const { push } = useToast()

  const getSparklineData = (banco: Banco) => {
    const movs = [...(banco.movimientos || [])].reverse()
    if (movs.length === 0) {
      return [{ balance: banco.saldoCents / 100 }, { balance: banco.saldoCents / 100 }]
    }
    
    let current = banco.saldoCents / 100
    const points = [{ balance: current }]
    
    for (let i = movs.length - 1; i >= 0; i--) {
      const m = movs[i]
      const isIn = ['DEPOSITO', 'TRANSFERENCIA_IN', 'COBRO_CXC'].includes(m.tipo)
      const amount = m.montoCents / 100
      if (isIn) {
        current -= amount
      } else {
        current += amount
      }
      points.unshift({ balance: current })
    }
    return points
  }

  // General accounts & loading
  const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  // Bancos States
  const [bancos, setBancos] = useState<Banco[]>([])
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loadingBancos, setLoadingBancos] = useState(false)

  // CXP States
  const [cxpDocs, setCxpDocs] = useState<DocumentoCXP[]>([])
  const [cxpSummary, setCxpSummary] = useState({ totalPendienteCents: 0, totalPagadoMesCents: 0, vencidos: 0 })
  const [loadingCxp, setLoadingCxp] = useState(false)
  const [filterCxpProveedor, setFilterCxpProveedor] = useState('')
  const [filterCxpEstado, setFilterCxpEstado] = useState('TODOS')

  // CXC States
  const [cxcDocs, setCxcDocs] = useState<DocumentoCXC[]>([])
  const [cxcSummary, setCxcSummary] = useState({ totalPendienteCents: 0, totalCobradoMesCents: 0 })
  const [loadingCxc, setLoadingCxc] = useState(false)
  const [filterCxcEstado, setFilterCxcEstado] = useState('TODOS')

  // Modals
  const [showAddBancoModal, setShowAddBancoModal] = useState(false)
  const [showMovBancoModal, setShowMovBancoModal] = useState(false) // Deposito, Retiro, Transferencia
  const [showAddCxpModal, setShowAddCxpModal] = useState(false)
  const [showAddCxcModal, setShowAddCxcModal] = useState(false)
  const [showPayCxpModal, setShowPayCxpModal] = useState(false)
  const [showCollectCxcModal, setShowCollectCxcModal] = useState(false)

  // Forms
  const [newBanco, setNewBanco] = useState({ nombre: '', banco: '', tipoCuenta: 'CORRIENTE', numeroCuenta: '', cuentaContableId: '' })
  const [newMov, setNewMov] = useState({ tipo: 'DEPOSITO', monto: '', descripcion: '', referencia: '', cuentaDestinoId: '' })
  const [newCxp, setNewCxp] = useState({ proveedorId: '', categoria: 'OTROS', descripcion: '', ncf: '', monto: '', fechaVencimiento: '', facturaEscaneadaUrl: '' })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [newCxc, setNewCxc] = useState({ clienteNombre: '', clienteRnc: '', clienteTelefono: '', descripcion: '', ncf: '', monto: '', fechaVencimiento: '' })
  const [payCxp, setPayCxp] = useState<{ docId: number; monto: string; metodoPago: string; referencia: string; totalCents: number; pagadoCents: number; desc: string } | null>(null)
  const [collectCxc, setCollectCxc] = useState<{ docId: number; monto: string; metodoPago: string; referencia: string; totalCents: number; cobradoCents: number; desc: string } | null>(null)

  // Load basic seed options
  useEffect(() => {
    fetch('/api/contabilidad/cuentas')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          // Filter only Asset accounts that are under cash/bank group 1.1.01 or similar
          const filtered = data.cuentas.filter((c: any) => c.tipo === 'ACTIVO' && c.codigo.startsWith('1.1.01'))
          setCuentasContables(filtered)
        }
      })
      .catch(console.error)

    fetch('/api/proveedores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProveedores(data)
      })
      .catch(console.error)
  }, [])

  // Load Bancos
  const loadBancos = async () => {
    try {
      setLoadingBancos(true)
      const res = await fetch('/api/tesoreria/bancos')
      const data = await res.json()
      if (Array.isArray(data)) {
        setBancos(data)
        if (data.length > 0 && !selectedBanco) {
          setSelectedBanco(data[0])
        }
      }
    } catch (err) {
      push('Error al cargar bancos', 'error')
    } finally {
      setLoadingBancos(false)
    }
  }

  // Load movements when selectedBanco changes
  useEffect(() => {
    if (selectedBanco) {
      fetch(`/api/tesoreria/bancos/${selectedBanco.id}/movimientos`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMovimientos(data)
        })
        .catch(console.error)
    } else {
      setMovimientos([])
    }
  }, [selectedBanco])

  // Load CXP
  const loadCxp = async () => {
    try {
      setLoadingCxp(true)
      const params = new URLSearchParams()
      params.set('estado', filterCxpEstado)
      if (filterCxpProveedor) params.set('proveedorId', filterCxpProveedor)
      const res = await fetch(`/api/tesoreria/cxp?${params.toString()}`)
      const data = await res.json()
      if (data.docs) {
        setCxpDocs(data.docs)
        setCxpSummary({
          totalPendienteCents: data.totalPendienteCents,
          totalPagadoMesCents: data.totalPagadoMesCents,
          vencidos: data.vencidos
        })
      }
    } catch (err) {
      push('Error al cargar cuentas por pagar', 'error')
    } finally {
      setLoadingCxp(false)
    }
  }

  // Load CXC
  const loadCxc = async () => {
    try {
      setLoadingCxc(true)
      const params = new URLSearchParams()
      params.set('estado', filterCxcEstado)
      const res = await fetch(`/api/tesoreria/cxc?${params.toString()}`)
      const data = await res.json()
      if (data.docs) {
        setCxcDocs(data.docs)
        setCxcSummary({
          totalPendienteCents: data.totalPendienteCents,
          totalCobradoMesCents: data.totalCobradoMesCents
        })
      }
    } catch (err) {
      push('Error al cargar cuentas por cobrar', 'error')
    } finally {
      setLoadingCxc(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'bancos') loadBancos()
    if (activeTab === 'cxp') loadCxp()
    if (activeTab === 'cxc') loadCxc()
  }, [activeTab, filterCxpProveedor, filterCxpEstado, filterCxcEstado])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        if (activeTab === 'bancos') {
          setNewBanco({ nombre: '', banco: '', tipoCuenta: 'CORRIENTE', numeroCuenta: '', cuentaContableId: '' })
          setShowAddBancoModal(true)
        } else if (activeTab === 'cxp') {
          setNewCxp({ proveedorId: '', categoria: 'OTROS', descripcion: '', ncf: '', monto: '', fechaVencimiento: '', facturaEscaneadaUrl: '' })
          setShowAddCxpModal(true)
        } else if (activeTab === 'cxc') {
          setNewCxc({ clienteNombre: '', clienteRnc: '', clienteTelefono: '', descripcion: '', ncf: '', monto: '', fechaVencimiento: '' })
          setShowAddCxcModal(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  // Submit Add Banco
  const handleAddBanco = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/tesoreria/bancos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBanco)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      push('Banco agregado exitosamente', 'success')
      setShowAddBancoModal(false)
      setNewBanco({ nombre: '', banco: '', tipoCuenta: 'CORRIENTE', numeroCuenta: '', cuentaContableId: '' })
      loadBancos()
    } catch (err: any) {
      push(err.message || 'Error al guardar banco', 'error')
    }
  }

  // Submit Bank Movement
  const handleBancoMov = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBanco) return
    try {
      const cents = Math.round(parseFloat(newMov.monto) * 100)
      const res = await fetch(`/api/tesoreria/bancos/${selectedBanco.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: newMov.tipo,
          montoCents: cents,
          descripcion: newMov.descripcion,
          referencia: newMov.referencia,
          cuentaDestinoId: newMov.tipo === 'TRANSFERENCIA' ? newMov.cuentaDestinoId : undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      push('Movimiento registrado exitosamente', 'success')
      setShowMovBancoModal(false)
      setNewMov({ tipo: 'DEPOSITO', monto: '', descripcion: '', referencia: '', cuentaDestinoId: '' })
      loadBancos()
    } catch (err: any) {
      push(err.message || 'Error al registrar movimiento', 'error')
    }
  }

  // Submit Add CXP
  const handleAddCxp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const cents = Math.round(parseFloat(newCxp.monto) * 100)
      const res = await fetch('/api/tesoreria/cxp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCxp,
          montoCents: cents
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      push('Deuda registrada exitosamente', 'success')
      setShowAddCxpModal(false)
      setNewCxp({ proveedorId: '', categoria: 'OTROS', descripcion: '', ncf: '', monto: '', fechaVencimiento: '', facturaEscaneadaUrl: '' })
      loadCxp()
    } catch (err: any) {
      push(err.message || 'Error al guardar cuenta por pagar', 'error')
    }
  }

  // Handle scanned invoice upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewCxp(prev => ({ ...prev, facturaEscaneadaUrl: data.url }))
      push('Comprobante digitalizado con éxito', 'success')
    } catch (err: any) {
      push(err.message || 'Error al digitalizar el comprobante', 'error')
    } finally {
      setUploadingFile(false)
    }
  }

  // Submit Add CXC
  const handleAddCxc = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const cents = Math.round(parseFloat(newCxc.monto) * 100)
      const res = await fetch('/api/tesoreria/cxc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCxc,
          montoCents: cents
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      push('Cuenta por cobrar registrada', 'success')
      setShowAddCxcModal(false)
      setNewCxc({ clienteNombre: '', clienteRnc: '', clienteTelefono: '', descripcion: '', ncf: '', monto: '', fechaVencimiento: '' })
      loadCxc()
    } catch (err: any) {
      push(err.message || 'Error al guardar cuenta por cobrar', 'error')
    }
  }

  // Submit Pay CXP
  const handlePayCxp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payCxp) return
    try {
      const cents = Math.round(parseFloat(payCxp.monto) * 100)
      const res = await fetch(`/api/tesoreria/cxp/${payCxp.docId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoCents: cents,
          metodoPago: payCxp.metodoPago,
          referencia: payCxp.referencia
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      push('Pago registrado con éxito', 'success')
      setShowPayCxpModal(false)
      setPayCxp(null)
      loadCxp()
    } catch (err: any) {
      push(err.message || 'Error al registrar pago', 'error')
    }
  }

  // Submit Collect CXC
  const handleCollectCxc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectCxc) return
    try {
      const cents = Math.round(parseFloat(collectCxc.monto) * 100)
      const res = await fetch(`/api/tesoreria/cxc/${collectCxc.docId}/cobrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoCents: cents,
          metodoPago: collectCxc.metodoPago,
          referencia: collectCxc.referencia
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      push('Cobro registrado con éxito', 'success')
      setShowCollectCxcModal(false)
      setCollectCxc(null)
      loadCxc()
    } catch (err: any) {
      push(err.message || 'Error al registrar cobro', 'error')
    }
  }

  return (
    <AdminLayout
      title="Gestión de Tesorería"
      actions={
        <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('bancos')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'bancos'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800/40'
            }`}
          >
            <Landmark size={14} /> Bancos y Caja
          </button>
          <button
            onClick={() => setActiveTab('cxp')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'cxp'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800/40'
            }`}
          >
            <ArrowDownRight size={14} /> Cuentas por Pagar (CXP)
          </button>
          <button
            onClick={() => setActiveTab('cxc')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'cxc'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800/40'
            }`}
          >
            <ArrowUpRight size={14} /> Cuentas por Cobrar (CXC)
          </button>
        </div>
      }
    >
      {/* TAB 1: BANCOS Y CAJA */}
      {activeTab === 'bancos' && (
        <div className="grid gap-6">
          {/* BANCOS SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <Landmark size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo Total Bancos</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  RD$ {(bancos.reduce((s, b) => s + b.saldoCents, 0) / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cuentas Activas</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  {bancos.filter(b => b.activa).length} Cuentas
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600 dark:text-amber-400">
                <ArrowLeftRight size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Últimos Movimientos</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  {movimientos.length} Transacciones
                </h3>
              </div>
            </div>
          </div>

          {/* ANÁLISIS DE DISTRIBUCIÓN DE FONDOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="md:col-span-1 flex flex-col gap-2 justify-center">
              <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">Distribución de Fondos</h4>
              <p className="text-[11px] text-slate-400">Distribución porcentual de los recursos líquidos de la empresa entre las cuentas de tesorería.</p>
              
              <div className="grid gap-1.5 mt-2">
                {bancos.filter(b => b.saldoCents > 0).map((b, idx) => {
                  const total = bancos.reduce((s, x) => s + Math.max(0, x.saldoCents), 0)
                  const pct = total > 0 ? (b.saldoCents / total) * 100 : 0
                  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
                  const color = colors[idx % colors.length]
                  return (
                    <div key={b.id} className="flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        {b.nombre}
                      </span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="md:col-span-2 h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bancos.filter(b => b.saldoCents > 0).map((b, idx) => ({
                      name: b.nombre,
                      value: b.saldoCents / 100
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {bancos.filter(b => b.saldoCents > 0).map((b, idx) => {
                      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
                      return <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(value: any) => [`RD$ ${parseFloat(value).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, 'Saldo']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CUENTAS LIST */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">Cuentas Bancarias</h4>
                <button
                  onClick={() => setShowAddBancoModal(true)}
                  className="btn bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl flex items-center justify-center transition-all duration-200"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {loadingBancos ? (
                  <div className="flex flex-col gap-2.5 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800/20" />
                    ))}
                  </div>
                ) : (
                  bancos.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBanco(b)}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex justify-between items-center ${
                      selectedBanco?.id === b.id
                        ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20 hover:border-slate-350 dark:hover:border-slate-700'
                    } ${!b.activa ? 'opacity-60' : ''}`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="text-xs font-black text-slate-850 dark:text-slate-100 flex items-center gap-1.5 truncate">
                        {b.nombre}
                        {!b.activa && (
                          <span className="px-1.5 py-0.5 text-[8px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-bold uppercase tracking-wider flex-shrink-0">
                            Inactivo
                          </span>
                        )}
                      </h5>
                      <p className="text-[10px] text-slate-500 font-bold truncate">{b.banco} ({b.tipoCuenta})</p>
                      {b.numeroCuenta && <p className="text-[10px] text-slate-400 truncate">No. {b.numeroCuenta}</p>}
                    </div>

                    {/* Sparkline mini-gráfico */}
                    {b.activa && (
                      <div className="w-20 h-8 flex-shrink-0 hidden sm:block">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getSparklineData(b)}>
                            <defs>
                              <linearGradient id={`colorSpark-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={b.saldoCents >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.25}/>
                                <stop offset="95%" stopColor={b.saldoCents >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="balance"
                              stroke={b.saldoCents >= 0 ? '#10b981' : '#ef4444'}
                              strokeWidth={1.5}
                              fillOpacity={1}
                              fill={`url(#colorSpark-${b.id})`}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-black ${b.saldoCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        RD$ {(b.saldoCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                      
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm(`¿Seguro que deseas ${b.activa ? 'archivar/desactivar' : 'reactivar'} esta cuenta bancaria?`)) {
                            try {
                              const res = await fetch('/api/tesoreria/bancos', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: b.id })
                              })
                              if (!res.ok) throw new Error('Error al cambiar estado')
                              push(`Cuenta bancaria ${b.activa ? 'archivada' : 'reactivada'} con éxito`, 'success')
                              loadBancos()
                            } catch (err: any) {
                              push(err.message || 'Error al cambiar estado de la cuenta', 'error')
                            }
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                          b.activa 
                            ? 'border-slate-200 hover:bg-red-50 hover:text-red-650 dark:border-slate-800 dark:hover:bg-red-950/20' 
                            : 'border-emerald-500 bg-emerald-50 text-emerald-650 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400'
                        }`}
                      >
                        {b.activa ? 'Archivar' : 'Reactivar'}
                      </button>
                    </div>
                  </div>
                ))
               )}
                {!loadingBancos && bancos.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No hay cuentas bancarias registradas.</p>
                )}
              </div>
            </div>

            {/* HISTORIAL MOVIMIENTOS */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">Historial de Movimientos</h4>
                  {selectedBanco && <p className="text-[10px] text-slate-500 font-bold">Cuenta: {selectedBanco.nombre}</p>}
                </div>
                {selectedBanco && (
                  <button
                    onClick={() => setShowMovBancoModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <PlusCircle size={14} /> Registrar Transacción
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-500 font-bold">
                      <th className="py-2.5">Fecha</th>
                      <th className="py-2.5">Tipo</th>
                      <th className="py-2.5">Descripción</th>
                      <th className="py-2.5">Referencia</th>
                      <th className="py-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => {
                      const isIn = ['DEPOSITO', 'TRANSFERENCIA_IN', 'COBRO_CXC'].includes(m.tipo)
                      return (
                        <tr key={m.id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/20">
                          <td className="py-3 text-[10px] font-bold text-slate-500">
                            {new Date(m.fecha).toLocaleDateString('es-DO')}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              isIn ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450' : 'bg-red-50 dark:bg-red-950/30 text-red-550'
                            }`}>
                              {m.tipo}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-slate-700 dark:text-slate-350">{m.descripcion}</td>
                          <td className="py-3 text-[10px] text-slate-500 font-bold">{m.referencia || '-'}</td>
                          <td className={`py-3 text-right font-black ${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {isIn ? '+' : '-'} RD$ {(m.montoCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })}
                    {movimientos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-500">No hay movimientos registrados para esta cuenta.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUENTAS POR PAGAR (CXP) */}
      {activeTab === 'cxp' && (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl text-red-600 dark:text-red-400">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Pendiente CXP</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  RD$ {(cxpSummary.totalPendienteCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pagado Este Mes</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  RD$ {(cxpSummary.totalPagadoMesCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl text-amber-600 dark:text-amber-400">
                <Layers size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deudas Vencidas</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  {cxpSummary.vencidos} Facturas
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterCxpEstado}
                  onChange={(e) => setFilterCxpEstado(e.target.value)}
                  className="input text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2"
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="PARCIAL">Parciales</option>
                  <option value="PAGADO">Pagados</option>
                </select>

                <select
                  value={filterCxpProveedor}
                  onChange={(e) => setFilterCxpProveedor(e.target.value)}
                  className="input text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2"
                >
                  <option value="">Todos los Proveedores</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowAddCxpModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus size={14} /> Registrar Deuda / Gasto
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-500 font-bold">
                    <th className="py-2.5">Proveedor</th>
                    <th className="py-2.5">Categoría</th>
                    <th className="py-2.5">Descripción</th>
                    <th className="py-2.5">NCF</th>
                    <th className="py-2.5">Soporte</th>
                    <th className="py-2.5">Vencimiento</th>
                    <th className="py-2.5">Monto</th>
                    <th className="py-2.5">Restante</th>
                    <th className="py-2.5">Estado</th>
                    <th className="py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCxp ? (
                    [1, 2, 3, 4].map((i) => (
                      <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-900/60">
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-8" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" /></td>
                        <td className="py-4 text-right"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
                      </tr>
                    ))
                  ) : (
                    cxpDocs.map((d) => {
                    const restante = d.montoCents - d.pagadoCents
                    return (
                      <tr key={d.id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="py-3.5 font-bold text-slate-850 dark:text-slate-150">
                          {d.proveedor?.nombre || 'General / Varios'}
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                            {d.categoria}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-700 dark:text-slate-350">{d.descripcion}</td>
                        <td className="py-3.5 font-mono text-[10px] text-slate-500 font-bold">{d.ncf || '-'}</td>
                        <td className="py-3.5">
                          {d.facturaEscaneadaUrl ? (
                            <a
                              href={d.facturaEscaneadaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
                            >
                              <Paperclip size={10} className="shrink-0" />
                              Ver Factura
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-405 italic">Sin escáner</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          {(() => {
                            if (!d.fechaVencimiento || d.estado === 'PAGADO') {
                              return <span className="text-[10px] font-bold text-slate-400">{d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString('es-DO') : '-'}</span>
                            }
                            const hoy = new Date()
                            const venc = new Date(d.fechaVencimiento)
                            const diffMs = venc.getTime() - hoy.getTime()
                            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                            
                            if (diffDays < 0) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                  <div>
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block">{Math.abs(diffDays)}d vencido</span>
                                    <span className="text-[9px] text-red-400 dark:text-red-500">{venc.toLocaleDateString('es-DO')}</span>
                                  </div>
                                </div>
                              )
                            } else if (diffDays <= 7) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                  <div>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">{diffDays === 0 ? 'Hoy' : `${diffDays}d restantes`}</span>
                                    <span className="text-[9px] text-amber-400 dark:text-amber-500">{venc.toLocaleDateString('es-DO')}</span>
                                  </div>
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                  <div>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">{diffDays}d restantes</span>
                                    <span className="text-[9px] text-slate-400">{venc.toLocaleDateString('es-DO')}</span>
                                  </div>
                                </div>
                              )
                            }
                          })()}
                        </td>
                        <td className="py-3.5 font-bold text-slate-850 dark:text-slate-200">
                          RD$ {(d.montoCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 font-black text-slate-850 dark:text-slate-100">
                          RD$ {(restante / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            d.estado === 'PAGADO' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' :
                            d.estado === 'PARCIAL' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' :
                            'bg-red-50 dark:bg-red-950/30 text-red-500'
                          }`}>
                            {d.estado}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {restante > 0 && (
                            <button
                              onClick={() => {
                                setPayCxp({
                                  docId: d.id,
                                  monto: (restante / 100).toString(),
                                  metodoPago: 'TRANSFERENCIA',
                                  referencia: '',
                                  totalCents: d.montoCents,
                                  pagadoCents: d.pagadoCents,
                                  desc: d.descripcion
                                })
                                setShowPayCxpModal(true)
                              }}
                              className="px-3 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition"
                            >
                              Pagar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                 )}
                  {!loadingCxp && cxpDocs.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-slate-500 font-medium">No hay cuentas por pagar registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUENTAS POR COBRAR (CXC) */}
      {activeTab === 'cxc' && (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Pendiente CXC</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  RD$ {(cxcSummary.totalPendienteCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cobrado Este Mes</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100">
                  RD$ {(cxcSummary.totalCobradoMesCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <select
                value={filterCxcEstado}
                onChange={(e) => setFilterCxcEstado(e.target.value)}
                className="input text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="PARCIAL">Parciales</option>
                <option value="COBRADO">Cobrados</option>
              </select>

              <button
                onClick={() => setShowAddCxcModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus size={14} /> Registrar Crédito
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-500 font-bold">
                    <th className="py-2.5">Cliente</th>
                    <th className="py-2.5">Contacto / RNC</th>
                    <th className="py-2.5">Descripción</th>
                    <th className="py-2.5">NCF</th>
                    <th className="py-2.5">Vencimiento</th>
                    <th className="py-2.5">Monto</th>
                    <th className="py-2.5">Restante</th>
                    <th className="py-2.5">Estado</th>
                    <th className="py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCxc ? (
                    [1, 2, 3, 4].map((i) => (
                      <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-900/60">
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" /></td>
                        <td className="py-4 text-right"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
                      </tr>
                    ))
                  ) : (
                    cxcDocs.map((d) => {
                    const restante = d.montoCents - d.cobradoCents
                    return (
                      <tr key={d.id} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/20">
                        <td className="py-3.5 font-bold text-slate-850 dark:text-slate-150">
                          {d.clienteNombre}
                        </td>
                        <td className="py-3.5 text-slate-500 font-bold">
                          {d.clienteRnc || d.clienteTelefono || '-'}
                        </td>
                        <td className="py-3.5 text-slate-700 dark:text-slate-350">{d.descripcion}</td>
                        <td className="py-3.5 font-mono text-[10px] text-slate-500 font-bold">{d.ncf || '-'}</td>
                        <td className="py-3.5">
                          {(() => {
                            if (!d.fechaVencimiento || d.estado === 'COBRADO') {
                              return <span className="text-[10px] font-bold text-slate-400">{d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString('es-DO') : '-'}</span>
                            }
                            const hoy = new Date()
                            const venc = new Date(d.fechaVencimiento)
                            const diffMs = hoy.getTime() - venc.getTime()
                            const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                            const daysUntil = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

                            let agingLabel = ''
                            let agingColor = ''
                            if (daysOverdue > 90) { agingLabel = '+90d'; agingColor = 'bg-red-600 text-white' }
                            else if (daysOverdue > 60) { agingLabel = '61-90d'; agingColor = 'bg-red-500 text-white' }
                            else if (daysOverdue > 30) { agingLabel = '31-60d'; agingColor = 'bg-amber-500 text-white' }
                            else if (daysOverdue > 0) { agingLabel = '1-30d'; agingColor = 'bg-amber-400 text-amber-900' }

                            if (daysUntil < 0) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                  <div>
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block">{Math.abs(daysUntil)}d vencido</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${agingColor}`}>{agingLabel}</span>
                                      <span className="text-[9px] text-red-400">{venc.toLocaleDateString('es-DO')}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            } else if (daysUntil <= 7) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                  <div>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">{daysUntil === 0 ? 'Hoy' : `${daysUntil}d restantes`}</span>
                                    <span className="text-[9px] text-amber-400">{venc.toLocaleDateString('es-DO')}</span>
                                  </div>
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                  <div>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">{daysUntil}d restantes</span>
                                    <span className="text-[9px] text-slate-400">{venc.toLocaleDateString('es-DO')}</span>
                                  </div>
                                </div>
                              )
                            }
                          })()}
                        </td>
                        <td className="py-3.5 font-bold text-slate-850 dark:text-slate-200">
                          RD$ {(d.montoCents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 font-black text-slate-850 dark:text-slate-100">
                          RD$ {(restante / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            d.estado === 'COBRADO' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' :
                            d.estado === 'PARCIAL' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' :
                            'bg-red-50 dark:bg-red-950/30 text-red-500'
                          }`}>
                            {d.estado}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {restante > 0 && (
                            <button
                              onClick={() => {
                                setCollectCxc({
                                  docId: d.id,
                                  monto: (restante / 100).toString(),
                                  metodoPago: 'EFECTIVO',
                                  referencia: '',
                                  totalCents: d.montoCents,
                                  cobradoCents: d.cobradoCents,
                                  desc: d.descripcion
                                })
                                setShowCollectCxcModal(true)
                              }}
                              className="px-3 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition"
                            >
                              Cobrar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                 )}
                  {!loadingCxc && cxcDocs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-6 text-slate-500 font-medium">No hay cuentas por cobrar registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD BANCO */}
      {showAddBancoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4">Nueva Cuenta Bancaria</h4>
            <form onSubmit={handleAddBanco} className="grid gap-4 text-xs">
              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Nombre Descriptivo</label>
                <input
                  type="text" required placeholder="Ej: Cuenta Principal"
                  value={newBanco.nombre} onChange={e => setNewBanco({ ...newBanco, nombre: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Banco / Institución</label>
                <input
                  type="text" required placeholder="Ej: Banco Popular"
                  value={newBanco.banco} onChange={e => setNewBanco({ ...newBanco, banco: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Tipo Cuenta</label>
                  <select
                    value={newBanco.tipoCuenta} onChange={e => setNewBanco({ ...newBanco, tipoCuenta: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  >
                    <option value="CORRIENTE">Corriente</option>
                    <option value="AHORRO">Ahorros</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Número Cuenta (Opcional)</label>
                  <input
                    type="text" placeholder="Ej: 7723..."
                    value={newBanco.numeroCuenta} onChange={e => setNewBanco({ ...newBanco, numeroCuenta: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Cuenta Contable Asociada</label>
                <select
                  required value={newBanco.cuentaContableId}
                  onChange={e => setNewBanco({ ...newBanco, cuentaContableId: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                >
                  <option value="">Seleccione Cuenta Contable</option>
                  {cuentasContables.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button" onClick={() => setShowAddBancoModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Guardar Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR TRANSACCIÓN BANCARIA */}
      {showMovBancoModal && selectedBanco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-2">Registrar Movimiento</h4>
            <p className="text-[10px] text-slate-500 font-bold mb-4">Cuenta: {selectedBanco.nombre}</p>
            <form onSubmit={handleBancoMov} className="grid gap-4 text-xs">
              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Tipo de Transacción</label>
                <select
                  value={newMov.tipo} onChange={e => setNewMov({ ...newMov, tipo: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                >
                  <option value="DEPOSITO">Depósito (Entrada desde Caja Chica)</option>
                  <option value="RETIRO">Retiro (Salida a Caja Chica)</option>
                  <option value="TRANSFERENCIA">Transferencia (A otra cuenta bancaria)</option>
                </select>
              </div>

              {newMov.tipo === 'TRANSFERENCIA' && (
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Cuenta Destino</label>
                  <select
                    required value={newMov.cuentaDestinoId}
                    onChange={e => setNewMov({ ...newMov, cuentaDestinoId: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Seleccione Cuenta Destino</option>
                    {bancos.filter(b => b.activa && b.id !== selectedBanco.id).map(b => (
                      <option key={b.id} value={b.id}>{b.nombre} (RD$ {(b.saldoCents / 100).toFixed(2)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Monto (RD$)</label>
                  <input
                    type="number" step="0.01" required min="0.01" placeholder="0.00"
                    value={newMov.monto} onChange={e => setNewMov({ ...newMov, monto: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Referencia / Comprobante</label>
                  <input
                    type="text" placeholder="Ej: Dep-0092"
                    value={newMov.referencia} onChange={e => setNewMov({ ...newMov, referencia: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Descripción / Concepto</label>
                <input
                  type="text" required placeholder="Ej: Depósito de efectivo diario"
                  value={newMov.descripcion} onChange={e => setNewMov({ ...newMov, descripcion: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button" onClick={() => setShowMovBancoModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirmar Transacción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR CXP (DEUDA / GASTO) */}
      {showAddCxpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4">Registrar Deuda o Gasto</h4>
            <form onSubmit={handleAddCxp} className="grid gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Proveedor (Opcional)</label>
                  <select
                    value={newCxp.proveedorId} onChange={e => setNewCxp({ ...newCxp, proveedorId: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Ninguno / Gastos Varios</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Categoría Gasto</label>
                  <select
                    value={newCxp.categoria} onChange={e => setNewCxp({ ...newCxp, categoria: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  >
                    <option value="INVENTARIO">Inventario</option>
                    <option value="ALQUILER">Alquiler local</option>
                    <option value="SERVICIOS">Servicios (Luz/Agua/Internet)</option>
                    <option value="NOMINA">Nómina / Empleados</option>
                    <option value="IMPUESTOS">Impuestos</option>
                    <option value="OTROS">Otros Gastos</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Descripción / Concepto</label>
                <input
                  type="text" required placeholder="Ej: Factura de luz mayo 2026"
                  value={newCxp.descripcion} onChange={e => setNewCxp({ ...newCxp, descripcion: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Número NCF (Opcional)</label>
                  <input
                    type="text" placeholder="Ej: B0100000001"
                    value={newCxp.ncf} onChange={e => setNewCxp({ ...newCxp, ncf: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Fecha Vencimiento (Opcional)</label>
                  <input
                    type="date"
                    value={newCxp.fechaVencimiento} onChange={e => setNewCxp({ ...newCxp, fechaVencimiento: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Monto Total (RD$)</label>
                <input
                  type="number" step="0.01" required min="0.01" placeholder="0.00"
                  value={newCxp.monto} onChange={e => setNewCxp({ ...newCxp, monto: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Digitalizar Factura (Soporte / Scan DGII)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950/40 dark:file:text-indigo-400 cursor-pointer file:cursor-pointer text-[11px] text-slate-500 flex-1 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-1"
                  />
                  {uploadingFile && <span className="text-[10px] text-indigo-600 animate-pulse font-bold">Subiendo...</span>}
                  {!uploadingFile && newCxp.facturaEscaneadaUrl && (
                    <span className="text-[10px] text-emerald-605 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                      ✓ Cargado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button" onClick={() => setShowAddCxpModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Registrar Deuda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR CXC (CRÉDITO CLIENTE) */}
      {showAddCxcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4">Registrar Crédito Cliente</h4>
            <form onSubmit={handleAddCxc} className="grid gap-4 text-xs">
              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Nombre Cliente</label>
                <input
                  type="text" required placeholder="Ej: Juan Pérez"
                  value={newCxc.clienteNombre} onChange={e => setNewCxc({ ...newCxc, clienteNombre: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">RNC o Cédula (Opcional)</label>
                  <input
                    type="text" placeholder="Ej: 402..."
                    value={newCxc.clienteRnc} onChange={e => setNewCxc({ ...newCxc, clienteRnc: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Teléfono (Opcional)</label>
                  <input
                    type="text" placeholder="Ej: 809..."
                    value={newCxc.clienteTelefono} onChange={e => setNewCxc({ ...newCxc, clienteTelefono: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Descripción / Concepto</label>
                <input
                  type="text" required placeholder="Ej: Saldo de cuenta del mes"
                  value={newCxc.descripcion} onChange={e => setNewCxc({ ...newCxc, descripcion: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Número NCF (Opcional)</label>
                  <input
                    type="text" placeholder="Ej: B0200000001"
                    value={newCxc.ncf} onChange={e => setNewCxc({ ...newCxc, ncf: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Fecha Vencimiento (Opcional)</label>
                  <input
                    type="date"
                    value={newCxc.fechaVencimiento} onChange={e => setNewCxc({ ...newCxc, fechaVencimiento: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Monto Total (RD$)</label>
                <input
                  type="number" step="0.01" required min="0.01" placeholder="0.00"
                  value={newCxc.monto} onChange={e => setNewCxc({ ...newCxc, monto: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button" onClick={() => setShowAddCxcModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Registrar Crédito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PAGO A CXP */}
      {showPayCxpModal && payCxp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-2">Registrar Pago a Proveedor</h4>
            <p className="text-[10px] text-slate-500 font-bold mb-4">Deuda: {payCxp.desc}</p>
            <form onSubmit={handlePayCxp} className="grid gap-4 text-xs">
              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Monto del Pago (RD$)</label>
                <input
                  type="number" step="0.01" required min="0.01"
                  max={(payCxp.totalCents - payCxp.pagadoCents) / 100}
                  value={payCxp.monto} onChange={e => setPayCxp({ ...payCxp, monto: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
                <span className="text-[9px] text-slate-400 font-bold">
                  Saldo pendiente máximo: RD$ {((payCxp.totalCents - payCxp.pagadoCents) / 100).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Método de Pago</label>
                  <select
                    value={payCxp.metodoPago} onChange={e => setPayCxp({ ...payCxp, metodoPago: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  >
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="EFECTIVO">Efectivo (Caja Chica)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Referencia / No. Transacción</label>
                  <input
                    type="text" placeholder="Ej: Transf-8812"
                    value={payCxp.referencia} onChange={e => setPayCxp({ ...payCxp, referencia: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button" onClick={() => setShowPayCxpModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR COBRO A CXC */}
      {showCollectCxcModal && collectCxc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-2">Registrar Cobro a Cliente</h4>
            <p className="text-[10px] text-slate-500 font-bold mb-4">Cuenta: {collectCxc.desc}</p>
            <form onSubmit={handleCollectCxc} className="grid gap-4 text-xs">
              <div className="grid gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Monto del Cobro (RD$)</label>
                <input
                  type="number" step="0.01" required min="0.01"
                  max={(collectCxc.totalCents - collectCxc.cobradoCents) / 100}
                  value={collectCxc.monto} onChange={e => setCollectCxc({ ...collectCxc, monto: e.target.value })}
                  className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                />
                <span className="text-[9px] text-slate-400 font-bold">
                  Saldo pendiente máximo: RD$ {((collectCxc.totalCents - collectCxc.cobradoCents) / 100).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Método de Cobro</label>
                  <select
                    value={collectCxc.metodoPago} onChange={e => setCollectCxc({ ...collectCxc, metodoPago: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  >
                    <option value="EFECTIVO">Efectivo (Caja Chica)</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="TARJETA">Tarjeta de Crédito</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Referencia / No. Transacción</label>
                  <input
                    type="text" placeholder="Ej: Ref-1992"
                    value={collectCxc.referencia} onChange={e => setCollectCxc({ ...collectCxc, referencia: e.target.value })}
                    className="input bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button" onClick={() => setShowCollectCxcModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
