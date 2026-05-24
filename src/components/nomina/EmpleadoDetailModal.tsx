'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Briefcase, CreditCard, History, Clock, 
  Phone, Mail, MapPin, Building, ShieldCheck, 
  Calendar, FileText, Download, Sparkles
} from 'lucide-react'

interface PagoNomina {
  id: number
  periodo: string
  salarioBaseCents: number
  comisionesCents: number
  horasExtrasCents: number
  otrosIngresosCents: number
  retencionAfpCents: number
  retencionSfsCents: number
  retencionIsrCents: number
  otrasDeduccionesCents: number
  netoPagarCents: number
  estado: string
}

interface EmpleadoDetail {
  id: number
  codigo: string
  nombre: string
  apellido: string
  cedula: string
  fechaNacimiento: string | null
  sexo: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  cargo: string
  departamento: string
  tipoContrato: string
  fechaIngreso: string
  fechaSalida: string | null
  activo: boolean
  salarioBaseCents: number
  tipoSalario: string
  cuentaBanco: string | null
  banco: string | null
  nss: string | null
  afpId: string | null
  nominas?: PagoNomina[]
}

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { 
    style: 'currency', 
    currency: 'DOP', 
    minimumFractionDigits: 2 
  }).format(cents / 100)
}

function calcularAntiguedad(fechaIngresoStr: string, fechaSalidaStr: string | null | undefined) {
  const inicio = new Date(fechaIngresoStr)
  const fin = fechaSalidaStr ? new Date(fechaSalidaStr) : new Date()

  if (isNaN(inicio.getTime())) return 'Fecha de ingreso no válida'

  let years = fin.getFullYear() - inicio.getFullYear()
  let months = fin.getMonth() - inicio.getMonth()
  let days = fin.getDate() - inicio.getDate()

  if (days < 0) {
    months -= 1
    // Obtener último día del mes anterior
    const prevMonthDate = new Date(fin.getFullYear(), fin.getMonth(), 0)
    days += prevMonthDate.getDate()
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`)
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`)
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`)

  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`
}

type TabType = 'perfil' | 'laboral' | 'financiero' | 'historial'

