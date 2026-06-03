/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

"use client"
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useToast } from '@/components/ui/Providers'
import { FinancialKPI } from '@/components/contabilidad/FinancialKPI'
import { CashFlowChart } from '@/components/contabilidad/CashFlowChart'
import { 
  BarChart3, FileSpreadsheet, Download, RefreshCw, AlertTriangle, 
  Calendar, Layers, CheckCircle2, Ban, Plus, Settings, Eye, Sliders,
  LayoutDashboard, DollarSign, TrendingDown, PieChart, Bell,
  ArrowRight, BookOpen, FileText, Landmark, ArrowUpRight, ArrowDownRight, Clock,
  Printer, Activity, ShieldAlert, Sparkles, Wrench,
  TrendingUp, Coins, CreditCard, Shield, PackageOpen, Scale, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as ReChartsTooltip, Cell
} from 'recharts'

type Secuencia = {
  id: number
  tipo: string
  prefijo: string
  tipoCodigo: string
  inicio: number
  fin: number
  actual: number
  vencimiento: string
  activa: boolean
  descripcion: string | null
}

type DashboardData = {
  kpis: {
    ingresosMes: number
    gastosMes: number
    utilidadMes: number
    margenPct: number
    trendIngresos: number
    trendGastos: number
    alertas: number
    ncfAlerts: number
    cxpVencidas: number
    cxcVencidas: number
  }
  cashFlow: Array<{ mes: string; ingresos: number; gastos: number }>
  timeline: Array<{
    id: number
    numero: string
    fecha: string
    descripcion: string
    origen: string
    monto: number
  }>
  resumen: {
    totalCxp: number
    totalCxc: number
    cxpCount: number
    cxcCount: number
  }
}