export default function EmpleadoDetailModal({ 
  empleadoId, 
  onClose, 
  onViewVolante 
}: { 
  empleadoId: number
  onClose: () => void 
  onViewVolante?: (nomina: any) => void
}) {
  const [activeTab, setActiveTab] = useState<TabType>('perfil')
  const [data, setData] = useState<EmpleadoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchEmpleado() {
      setLoading(true)
      try {
        const res = await fetch(`/api/nomina/empleados/${empleadoId}`)
        if (!res.ok) {
          throw new Error('Error al cargar la ficha del empleado')
        }
        const doc = await res.json()
        setData(doc)
      } catch (err: any) {
        setError(err.message || 'Error inesperado')
      } finally {
        setLoading(false)
      }
    }

    fetchEmpleado()
  }, [empleadoId])

  const inputCls = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 font-medium select-all"
  const labelCls = "block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1"

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div 
        initial={{ scale: 0.96, y: 15 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-900"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-900/60 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/10 dark:to-purple-950/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold shadow-md">
              {data ? `${data.nombre[0]}${data.apellido[0]}` : '👤'}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-850 dark:text-white leading-snug">
                {data ? `${data.nombre} ${data.apellido}` : 'Cargando Empleado...'}
              </h2>
              {data && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                    {data.codigo}
                  </span>
                  • {data.cargo}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-850 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 dark:text-slate-500 text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-8 flex-1 flex flex-col justify-center items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-400 animate-pulse">Obteniendo ficha de empleado...</p>
          </div>
        ) : error ? (
          <div className="p-8 flex-1 text-center">
            <span className="text-4xl text-rose-500">⚠️</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2">{error}</p>
            <button onClick={onClose} className="btn mt-4 text-xs">Cerrar</button>
          </div>
        ) : data ? (
          <>
            {/* Navigation Tabs */}
            <div className="flex px-4 border-b border-slate-100 dark:border-slate-900/60 bg-slate-50/40 dark:bg-slate-950/20">
              <button 
                onClick={() => setActiveTab('perfil')}
                className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'perfil' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <User size={14} /> Personal
              </button>
              <button 
                onClick={() => setActiveTab('laboral')}
                className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'laboral' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Briefcase size={14} /> Laboral
              </button>
              <button 
                onClick={() => setActiveTab('financiero')}
                className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'financiero' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <CreditCard size={14} /> Pago y TSS
              </button>
              <button 
                onClick={() => setActiveTab('historial')}
                className={`py-3.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'historial' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <History size={14} /> Nóminas ({data.nominas?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-950">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* General Profile Tab */}
                  {activeTab === 'perfil' && (
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls}>Nombre</label>
                        <div className={inputCls}>{data.nombre}</div>
                      </div>
                      <div>
                        <label className={labelCls}>Apellido</label>
                        <div className={inputCls}>{data.apellido}</div>
                      </div>
                      <div>
                        <label className={labelCls}>Cédula de Identidad</label>
                        <div className={inputCls}>{data.cedula}</div>
                      </div>
                      <div>
                        <label className={labelCls}>Sexo / Género</label>
                        <div className={inputCls}>
                          {data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : 'No especificado'}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Fecha de Nacimiento</label>
                        <div className={inputCls}>
                          {data.fechaNacimiento 
                            ? new Date(data.fechaNacimiento).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })
                            : 'No especificada'}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Teléfono de Contacto</label>
                        <div className={`${inputCls} flex items-center gap-1.5`}>
                          <Phone size={12} className="text-slate-400" />
                          <span>{data.telefono || 'Sin registrar'}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Correo Electrónico</label>
                        <div className={`${inputCls} flex items-center gap-1.5`}>
                          <Mail size={12} className="text-slate-400" />
                          <span>{data.email || 'Sin registrar'}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Dirección Residencial</label>
                        <div className={`${inputCls} flex items-center gap-1.5`}>
                          <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                          <span>{data.direccion || 'Sin registrar'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Laboral Tab */}
                  {activeTab === 'laboral' && (
                    <div className="space-y-6">
                      {/* Seniority Widget */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/50 dark:border-indigo-900/20 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Antigüedad en la Empresa</h4>
                          <p className="text-sm font-black text-slate-850 dark:text-white mt-0.5">
                            {calcularAntiguedad(data.fechaIngreso, data.fechaSalida)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Ingresó el: {new Date(data.fechaIngreso).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>Cargo</label>
                          <div className={inputCls}>{data.cargo}</div>
                        </div>
                        <div>
                          <label className={labelCls}>Departamento</label>
                          <div className={`${inputCls} flex items-center gap-1.5`}>
                            <Building size={12} className="text-slate-400" />
                            <span>{data.departamento}</span>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Tipo de Contrato</label>
                          <div className={inputCls}>
                            {data.tipoContrato === 'INDEFINIDO' && '📋 Indefinido'}
                            {data.tipoContrato === 'TEMPORAL' && '⏳ Temporal'}
                            {data.tipoContrato === 'PRUEBA' && '🔍 Periodo de Prueba'}
                            {!['INDEFINIDO', 'TEMPORAL', 'PRUEBA'].includes(data.tipoContrato) && data.tipoContrato}
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Estado Laboral</label>
                          <div className="flex items-center mt-1.5">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                              data.activo 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' 
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                            }`}>
                              {data.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Fecha de Ingreso</label>
                          <div className={`${inputCls} flex items-center gap-1.5`}>
                            <Calendar size={12} className="text-slate-400" />
                            <span>{new Date(data.fechaIngreso).toLocaleDateString('es-DO')}</span>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Fecha de Egreso / Salida</label>
                          <div className={`${inputCls} flex items-center gap-1.5`}>
                            <Calendar size={12} className="text-slate-400" />
                            <span>{data.fechaSalida ? new Date(data.fechaSalida).toLocaleDateString('es-DO') : 'Activo en nómina'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment & Security Tab */}
                  {activeTab === 'financiero' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-900 rounded-2xl p-4 flex justify-between items-center">
                          <div>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Salario Mensual Nominal</h4>
                            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{formatRD(data.salarioBaseCents)}</p>
                          </div>
                          <div className="text-right">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pago por Quincena</h4>
                            <p className="text-sm font-extrabold text-slate-600 dark:text-slate-350 mt-0.5">{formatRD(Math.round(data.salarioBaseCents / 2))}</p>
                          </div>
                        </div>

                        <div>
                          <label className={labelCls}>Esquema de Pago</label>
                          <div className={inputCls}>{data.tipoSalario}</div>
                        </div>
                        <div>
                          <label className={labelCls}>Banco Receptor</label>
                          <div className={inputCls}>{data.banco || 'Sin configurar'}</div>
                        </div>
                        <div className="col-span-2">
                          <label className={labelCls}>Cuenta de Depósito</label>
                          <div className={inputCls}>{data.cuentaBanco || 'Sin configurar'}</div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-900 pt-5">
                        <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-indigo-500" /> Seguridad Social y Retenciones (TSS)
                        </h4>
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className={labelCls}>Número de Seguridad Social (NSS)</label>
                            <div className={inputCls}>{data.nss || 'No afiliado'}</div>
                          </div>
                          <div>
                            <label className={labelCls}>ID AFP (Fondo de Pensiones)</label>
                            <div className={inputCls}>{data.afpId || 'No afiliado'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payroll History Tab */}
                  {activeTab === 'historial' && (
                    <div className="space-y-4">
                      {!data.nominas || data.nominas.length === 0 ? (
                        <div className="p-12 text-center">
                          <span className="text-3xl">📋</span>
                          <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 mt-2">Sin historial de pagos</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Este empleado no ha sido procesado en ninguna nómina aún.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-slate-900">
                                <th className="px-4 py-3">Periodo</th>
                                <th className="px-4 py-3 text-right">Salario Base</th>
                                <th className="px-4 py-3 text-right">Extras/Comisiones</th>
                                <th className="px-4 py-3 text-right">Deducciones</th>
                                <th className="px-4 py-3 text-right">Neto Pagado</th>
                                <th className="px-4 py-3 text-center">Volante</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                              {data.nominas.map((n) => {
                                const totalIngresos = n.salarioBaseCents + n.comisionesCents + n.horasExtrasCents + n.otrosIngresosCents
                                const totalDeducciones = n.retencionAfpCents + n.retencionSfsCents + n.retencionIsrCents + n.otrasDeduccionesCents
                                return (
                                  <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-slate-700 dark:text-slate-350">
                                    <td className="px-4 py-3 font-semibold font-mono text-indigo-650 dark:text-indigo-400">{n.periodo}</td>
                                    <td className="px-4 py-3 text-right">{formatRD(n.salarioBaseCents)}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-450">
                                      {formatRD(n.comisionesCents + n.horasExtrasCents + n.otrosIngresosCents)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-450">
                                      {formatRD(totalDeducciones)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-white">
                                      {formatRD(n.netoPagarCents)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button 
                                        onClick={() => {
                                          if (onViewVolante) {
                                            onViewVolante(n)
                                          }
                                        }}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-all"
                                        title="Ver Volante"
                                      >
                                        <FileText size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        ) : null}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-900/60 flex justify-end bg-slate-50/20 dark:bg-slate-950/20">
          <button 
            onClick={onClose} 
            className="btn btn-primary text-xs py-2 px-5 rounded-xl shadow-md"
          >
            Aceptar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