export default function ContabilidadDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'financials' | 'dgii' | 'ncf' | 'cierre' | 'diagnostico'>('dashboard')
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // Estados de reportes financieros
  const [reportType, setReportType] = useState<'balanza' | 'resultados' | 'balance_general'>('resultados')
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<any>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Estados del Centro DGII
  const [recordsCount, setRecordsCount] = useState({ compras: 0, ventas: 0, anulaciones: 0 })
  const [it1Data, setIt1Data] = useState<any>(null)
  const [loadingDgii, setLoadingDgii] = useState(false)

  // Modales de anulación (608)
  const [showAnulacionModal, setShowAnulacionModal] = useState(false)
  const [anulacionNcf, setAnulacionNcf] = useState('')
  const [anulacionFecha, setAnulacionFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [anulacionTipo, setAnulacionTipo] = useState('01')
  const [anulacionComentario, setAnulacionComentario] = useState('')

  // Estados NCF
  const [secuencias, setSecuencias] = useState<Secuencia[]>([])
  const [loadingNcf, setLoadingNcf] = useState(false)
  const [showNewNcf, setShowNewNcf] = useState(false)
  
  // Nueva secuencia
  const [newTipo, setNewTipo] = useState('B02')
  const [newInicio, setNewInicio] = useState('')
  const [newFin, setNewFin] = useState('')
  const [newVencimiento, setNewVencimiento] = useState('2027-12-31')
  const [newDesc, setNewDesc] = useState('')

  const { push } = useToast()

  const loadFinancials = async () => {
    try {
      setLoadingReport(true)
      setReportData(null)
      const params = new URLSearchParams()
      params.set('tipo', reportType)
      params.set('fechaInicio', `${fechaInicio}T00:00:00Z`)
      params.set('fechaFin', `${fechaFin}T23:59:59Z`)
      
      const res = await fetch(`/api/contabilidad/reportes?${params.toString()}`)
      const data = await res.json()
      if (data.ok) {
        setReportData(data.report)
      } else {
        push(data.error || 'Error al obtener reporte', 'error')
      }
    } catch (e) {
      console.error(e)
      push('Error de red al cargar reportes', 'error')
    } finally {
      setLoadingReport(false)
    }
  }

  const loadDgiiData = async () => {
    try {
      setLoadingDgii(true)
      const [res606, res607, res608, resIt1] = await Promise.all([
        fetch(`/api/dgii/formatos?tipo=606&periodo=${periodo}`),
        fetch(`/api/dgii/formatos?tipo=607&periodo=${periodo}`),
        fetch(`/api/dgii/formatos?tipo=608&periodo=${periodo}`),
        fetch(`/api/dgii/formatos?tipo=it1&periodo=${periodo}`)
      ])

      const d606 = await res606.json()
      const d607 = await res607.json()
      const d608 = await res608.json()
      const dIt1 = await resIt1.json()

      setRecordsCount({
        compras: d606.ok ? d606.report.length : 0,
        ventas: d607.ok ? d607.report.length : 0,
        anulaciones: d608.ok ? d608.report.length : 0
      })

      if (dIt1.ok) {
        setIt1Data(dIt1.report)
      }
    } catch (e) {
      console.error(e)
      push('Error al cargar datos fiscales', 'error')
    } finally {
      setLoadingDgii(false)
    }
  }

  const loadNcfData = async () => {
    try {
      setLoadingNcf(true)
      const res = await fetch('/api/dgii/secuencias')
      const data = await res.json()
      if (data.ok) {
        setSecuencias(data.secuencias)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingNcf(false)
    }
  }

  // Dashboard state
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [loadingDash, setLoadingDash] = useState(false)

  // Cierre y auditoría state
  const [periodosCerrados, setPeriodosCerrados] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loadingCierre, setLoadingCierre] = useState(false)
  const [cierrePeriodoInput, setCierrePeriodoInput] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // Estados de diagnóstico contable
  const [diagnosticoData, setDiagnosticoData] = useState<any>(null)
  const [loadingDiagnostico, setLoadingDiagnostico] = useState(false)
  const [fixingDiagnostico, setFixingDiagnostico] = useState(false)
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)

  const loadDiagnostico = async () => {
    try {
      setLoadingDiagnostico(true)
      const res = await fetch('/api/contabilidad/diagnostico')
      const data = await res.json()
      if (data.ok) {
        setDiagnosticoData(data)
      } else {
        push(data.error || 'Error al cargar diagnóstico', 'error')
      }
    } catch (e) {
      console.error(e)
      push('Error de red al cargar diagnóstico', 'error')
    } finally {
      setLoadingDiagnostico(false)
    }
  }

  const handleAutofix = async () => {
    if (!confirm('¿Está seguro de que desea ejecutar la corrección automática? Esto asignará folios NCF correspondientes y generará asientos contables para todas las ventas del POS que estén descuadradas fiscalmente.')) {
      return
    }
    try {
      setFixingDiagnostico(true)
      const res = await fetch('/api/contabilidad/diagnostico/autofix', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.ok) {
        if (data.totalFixed > 0) {
          push(`Se han corregido ${data.totalFixed} ventas con éxito.`, 'success')
        } else {
          push('No se encontraron ventas para corregir o ninguna requirió reparación.', 'info')
        }
        await loadDiagnostico()
      } else {
        push(data.error || 'Error al ejecutar autofix', 'error')
      }
    } catch (e) {
      console.error(e)
      push('Error de red al ejecutar autofix', 'error')
    } finally {
      setFixingDiagnostico(false)
    }
  }

  const loadCierreData = async () => {
    try {
      setLoadingCierre(true)
      const [resPeriodos, resLogs] = await Promise.all([
        fetch('/api/contabilidad/periodos'),
        fetch('/api/contabilidad/auditoria?limite=100')
      ])
      const dataP = await resPeriodos.json()
      const dataL = await resLogs.json()
      if (dataP.ok) setPeriodosCerrados(dataP.periodos)
      if (dataL.ok) setAuditLogs(dataL.logs)
    } catch (err) {
      console.error(err)
      push('Error al cargar la información de cierre y auditoría', 'error')
    } finally {
      setLoadingCierre(false)
    }
  }

  const handleCerrarPeriodo = async () => {
    if (!confirm(`¿Está seguro de que desea cerrar el período contable ${cierrePeriodoInput}? Se bloquearán todas las transacciones previas y se generará el asiento de liquidación de cuentas nominales.`)) {
      return
    }
    try {
      const res = await fetch('/api/contabilidad/periodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: cierrePeriodoInput })
      })
      const data = await res.json()
      if (data.ok) {
        push(`Período ${cierrePeriodoInput} cerrado correctamente.`, 'success')
        loadCierreData()
      } else {
        push(data.error || 'No se pudo cerrar el período', 'error')
      }
    } catch (err: any) {
      push(err.message || 'Error al conectar con el servidor', 'error')
    }
  }

  const loadDashboard = async () => {
    try {
      setLoadingDash(true)
      const res = await fetch('/api/contabilidad/dashboard')
      const data = await res.json()
      if (data.ok) setDashData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDash(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard()
    } else if (activeTab === 'financials') {
      loadFinancials()
    } else if (activeTab === 'dgii') {
      loadDgiiData()
    } else if (activeTab === 'ncf') {
      loadNcfData()
    } else if (activeTab === 'cierre') {
      loadCierreData()
    } else if (activeTab === 'diagnostico') {
      loadDiagnostico()
    }
  }, [activeTab, reportType, fechaInicio, fechaFin, periodo])

  const [downloadingFormato, setDownloadingFormato] = useState<string | null>(null)

  const handleDownloadFile = async (tipo: string, format: 'txt' | 'xls') => {
    const key = `${tipo}-${format}`
    setDownloadingFormato(key)
    push(`Generando ${format === 'xls' ? 'Excel' : 'TXT'} del formato ${tipo}… Espere un momento.`, 'info')
    try {
      const res = await fetch(`/api/dgii/formatos?tipo=${tipo}&periodo=${periodo}&format=${format}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        push(err.error || `Error al generar formato ${tipo}`, 'error')
        return
      }
      const blob = await res.blob()
      const ext = format === 'xls' ? 'xls' : 'txt'
      const [yearStr, monthStr] = periodo.split('-')
      const filename = `DGII_${tipo}_${yearStr}${monthStr}.${ext}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      push(`${format === 'xls' ? 'Plantilla Excel' : 'Archivo TXT'} del formato ${tipo} descargado correctamente`, 'success')
    } catch (e) {
      console.error(e)
      push(`Error de red al descargar formato ${tipo}`, 'error')
    } finally {
      setDownloadingFormato(null)
    }
  }

  const handleDownloadTxt = (tipo: string) => handleDownloadFile(tipo, 'txt')
  const handleDownloadCsv = (tipo: string) => handleDownloadFile(tipo, 'xls')

  const handleAnularNcf = async () => {
    if (!anulacionNcf.trim()) {
      push('El número NCF es requerido', 'error')
      return
    }

    try {
      const res = await fetch('/api/dgii/formatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncf: anulacionNcf.trim().toUpperCase(),
          fechaComprobante: anulacionFecha,
          tipoAnulacion: anulacionTipo,
          comentario: anulacionComentario.trim()
        })
      })

      const data = await res.json()
      if (data.ok) {
        push('NCF Anulado registrado para el reporte 608', 'success')
        setShowAnulacionModal(false)
        setAnulacionNcf('')
        setAnulacionComentario('')
        await loadDgiiData()
      } else {
        push(data.error || 'No se pudo anular', 'error')
      }
    } catch (e) {
      console.error(e)
      push('Error al guardar anulación', 'error')
    }
  }

  const handleToggleNcf = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/dgii/secuencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activa: !currentStatus })
      })
      const data = await res.json()
      if (data.ok) {
        push('Estado de secuencia NCF actualizado', 'success')
        await loadNcfData()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateNcf = async () => {
    const start = parseInt(newInicio, 10)
    const end = parseInt(newFin, 10)

    if (isNaN(start) || isNaN(end) || !newVencimiento) {
      push('Por favor rellena el rango e ingresa valores válidos', 'error')
      return
    }

    const prefijo = newTipo.startsWith('E') ? 'E' : 'B'
    const tipoCodigo = newTipo.substring(1)

    try {
      const res = await fetch('/api/dgii/secuencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: newTipo,
          prefijo,
          tipoCodigo,
          inicio: start,
          fin: end,
          actual: start - 1, // El siguiente consumo será el inicio
          vencimiento: newVencimiento,
          descripcion: newDesc.trim() || undefined
        })
      })

      const data = await res.json()
      if (data.ok) {
        push('Secuencia NCF creada con éxito', 'success')
        setShowNewNcf(false)
        setNewInicio('')
        setNewFin('')
        setNewDesc('')
        await loadNcfData()
      } else {
        push(data.error || 'Error al crear secuencia', 'error')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fmtMoney = (cents: number) => `RD$ ${(cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`

  const tabBtn = (tab: typeof activeTab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
        activeTab === tab
          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-950/50'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800/40'
      }`}
    >
      {icon} {label}
    </button>
  )

  const QUICK_LINKS = [
    { href: '/admin/contabilidad/cuentas', icon: <BookOpen size={18} />, label: 'Catálogo de Cuentas', desc: 'Plan contable completo', color: 'text-indigo-500' },
    { href: '/admin/contabilidad/asientos', icon: <FileText size={18} />, label: 'Libro Diario', desc: 'Asientos contables', color: 'text-emerald-500' },
    { href: '/admin/tesoreria', icon: <Landmark size={18} />, label: 'Tesorería', desc: 'Bancos, CXP, CXC', color: 'text-amber-500' },
  ]

  const ORIGEN_COLORS: Record<string, string> = {
    POS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    MANUAL: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    COMPRAS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    NOMINA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  }

  return (
    <AdminLayout
      title="Contabilidad y DGII"
      actions={
        <div className="flex bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 gap-1 shadow-inner shadow-black/10 dark:shadow-black/40 overflow-x-auto">
          {tabBtn('dashboard', <LayoutDashboard size={14} />, 'Panel')}
          {tabBtn('diagnostico', <Activity size={14} />, 'Diagnóstico')}
          {tabBtn('financials', <BarChart3 size={14} />, 'Reportes')}
          {tabBtn('dgii', <FileSpreadsheet size={14} />, 'DGII')}
          {tabBtn('ncf', <Settings size={14} />, 'NCF')}
          {tabBtn('cierre', <CheckCircle2 size={14} />, 'Cierres')}
        </div>
      }
    >
      {/* 0. SECCIÓN: DASHBOARD CONTABLE */}
      {activeTab === 'dashboard' && (
        <div className="grid gap-6">
          {loadingDash ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-400 animate-pulse">Cargando panel financiero…</p>
              </div>
            </div>
          ) : dashData ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FinancialKPI
                  title="Ingresos del Mes"
                  value={fmtMoney(dashData.kpis.ingresosMes)}
                  icon={<DollarSign size={20} />}
                  accent="emerald"
                  trend={dashData.kpis.trendIngresos}
                  delay={0}
                />
                <FinancialKPI
                  title="Gastos del Mes"
                  value={fmtMoney(dashData.kpis.gastosMes)}
                  icon={<TrendingDown size={20} />}
                  accent="red"
                  trend={dashData.kpis.trendGastos}
                  delay={1}
                />
                <FinancialKPI
                  title="Utilidad Neta"
                  value={fmtMoney(dashData.kpis.utilidadMes)}
                  subtitle={`Margen: ${dashData.kpis.margenPct}%`}
                  icon={<PieChart size={20} />}
                  accent="indigo"
                  delay={2}
                />
                <FinancialKPI
                  title="Alertas Activas"
                  value={String(dashData.kpis.alertas)}
                  subtitle={[
                    dashData.kpis.cxpVencidas > 0 && `${dashData.kpis.cxpVencidas} CXP vencidas`,
                    dashData.kpis.cxcVencidas > 0 && `${dashData.kpis.cxcVencidas} CXC vencidas`,
                    dashData.kpis.ncfAlerts > 0 && `${dashData.kpis.ncfAlerts} NCF agotándose`,
                  ].filter(Boolean).join(' · ') || 'Sin alertas pendientes'}
                  icon={<Bell size={20} />}
                  accent="amber"
                  delay={3}
                />
              </div>

              {/* Cash Flow + CXP/CXC Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <CashFlowChart data={dashData.cashFlow} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="grid gap-4 content-start"
                >
                  {/* CXP Card */}
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                        <ArrowDownRight size={16} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cuentas por Pagar</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{fmtMoney(dashData.resumen.totalCxp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{dashData.resumen.cxpCount} documentos pendientes</span>
                      <Link href="/admin/tesoreria" className="text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 group">
                        Ver todo <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  {/* CXC Card */}
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                        <ArrowUpRight size={16} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cuentas por Cobrar</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{fmtMoney(dashData.resumen.totalCxc)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{dashData.resumen.cxcCount} documentos pendientes</span>
                      <Link href="/admin/tesoreria" className="text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 group">
                        Ver todo <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Accesos Rápidos</p>
                    <div className="grid gap-2">
                      {QUICK_LINKS.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          <span className={l.color}>{l.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{l.label}</p>
                            <p className="text-[10px] text-slate-400">{l.desc}</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Activity Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Actividad Reciente</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Últimos asientos contables registrados</p>
                  </div>
                  <Link
                    href="/admin/contabilidad/asientos"
                    className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                  >
                    Ver libro diario <ArrowRight size={12} />
                  </Link>
                </div>

                {dashData.timeline.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No hay asientos contables registrados aún.</p>
                ) : (
                  <div className="grid gap-1">
                    {dashData.timeline.map((entry, i) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Clock size={14} className="text-slate-300 dark:text-slate-600" />
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 w-20">
                            {new Date(entry.fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${ORIGEN_COLORS[entry.origen] || ORIGEN_COLORS.MANUAL}`}>
                          {entry.origen}
                        </span>
                        <span className="font-mono text-[11px] text-indigo-500 dark:text-indigo-400 font-bold flex-shrink-0">{entry.numero}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1">{entry.descripcion}</span>
                        <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 flex-shrink-0">{fmtMoney(entry.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          ) : (
            <div className="text-center py-10 text-sm text-slate-400">No se pudo cargar el panel.</div>
          )}
        </div>
      )}

      {/* 1. SECCIÓN: ESTADOS FINANCIEROS */}
      {activeTab === 'financials' && (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between bg-white dark:bg-gradient-to-r dark:from-slate-900/60 dark:to-slate-950/60 border border-slate-200 dark:border-slate-800/40 rounded-3xl p-5 gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Reporte</span>
              <select
                className="input text-xs w-56 bg-white dark:bg-slate-950/60 border-slate-300 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-100 rounded-xl transition-all duration-200 px-3 py-2"
                value={reportType}
                onChange={(e) => {
                  setReportData(null)
                  setLoadingReport(true)
                  setReportType(e.target.value as any)
                }}
              >
                <option value="resultados">Estado de Resultados (P&L)</option>
                <option value="balance_general">Balance General (Saldos)</option>
                <option value="balanza">Balanza de Comprobación</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5">
                <Calendar size={14} className="text-indigo-400" />
                {reportType !== 'balance_general' && (
                  <>
                    <input
                      type="date"
                      className="bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 text-xs w-28 focus:ring-0 p-0"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                    <span className="text-slate-400 dark:text-slate-600 font-medium px-1">a</span>
                  </>
                )}
                <input
                  type="date"
                  className="bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 text-xs w-28 focus:ring-0 p-0"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
              <button
                onClick={loadFinancials}
                className="btn border-slate-200 dark:border-slate-800 hover:border-indigo-600/50 p-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl shadow-lg transition-all duration-200"
                title="Actualizar datos"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => window.open(`/api/contabilidad/reportes/export?tipo=${reportType}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)}
                className="btn border-slate-200 dark:border-slate-800 hover:border-indigo-600/50 p-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl shadow-lg transition-all duration-200"
                title="Exportar a CSV / Excel"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => window.print()}
                className="btn border-slate-200 dark:border-slate-800 hover:border-indigo-600/50 p-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl shadow-lg transition-all duration-200"
                title="Imprimir / Exportar PDF"
              >
                <Printer size={14} />
              </button>
            </div>
          </div>

          <div className="glass-panel border border-slate-200 dark:border-slate-800/40 shadow-2xl shadow-slate-200/40 dark:shadow-slate-950/60 rounded-3xl p-8 min-h-[450px] transition-all duration-300">
            {loadingReport ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-xs muted animate-pulse">Generando estado financiero…</div>
              </div>
            ) : !reportData ? (
              <div className="text-center py-10 muted text-xs">No hay información disponible.</div>
            ) : (
              <div className="grid gap-6">
                {/* --- RENDER: ESTADO DE RESULTADOS --- */}
                {reportType === 'resultados' && reportData.ingresos && (
                  <div className="grid gap-8">
                    {(() => {
                      const renderComparison = (current: number, previous: number | undefined) => {
                        if (previous === undefined || previous === null) return null
                        const diff = current - previous
                        const percent = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0
                        const isPositive = diff >= 0
                        
                        return (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPositive
                              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40'
                              : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40'
                          }`}>
                            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {Math.abs(percent).toFixed(1)}% (RD$ {(Math.abs(diff) / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })})
                          </span>
                        )
                      }

                      return (
                        <>
                          <div className="border-b border-slate-200 dark:border-slate-800/60 pb-4">
                            <h4 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Estado de Resultados</h4>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                              Periodo:{' '}
                              <span className="text-slate-700 dark:text-slate-300">{new Date(reportData.rango.inicio).toLocaleDateString()}</span>
                              <span className="text-slate-400 dark:text-slate-500">al</span>
                              <span className="text-slate-700 dark:text-slate-300">{new Date(reportData.rango.fin).toLocaleDateString()}</span>
                            </p>
                          </div>

                          <div className="grid gap-6 max-w-2xl text-sm">
                            {/* Ingresos */}
                            <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl">
                              <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                                <span className="flex items-center gap-1.5 text-sm uppercase tracking-wide">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  INGRESOS
                                </span>
                                <div className="flex items-center gap-2">
                                  {renderComparison(reportData.ingresos.total, reportData.prevPeriodo?.ingresos)}
                                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">RD$ {(reportData.ingresos.total / 100).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="grid gap-1">
                                {reportData.ingresos.cuentas.map((c: any) => {
                                  const pct = reportData.ingresos.total > 0 ? Math.round((c.balance / reportData.ingresos.total) * 100) : 0
                                  return (
                                    <div key={c.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-1.5 px-2.5 -mx-1 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200">
                                      <span className="font-medium flex-1 min-w-0 truncate">{c.codigo} - {c.nombre}</span>
                                      <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-[10px] text-slate-400 w-8 text-right flex-shrink-0">{pct}%</span>
                                      <span className="font-mono font-semibold flex-shrink-0 w-28 text-right">RD$ {(c.balance / 100).toFixed(2)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Costos */}
                            <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl">
                              <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                                <span className="flex items-center gap-1.5 text-sm uppercase tracking-wide">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  (-) COSTOS DE VENTAS
                                </span>
                                <div className="flex items-center gap-2">
                                  {renderComparison(reportData.costos.total, reportData.prevPeriodo?.costos)}
                                  <span className="text-amber-600 dark:text-amber-400 font-mono text-base">RD$ {(reportData.costos.total / 100).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="grid gap-1">
                                {reportData.costos.cuentas.map((c: any) => {
                                  const pct = reportData.ingresos.total > 0 ? Math.round((c.balance / reportData.ingresos.total) * 100) : 0
                                  return (
                                    <div key={c.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-1.5 px-2.5 -mx-1 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200">
                                      <span className="font-medium flex-1 min-w-0 truncate">{c.codigo} - {c.nombre}</span>
                                      <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
                                        <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-[10px] text-slate-400 w-8 text-right flex-shrink-0">{pct}%</span>
                                      <span className="font-mono font-semibold flex-shrink-0 w-28 text-right">RD$ {(c.balance / 100).toFixed(2)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Utilidad Bruta */}
                            <div className="flex justify-between items-center font-extrabold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 shadow-lg px-5 py-3 rounded-2xl my-2">
                              <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300">UTILIDAD BRUTA</span>
                              <div className="flex items-center gap-2">
                                {renderComparison(reportData.utilidadBruta, reportData.prevPeriodo?.utilidadBruta)}
                                <span className="font-mono text-lg">RD$ {(reportData.utilidadBruta / 100).toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Gastos */}
                            <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl">
                              <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                                <span className="flex items-center gap-1.5 text-sm uppercase tracking-wide">
                                  <span className="w-2 h-2 rounded-full bg-red-400" />
                                  (-) GASTOS OPERATIVOS
                                </span>
                                <div className="flex items-center gap-2">
                                  {renderComparison(reportData.gastos.total, reportData.prevPeriodo?.gastos)}
                                  <span className="text-red-650 dark:text-red-400 font-mono text-base">RD$ {(reportData.gastos.total / 100).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="grid gap-1">
                                {reportData.gastos.cuentas.map((c: any) => {
                                  const pct = reportData.ingresos.total > 0 ? Math.round((c.balance / reportData.ingresos.total) * 100) : 0
                                  return (
                                    <div key={c.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-1.5 px-2.5 -mx-1 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200">
                                      <span className="font-medium flex-1 min-w-0 truncate">{c.codigo} - {c.nombre}</span>
                                      <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
                                        <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-[10px] text-slate-400 w-8 text-right flex-shrink-0">{pct}%</span>
                                      <span className="font-mono font-semibold flex-shrink-0 w-28 text-right">RD$ {(c.balance / 100).toFixed(2)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Utilidad Neta */}
                            <div className="flex justify-between items-center font-black text-indigo-950 dark:text-white bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.15)] px-6 py-4.5 rounded-2xl my-4 text-lg">
                              <span className="text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-300">UTILIDAD NETA DEL PERIODO</span>
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                {renderComparison(reportData.utilidadNeta, reportData.prevPeriodo?.utilidadNeta)}
                                <span className="font-mono text-xl text-indigo-800 dark:text-indigo-200">RD$ {(reportData.utilidadNeta / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* --- RENDER: BALANCE GENERAL --- */}
                {reportType === 'balance_general' && reportData.activos && (
                  <div className="grid gap-8">
                    <div className="border-b border-slate-200 dark:border-slate-800/60 pb-4">
                      <h4 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Balance General</h4>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Al Corte de:{' '}
                        <span className="text-slate-700 dark:text-slate-300">{new Date(reportData.corte).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                      {/* Lado Izquierdo: Activos */}
                      <div className="grid content-start gap-4">
                        <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm dark:shadow-xl">
                          <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                            <span className="flex items-center gap-1.5 text-sm uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              ACTIVOS
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">RD$ {(reportData.activos.total / 100).toFixed(2)}</span>
                          </div>
                          <div className="grid gap-1">
                            {reportData.activos.cuentas.map((c: any) => (
                              <div key={c.id} className="flex justify-between text-xs text-slate-600 dark:text-slate-300 py-1.5 px-2.5 -mx-1 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200">
                                <span className="font-medium">{c.codigo} - {c.nombre}</span>
                                <span className="font-mono font-semibold">RD$ {(c.balance / 100).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Lado Derecho: Pasivo y Patrimonio */}
                      <div className="grid content-start gap-6">
                        <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm dark:shadow-xl">
                          <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                            <span className="flex items-center gap-1.5 text-sm uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              PASIVOS
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-mono text-base">RD$ {(reportData.pasivos.total / 100).toFixed(2)}</span>
                          </div>
                          <div className="grid gap-1">
                            {reportData.pasivos.cuentas.map((c: any) => (
                              <div key={c.id} className="flex justify-between text-xs text-slate-600 dark:text-slate-300 py-1.5 px-2.5 -mx-1 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200">
                                <span className="font-medium">{c.codigo} - {c.nombre}</span>
                                <span className="font-mono font-semibold">RD$ {(c.balance / 100).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm dark:shadow-xl">
                          <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                            <span className="flex items-center gap-1.5 text-sm uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              PATRIMONIO
                            </span>
                            <span className="text-indigo-650 dark:text-indigo-400 font-mono text-base">RD$ {(reportData.patrimonio.total / 100).toFixed(2)}</span>
                          </div>
                          <div className="grid gap-1">
                            {reportData.patrimonio.cuentas.map((c: any) => (
                              <div key={c.id} className="flex justify-between text-xs text-slate-600 dark:text-slate-300 py-1.5 px-2.5 -mx-1 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200">
                                <span className={`font-medium ${c.id === -99 ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}`}>
                                  {c.codigo} - {c.nombre}
                                </span>
                                <span className={`font-mono font-semibold ${c.id === -99 ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}`}>
                                  RD$ {(c.balance / 100).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cuadre de Balance */}
                        <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex justify-between items-center text-sm font-bold shadow-md">
                          <span className="text-slate-500 dark:text-slate-400">Total Pasivo + Patrimonio:</span>
                          <span className="text-slate-800 dark:text-slate-100 font-mono">
                            RD$ {((reportData.pasivos.total + reportData.patrimonio.total) / 100).toFixed(2)}
                          </span>
                        </div>

                        {reportData.cuadre ? (
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 py-3 px-4 rounded-2xl justify-center shadow-lg shadow-emerald-950/15">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                            <CheckCircle2 size={16} /> Ecuación Contable Balanceada (Activo = Pasivo + Capital)
                          </div>
                        ) : (
                          <div className="text-xs text-red-700 dark:text-red-400 flex items-center gap-2 font-semibold bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 py-3 px-4 rounded-2xl justify-center shadow-lg shadow-red-950/15">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <AlertTriangle size={16} /> Ecuación descuadrada por RD$ {(reportData.diferencia / 100).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- RENDER: BALANZA DE COMPROBACIÓN --- */}
                {reportType === 'balanza' && Array.isArray(reportData) && (
                  <div className="grid gap-6">
                    <div className="border-b border-slate-200 dark:border-slate-800/60 pb-3">
                      <h4 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Balanza de Comprobación</h4>
                    </div>

                    <div className="grid text-xs font-mono gap-1 max-w-4xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl">
                      <div className="grid grid-cols-12 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3 mb-2 text-[10px] tracking-wider uppercase">
                        <div className="col-span-2">Código</div>
                        <div className="col-span-4">Cuenta</div>
                        <div className="col-span-2 text-right pr-4">Débito (RD$)</div>
                        <div className="col-span-2 text-right pr-4">Crédito (RD$)</div>
                        <div className="col-span-2 text-right">Saldo Neto (RD$)</div>
                      </div>

                      {reportData.map((c: any) => (
                        <div
                          key={c.id}
                          className="grid grid-cols-12 py-2 border-b border-slate-200 dark:border-slate-850/40 hover:bg-slate-100 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-all duration-150 items-center"
                        >
                          <div className="col-span-2 text-indigo-650 dark:text-indigo-400 font-semibold">{c.codigo}</div>
                          <div className="col-span-4 text-slate-800 dark:text-slate-200 font-medium">{c.nombre}</div>
                          <div className="col-span-2 text-right pr-4 text-slate-700 dark:text-slate-300">
                            {c.debito > 0 ? (c.debito / 100).toFixed(2) : '—'}
                          </div>
                          <div className="col-span-2 text-right pr-4 text-slate-700 dark:text-slate-300">
                            {c.credito > 0 ? (c.credito / 100).toFixed(2) : '—'}
                          </div>
                          <div
                            className={`col-span-2 text-right font-bold ${
                              c.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-650 dark:text-red-400'
                            }`}
                          >
                            RD$ {(Math.abs(c.balance) / 100).toFixed(2)}{' '}
                            <span className="text-[10px] opacity-75 ml-0.5">{c.balance > 0 ? 'Db' : c.balance < 0 ? 'Cr' : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: ENVÍO FISCAL DGII */}
      {activeTab === 'dgii' && (
        <div className="grid gap-6">
          {/* Selector de periodo */}
          <div className="flex flex-wrap items-center justify-between bg-white dark:bg-gradient-to-r dark:from-slate-900/60 dark:to-slate-950/60 border border-slate-200 dark:border-slate-800/40 rounded-3xl p-5 gap-4 shadow-xl">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Calendar size={18} className="text-indigo-400" />
              <span>Periodo Fiscal:</span>
              <input
                type="month"
                className="input py-1.5 px-3 text-xs w-48 bg-white dark:bg-slate-950/60 border-slate-300 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-100 rounded-xl transition-all duration-200"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              />
            </label>

            <button
              onClick={() => setShowAnulacionModal(true)}
              className="btn border-red-200 dark:border-red-950/60 text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 text-xs py-2 px-4 rounded-xl shadow-lg transition-all duration-200"
            >
              <Ban size={14} /> Registrar NCF Anulado (608)
            </button>
          </div>

          {loadingDgii ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-xs muted animate-pulse">Consultando reportes para el periodo…</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Formato 606 */}
              <div className="glass-panel border border-slate-200 dark:border-slate-800/40 hover:border-indigo-500/20 p-6 rounded-3xl flex flex-col justify-between h-56 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-950/30">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg bg-slate-105 dark:bg-slate-950 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 font-mono shadow-sm">
                    606
                  </span>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-3.5">Reporte de Compras</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Bienes y servicios facturados al negocio en el periodo fiscal.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-850 pt-4 mt-4">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {recordsCount.compras} registros
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadTxt('606')}
                      disabled={recordsCount.compras === 0 || downloadingFormato === '606-txt'}
                      className="btn border border-indigo-200 dark:border-indigo-900/60 text-indigo-650 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 py-2 px-3 flex items-center gap-1 text-[11px] rounded-xl disabled:opacity-30 disabled:pointer-events-none"
                      title="Descargar TXT para Oficina Virtual DGII"
                    >
                      {downloadingFormato === '606-txt' ? <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> : <Download size={12} />} TXT
                    </button>
                    <button
                      onClick={() => handleDownloadCsv('606')}
                      disabled={recordsCount.compras === 0 || downloadingFormato === '606-xls'}
                      className="btn btn-primary py-2 px-3 flex items-center gap-1 text-[11px] rounded-xl disabled:opacity-30 disabled:pointer-events-none"
                      title="Descargar Plantilla Oficial Excel DGII"
                    >
                      {downloadingFormato === '606-xls' ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet size={12} />} Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Formato 607 */}
              <div className="glass-panel border border-slate-200 dark:border-slate-800/40 hover:border-emerald-500/20 p-6 rounded-3xl flex flex-col justify-between h-56 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/30">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg bg-slate-105 dark:bg-slate-950 text-emerald-650 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 font-mono shadow-sm">
                    607
                  </span>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-3.5">Reporte de Ventas</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Facturas de consumo y crédito fiscal generadas en el POS.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-850 pt-4 mt-4">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {recordsCount.ventas} registros
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadTxt('607')}
                      disabled={recordsCount.ventas === 0 || downloadingFormato === '607-txt'}
                      className="btn border border-emerald-200 dark:border-emerald-900/60 text-emerald-650 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 py-2 px-3 flex items-center gap-1 text-[11px] rounded-xl disabled:opacity-30 disabled:pointer-events-none"
                      title="Descargar TXT para Oficina Virtual DGII"
                    >
                      {downloadingFormato === '607-txt' ? <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> : <Download size={12} />} TXT
                    </button>
                    <button
                      onClick={() => handleDownloadCsv('607')}
                      disabled={recordsCount.ventas === 0 || downloadingFormato === '607-xls'}
                      className="btn btn-primary py-2 px-3 flex items-center gap-1 text-[11px] rounded-xl disabled:opacity-30 disabled:pointer-events-none"
                      title="Descargar Plantilla Oficial Excel DGII"
                    >
                      {downloadingFormato === '607-xls' ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet size={12} />} Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Formato 608 */}
              <div className="glass-panel border border-slate-200 dark:border-slate-800/40 hover:border-red-500/20 p-6 rounded-3xl flex flex-col justify-between h-56 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-950/30">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg bg-slate-105 dark:bg-slate-950 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/60 font-mono shadow-sm">
                    608
                  </span>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-3.5">NCFs Anulados</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Facturas emitidas y posteriormente canceladas por errores o devoluciones.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-850 pt-4 mt-4">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {recordsCount.anulaciones} registros
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadTxt('608')}
                      disabled={recordsCount.anulaciones === 0 || downloadingFormato === '608-txt'}
                      className="btn border border-red-200 dark:border-red-900/60 text-red-650 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 py-2 px-3 flex items-center gap-1 text-[11px] rounded-xl disabled:opacity-30 disabled:pointer-events-none"
                      title="Descargar TXT para Oficina Virtual DGII"
                    >
                      {downloadingFormato === '608-txt' ? <div className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <Download size={12} />} TXT
                    </button>
                    <button
                      onClick={() => handleDownloadCsv('608')}
                      disabled={recordsCount.anulaciones === 0 || downloadingFormato === '608-xls'}
                      className="btn btn-primary py-2 px-3 flex items-center gap-1 text-[11px] rounded-xl disabled:opacity-30 disabled:pointer-events-none"
                      title="Descargar Plantilla Oficial Excel DGII"
                    >
                      {downloadingFormato === '608-xls' ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet size={12} />} Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Borrador Declaración Mensual IT-1 */}
          {it1Data && (
            <div className="glass-panel border border-slate-200 dark:border-slate-800/45 p-6 rounded-3xl grid gap-5 max-w-3xl mt-2 shadow-2xl">
              <div>
                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="text-indigo-400" /> Borrador de Liquidación IT-1 (Estimado)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Este borrador consolida el ITBIS devengado en ventas y el deducible en compras.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-4.5 rounded-2xl shadow-inner">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2 block uppercase tracking-wider">
                    Operaciones (Débito Fiscal)
                  </span>
                  <div className="flex justify-between text-xs py-1.5 text-slate-600 dark:text-slate-300">
                    <span>Total Facturado POS:</span>
                    <span className="font-mono font-semibold">RD$ {(it1Data.ventas.montoFacturado / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold border-t border-slate-200 dark:border-slate-800/50 pt-2 mt-1.5">
                    <span>ITBIS Cobrado (A):</span>
                    <span className="font-mono">RD$ {(it1Data.ventas.itbisCobrado / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-55 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-4.5 rounded-2xl shadow-inner">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2 block uppercase tracking-wider">
                    Deducciones (Crédito Fiscal)
                  </span>
                  <div className="flex justify-between text-xs py-1.5 text-slate-600 dark:text-slate-300">
                    <span>Monto Compras Netas:</span>
                    <span className="font-mono font-semibold">RD$ {(it1Data.compras.montoFacturado / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold border-t border-slate-200 dark:border-slate-800/50 pt-2 mt-1.5">
                    <span>ITBIS Deducible (B):</span>
                    <span className="font-mono">RD$ {(it1Data.compras.itbisDeducible / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800/60 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {it1Data.it1.impuestoAPagar > 0 ? (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-amber-950/20">
                      Saldo Neto a Pagar en DGII: RD$ {(it1Data.it1.impuestoAPagar / 100).toFixed(2)}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-250 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-emerald-950/20">
                      Saldo a Favor del Contribuyente: RD$ {(it1Data.it1.saldoAFavor / 100).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 max-w-sm text-right md:text-left leading-relaxed">
                  * Este borrador es puramente informativo basado en facturas registradas y no sustituye el formulario oficial en la Oficina Virtual de la DGII.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SECCIÓN: SECUENCIAS NCF */}
      {activeTab === 'ncf' && (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between bg-white dark:bg-gradient-to-r dark:from-slate-900/60 dark:to-slate-950/60 border border-slate-200 dark:border-slate-800/40 rounded-3xl p-5 gap-4 shadow-xl">
            <div>
              <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Configuración de Comprobantes Fiscales</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gestión de lotes y rangos autorizados por la DGII.</p>
            </div>
            <button
              onClick={() => setShowNewNcf(true)}
              className="btn btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 rounded-xl shadow-lg transition-all duration-200"
            >
              <Plus size={14} /> Agregar Nueva Secuencia
            </button>
          </div>

          <div className="glass-panel border border-slate-200 dark:border-slate-800/40 rounded-3xl p-6 shadow-2xl">
            {loadingNcf ? (
              <div className="text-xs muted py-14 animate-pulse text-center">Cargando secuencias…</div>
            ) : secuencias.length === 0 ? (
              <div className="text-xs muted py-14 text-center">No hay secuencias configuradas.</div>
            ) : (
              <div className="grid gap-4">
                {secuencias.map((s) => {
                  const total = s.fin - s.inicio + 1
                  const consumidos = s.actual - s.inicio + 1
                  const restantes = total - consumidos
                  const pctRestante = (restantes / total) * 100
                  const isLow = pctRestante < 15

                  return (
                    <div
                      key={s.id}
                      className="border border-slate-200 dark:border-slate-850 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-5 bg-slate-50 dark:bg-slate-950/10 hover:border-indigo-400/30 dark:hover:border-indigo-500/20 hover:bg-white dark:hover:bg-slate-900/20 transition-all duration-300 shadow-md"
                    >
                      <div className="grid gap-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-200 dark:border-indigo-900/60 px-2.5 py-1 rounded-lg shadow-sm">
                            {s.tipo}
                          </span>
                          <span className="text-sm text-slate-800 dark:text-slate-100 font-bold">{s.descripcion || '—'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wide">
                          Prefijo: <span className="text-slate-700 dark:text-slate-300 font-bold">{s.prefijo}</span> • Rango: <span className="text-slate-700 dark:text-slate-300">{s.inicio}</span> al <span className="text-slate-700 dark:text-slate-300">{s.fin}</span>
                        </span>
                      </div>

                      {/* Contador de balance */}
                      <div className="grid gap-1 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400">Asignados:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{consumidos} / {total}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-slate-500 dark:text-slate-400">Último generado:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 px-1.5 py-0.5 rounded">
                            {s.prefijo}{s.tipoCodigo}{String(s.actual).padStart(s.prefijo === 'E' ? 10 : 8, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Progreso */}
                      <div className="w-full sm:w-48 grid gap-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400">Disponibles:</span>
                          <span className={`font-black ${isLow ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {restantes} ({pctRestante.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden shadow-inner p-0.5">
                          <div 
                            style={{ width: `${Math.max(0, Math.min(100, pctRestante))}%` }}
                            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${isLow ? 'from-amber-600 to-orange-500' : 'from-emerald-500 to-teal-400'}`} 
                          />
                        </div>
                      </div>

                      {/* Vencimiento */}
                      <div className="grid text-xs">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Vence el</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {new Date(s.vencimiento).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Acción toggle */}
                      <div className="flex items-center gap-3">
                        {isLow && (
                          <div className="text-amber-500 flex items-center gap-1 animate-bounce" title="Pocos folios disponibles">
                            <AlertTriangle size={18} />
                          </div>
                        )}
                        <button
                          onClick={() => handleToggleNcf(s.id, s.activa)}
                          className={`btn text-xs py-1.5 px-4 font-semibold rounded-xl shadow transition-all duration-200 ${
                            s.activa 
                              ? 'border-emerald-300 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' 
                              : 'border-red-300 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                          }`}
                        >
                          {s.activa ? 'Activa' : 'Inactiva'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SECCIÓN: CIERRES Y AUDITORÍA */}
      {activeTab === 'cierre' && (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulario Cierre */}
            <div className="glass-panel border border-slate-200 dark:border-slate-800/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="text-indigo-500" size={18} />
                  Cierre de Período Contable
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  El cierre mensual consolida las cuentas nominales (Ingresos, Costos, Gastos) contra Resultados Acumulados (Patrimonio), impidiendo modificaciones posteriores en dicho período.
                </p>
              </div>

              <div className="grid gap-4 mt-6">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Seleccionar Período (Mes)</span>
                  <input
                    type="month"
                    className="input w-full bg-white dark:bg-slate-950/60 border-slate-300 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-100 rounded-xl transition-all duration-200 px-3 py-2 text-xs"
                    value={cierrePeriodoInput}
                    onChange={(e) => setCierrePeriodoInput(e.target.value)}
                  />
                </label>

                <button
                  onClick={handleCerrarPeriodo}
                  className="btn btn-primary text-xs w-full py-2.5 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  Cerrar Período
                </button>
              </div>
            </div>

            {/* Listado Periodos Cerrados */}
            <div className="glass-panel border border-slate-200 dark:border-slate-800/40 rounded-3xl p-6 shadow-2xl md:col-span-2">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-4">
                Historial de Períodos Cerrados
              </h4>
              {loadingCierre ? (
                <div className="text-xs muted py-10 animate-pulse text-center">Cargando períodos...</div>
              ) : periodosCerrados.length === 0 ? (
                <div className="text-xs text-slate-400 py-10 text-center">No hay períodos contables cerrados aún.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold">
                        <th className="py-2">Período</th>
                        <th className="py-2">Cerrado El</th>
                        <th className="py-2">Cerrado Por</th>
                        <th className="py-2 text-right">Asiento de Cierre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodosCerrados.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/20 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/10">
                          <td className="py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.periodo}</td>
                          <td className="py-2">{new Date(p.createdAt).toLocaleString()}</td>
                          <td className="py-2">{p.cerradoPor}</td>
                          <td className="py-2 text-right font-mono text-slate-500">
                            {p.asientoId ? `#${p.asientoId}` : 'Ninguno (Vacío)'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="glass-panel border border-slate-200 dark:border-slate-800/40 rounded-3xl p-6 shadow-2xl">
            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Clock className="text-violet-500" size={18} />
              Registro de Auditoría Contable (Últimos 100 eventos)
            </h4>
            {loadingCierre ? (
              <div className="text-xs muted py-10 animate-pulse text-center">Cargando logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-xs text-slate-400 py-10 text-center">No hay eventos de auditoría registrados.</div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto pr-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                      <th className="py-2">Fecha/Hora</th>
                      <th className="py-2">Módulo</th>
                      <th className="py-2">Acción</th>
                      <th className="py-2">Usuario</th>
                      <th className="py-2">IP</th>
                      <th className="py-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((l) => (
                      <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/10">
                        <td className="py-2.5 whitespace-nowrap text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                        <td className="py-2.5 whitespace-nowrap font-bold"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{l.entidad}</span></td>
                        <td className="py-2.5 whitespace-nowrap"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.accion === 'CREAR' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' :
                          l.accion === 'ANULAR' ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900' :
                          'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900'
                        }`}>{l.accion}</span></td>
                        <td className="py-2.5 whitespace-nowrap">{l.usuarioNombre || 'Sistema'}</td>
                        <td className="py-2.5 whitespace-nowrap text-slate-500 font-mono">{l.ip || '—'}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{l.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SECCIÓN: AUDITORÍA Y DIAGNÓSTICO */}
      {activeTab === 'diagnostico' && (
        <div className="grid gap-6">
          {loadingDiagnostico ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-450 animate-pulse">Analizando base de datos financiera...</p>
              </div>
            </div>
          ) : diagnosticoData ? (
            <>
              {/* Top Row: Score & Severity KPIs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-3xl p-6 shadow-xl flex items-center gap-6"
                >
                  {/* Radial progress circle */}
                  <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="stroke-slate-100 dark:stroke-slate-800"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="56"
                        cy="56"
                        r="48"
                        className={
                          diagnosticoData.healthScore >= 90 ? 'stroke-indigo-500' :
                          diagnosticoData.healthScore >= 75 ? 'stroke-emerald-500' :
                          diagnosticoData.healthScore >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                        }
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - diagnosticoData.healthScore / 100) }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-2xl font-black text-slate-850 dark:text-white font-mono">
                      {diagnosticoData.healthScore}
                    </span>
                  </div>

                  <div>
                    <span className={`text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-full border ${
                      diagnosticoData.healthLevel === 'OPTIMA' || diagnosticoData.healthLevel === 'EXCELENTE'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800' :
                      diagnosticoData.healthLevel === 'BUENA'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' :
                      diagnosticoData.healthLevel === 'MODERADA'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' :
                        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                    }`}>
                      Salud: {
                        diagnosticoData.healthLevel === 'OPTIMA' || diagnosticoData.healthLevel === 'EXCELENTE' ? 'Óptima' :
                        diagnosticoData.healthLevel === 'BUENA' ? 'Buena' :
                        diagnosticoData.healthLevel === 'MODERADA' ? 'Riesgo Moderado' : 'Alerta Crítica'
                      }
                    </span>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mt-2">Salud Financiera</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                      {diagnosticoData.healthScore >= 90
                        ? 'Su contabilidad e inventario se encuentran en un estado excelente. Continúe así.'
                        : 'Se detectaron algunas inconsistencias que requieren su atención para asegurar la salud contable.'}
                    </p>
                  </div>
                </motion.div>

                {/* Findings Summary Stats */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/40 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <ShieldAlert size={18} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Gravedad Alta</span>
                      </div>
                      <p className="text-2xl font-black text-rose-700 dark:text-rose-450 mt-3">
                        {diagnosticoData.findings.filter((f: any) => f.severity === 'ALTA').length}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Hallazgos críticos que comprometen la exactitud contable o fiscal.</p>
                  </div>

                  <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={18} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Gravedad Media</span>
                      </div>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-455 mt-3">
                        {diagnosticoData.findings.filter((f: any) => f.severity === 'MEDIA').length}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Alertas operativas que afectan el inventario o rentabilidad.</p>
                  </div>

                  <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Activity size={18} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Optimización</span>
                      </div>
                      <p className="text-2xl font-black text-indigo-700 dark:text-indigo-450 mt-3">
                        {diagnosticoData.findings.filter((f: any) => f.severity === 'BAJA').length}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Sugerencias para mejorar la liquidez y control de cobros/insumos.</p>
                  </div>
                </div>
              </div>

              {/* Second Row: Bar Chart of Categories & Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recharts Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm"
                >
                  <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-tight mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-500" /> Evaluación de Áreas Financieras
                  </h4>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diagnosticoData.categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-200)" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-slate-400)' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <ReChartsTooltip
                          cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const p = payload[0].payload
                            return (
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs">
                                <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                                <p className="text-slate-400 mt-1">Calificación: <span className="font-bold text-indigo-500">{p.score}/100</span></p>
                                <p className="text-[10px] text-slate-400">Peso en Salud: {p.weight}</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                          {diagnosticoData.categories.map((entry: any, index: number) => {
                            let fill = '#6366f1' // indigo
                            if (entry.score < 50) fill = '#f43f5e' // rose
                            else if (entry.score < 75) fill = '#f59e0b' // amber
                            else if (entry.score < 90) fill = '#10b981' // emerald
                            return <Cell key={`cell-${index}`} fill={fill} />
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Recommendations */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-tight mb-4 flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-500" /> Diagnósticos y Recomendaciones
                    </h4>
                    <div className="grid gap-3.5 max-h-[220px] overflow-y-auto pr-1">
                      {diagnosticoData.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex gap-2.5 items-start text-xs text-slate-655 dark:text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                          <p className="leading-normal">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {diagnosticoData.findings.some((f: any) => f.id === 'ventas_sin_registro_fiscal') && (
                    <div className="border-t border-slate-200 dark:border-slate-800/60 pt-4 mt-4">
                      <button
                        onClick={handleAutofix}
                        disabled={fixingDiagnostico}
                        className="btn btn-primary w-full text-xs py-2.5 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {fixingDiagnostico ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Reparando registros...
                          </>
                        ) : (
                          <>
                            <Wrench size={14} />
                            Ejecutar Autofix Fiscal
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Plan de Eficiencia de Negocio */}
              {diagnosticoData.efficiencyPlan && diagnosticoData.efficiencyPlan.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="grid gap-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                        <Zap size={16} className="text-amber-500 fill-amber-500/20" /> Plan de Eficiencia y Optimización Comercial
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Propuestas estratégicas personalizadas según las métricas operativas y balances del restaurante.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {diagnosticoData.efficiencyPlan.map((item: any) => {
                      // Map icon string to React component
                      const getIcon = (iconName: string) => {
                        switch (iconName) {
                          case 'trending-up': return <TrendingUp size={18} className="text-emerald-500" />
                          case 'coins': return <Coins size={18} className="text-amber-500" />
                          case 'credit-card': return <CreditCard size={18} className="text-indigo-500" />
                          case 'shield': return <Shield size={18} className="text-blue-500" />
                          case 'package': return <PackageOpen size={18} className="text-rose-500" />
                          case 'scale': return <Scale size={18} className="text-purple-500" />
                          default: return <Sparkles size={18} className="text-slate-500" />
                        }
                      }

                      const getBgColor = (iconName: string) => {
                        switch (iconName) {
                          case 'trending-up': return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                          case 'coins': return 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
                          case 'credit-card': return 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30'
                          case 'shield': return 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30'
                          case 'package': return 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
                          case 'scale': return 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30'
                          default: return 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800'
                        }
                      }

                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                              <div className={`p-2.5 rounded-2xl border ${getBgColor(item.icon)}`}>
                                {getIcon(item.icon)}
                              </div>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {item.impact}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                              {item.category}
                            </span>
                            <h5 className="text-xs font-black text-slate-800 dark:text-white mt-1 leading-snug">
                              {item.title}
                            </h5>
                            <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-2 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="mt-4 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/45 border border-slate-105 dark:border-slate-800/40">
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Sparkles size={10} /> Plan de Acción
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              {item.advice}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Bottom: Detailed Findings List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="grid gap-4"
              >
                <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-tight mb-1 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-slate-600 dark:text-slate-400" /> Detalle de Hallazgos Detectados
                </h4>

                {diagnosticoData.findings.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-3xl p-10 text-center text-xs text-slate-400">
                    No se han detectado inconsistencias ni anomalías en la base de datos contable o de inventario.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {diagnosticoData.findings.map((f: any) => {
                      const isExpanded = expandedFinding === f.id
                      const severityColors = {
                        ALTA: 'border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/5 text-rose-600 dark:text-rose-450',
                        MEDIA: 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/5 text-amber-600 dark:text-amber-450',
                        BAJA: 'border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/5 text-indigo-600 dark:text-indigo-400',
                      }
                      
                      return (
                        <div
                          key={f.id}
                          className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-sm transition-all duration-300"
                        >
                          {/* Finding Header */}
                          <div
                            onClick={() => setExpandedFinding(isExpanded ? null : f.id)}
                            className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg border ${severityColors[f.severity as 'ALTA'|'MEDIA'|'BAJA']}`}>
                                {f.severity}
                              </span>
                              <div>
                                <h5 className="text-xs font-black text-slate-800 dark:text-white">{f.title}</h5>
                                <p className="text-[10px] text-slate-400 mt-0.5">{f.category} • {f.count} registros afectados</p>
                              </div>
                            </div>

                            <button className="text-slate-400 p-1">
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </div>

                          {/* Expanded detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t border-slate-100 dark:border-slate-800 px-5 pb-5 pt-4 grid gap-4 bg-slate-50/40 dark:bg-slate-950/10 text-xs"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Descripción</p>
                                    <p className="text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">{f.description}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Impacto del Riesgo</p>
                                    <p className="text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">{f.impact}</p>
                                  </div>
                                </div>

                                <div className="grid gap-1.5">
                                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Registros Afectados</p>
                                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950/60 p-2.5">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                      <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 font-bold uppercase text-[9px]">
                                          <th className="py-1 pb-2">Nombre/Identificador</th>
                                          <th className="py-1 pb-2">Categoría/Detalle</th>
                                          <th className="py-1 pb-2 text-right">Monto/Valor</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {f.items.map((item: any, idx: number) => (
                                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200">
                                            <td className="py-2 pr-2 font-semibold">{item.label}</td>
                                            <td className="py-2 pr-2 text-slate-500">{item.detail}</td>
                                            <td className="py-2 text-right font-mono font-bold">{item.value}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800/60 pt-3 mt-1">
                                  {f.actionType === 'autofix' ? (
                                    <button
                                      onClick={handleAutofix}
                                      disabled={fixingDiagnostico}
                                      className="btn btn-primary py-2 px-4 rounded-xl text-[11px] font-bold flex items-center gap-1.5"
                                    >
                                      <Wrench size={12} /> {f.actionLabel}
                                    </button>
                                  ) : (
                                    <Link
                                      href={f.actionHref}
                                      className="btn border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 py-2 px-4 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
                                    >
                                      {f.actionLabel} &rarr;
                                    </Link>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            </>
          ) : (
            <div className="text-center py-10 text-sm text-slate-400">
              No se pudo cargar la información de diagnóstico.
            </div>
          )}
        </div>
      )}

      {/* MODAL 608 (ANULAR NCF) */}
      <AnimatePresence>
        {showAnulacionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border border-slate-700/60 rounded-3xl p-6 w-full max-w-md grid gap-4 bg-slate-900/95"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1">
                  <Ban className="text-red-400" /> Registrar Anulación NCF (608)
                </h3>
                <button
                  onClick={() => setShowAnulacionModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Número NCF Completo</span>
                  <input
                    className="input font-mono uppercase"
                    placeholder="Ej: B0200000045"
                    value={anulacionNcf}
                    onChange={(e) => setAnulacionNcf(e.target.value)}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Fecha de Comprobante / Emisión</span>
                  <input
                    type="date"
                    className="input"
                    value={anulacionFecha}
                    onChange={(e) => setAnulacionFecha(e.target.value)}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Tipo de Anulación (Código DGII)</span>
                  <select
                    className="input text-xs"
                    value={anulacionTipo}
                    onChange={(e) => setAnulacionTipo(e.target.value)}
                  >
                    <option value="01">01 - Deterioro de Facturas</option>
                    <option value="02">02 - Errores de Impresión</option>
                    <option value="03">03 - Omisión de Operaciones</option>
                    <option value="04">04 - Errores de Facturación</option>
                    <option value="05">05 - Sustitución de e-CF</option>
                    <option value="06">06 - Devolución de Productos</option>
                    <option value="07">07 - Descuentos Omitidos</option>
                    <option value="08">08 - Errores en NCF</option>
                    <option value="09">09 - Por Cese de Operaciones</option>
                    <option value="10">10 - Pérdida o Hurto de Talonarios</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Comentario / Motivo</span>
                  <input
                    className="input text-xs"
                    placeholder="Ej: Cliente canceló el pedido por demora"
                    value={anulacionComentario}
                    onChange={(e) => setAnulacionComentario(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button className="btn" onClick={() => setShowAnulacionModal(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleAnularNcf}>
                  Registrar Anulación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL AGREGAR NCF SECUENCIA */}
      <AnimatePresence>
        {showNewNcf && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border border-slate-700/60 rounded-3xl p-6 w-full max-w-md grid gap-4 bg-slate-900/95"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1">
                  <Sliders className="text-indigo-400" /> Nueva Secuencia NCF
                </h3>
                <button
                  onClick={() => setShowNewNcf(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Tipo de Comprobante</span>
                  <select
                    className="input"
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                  >
                    <option value="B01">B01 - Crédito Fiscal (Físico)</option>
                    <option value="B02">B02 - Consumidor Final (Físico)</option>
                    <option value="B14">B14 - Regímenes Especiales (Físico)</option>
                    <option value="B15">B15 - Gubernamental (Físico)</option>
                    <option value="E31">E31 - Crédito Fiscal (Electrónico e-CF)</option>
                    <option value="E32">E32 - Consumidor Final (Electrónico e-CF)</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-300">Rango Inicial (Inicio)</span>
                    <input
                      type="number"
                      className="input font-mono"
                      placeholder="Ej: 1"
                      value={newInicio}
                      onChange={(e) => setNewInicio(e.target.value)}
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs text-slate-300">Rango Final (Fin)</span>
                    <input
                      type="number"
                      className="input font-mono"
                      placeholder="Ej: 100"
                      value={newFin}
                      onChange={(e) => setNewFin(e.target.value)}
                    />
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Fecha de Vencimiento (DGII)</span>
                  <input
                    type="date"
                    className="input"
                    value={newVencimiento}
                    onChange={(e) => setNewVencimiento(e.target.value)}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-slate-300">Descripción / Nota</span>
                  <input
                    className="input"
                    placeholder="Ej: Lote solicitado en Mayo 2026"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                <button className="btn" onClick={() => setShowNewNcf(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleCreateNcf}>
                  Guardar Secuencia
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
