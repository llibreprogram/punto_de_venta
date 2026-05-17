'use client'

function formatRD(cents: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(cents / 100)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function VolanteClient({ nomina, ajustes }: { nomina: any; ajustes: any }) {
  const emp = nomina.empleado || {}
  const [y, m, q] = (nomina.periodo || '').split('-')
  const periodoLabel = `${q === 'Q1' ? '1ra' : '2da'} Quincena — ${new Date(Number(y), Number(m) - 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}`
  const businessName = ajustes?.businessName || 'Mi Empresa'
  const businessRnc = ajustes?.businessRnc || ''

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Print Controls (hidden on print) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <a href="/admin/nomina" className="btn text-sm">← Volver a Nómina</a>
          <h1 className="text-sm font-bold text-slate-700">Volante de Pago — {emp.nombre} {emp.apellido}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn btn-primary text-sm flex items-center gap-2">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="max-w-[700px] mx-auto p-6 print:p-0 print:max-w-none">
        <div className="bg-white rounded-xl shadow-lg print:shadow-none print:rounded-none p-8 print:p-6">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{businessName}</h1>
                {businessRnc && <p className="text-xs text-slate-500 mt-0.5">RNC: {businessRnc}</p>}
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-slate-800">VOLANTE DE PAGO</h2>
                <p className="text-sm text-slate-500 mt-0.5">{periodoLabel}</p>
                <p className="text-xs text-slate-400 mt-0.5">Nro. {nomina.id}</p>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
            <div className="flex gap-2"><span className="text-slate-500 w-24">Empleado:</span><strong className="text-slate-900">{emp.nombre} {emp.apellido}</strong></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24">Código:</span><strong>{emp.codigo}</strong></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24">Cédula:</span><strong>{emp.cedula}</strong></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24">Cargo:</span><strong>{emp.cargo}</strong></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24">Departamento:</span><strong>{emp.departamento}</strong></div>
            {emp.nss && <div className="flex gap-2"><span className="text-slate-500 w-24">NSS:</span><strong>{emp.nss}</strong></div>}
            {emp.banco && <div className="flex gap-2"><span className="text-slate-500 w-24">Banco:</span><strong>{emp.banco}</strong></div>}
            {emp.cuentaBanco && <div className="flex gap-2"><span className="text-slate-500 w-24">Cuenta:</span><strong>{emp.cuentaBanco}</strong></div>}
          </div>

          {/* Main Table */}
          <table className="w-full text-sm border-collapse mb-6">
            {/* Ingresos */}
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider" colSpan={2}>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Salario Base (Quincenal)" value={nomina.salarioBaseCents} />
              {nomina.horasExtrasCents > 0 && <Row label={`Horas Extras (${nomina.horasExtraDiurnas}h diurnas, ${nomina.horasExtraNocturnas}h nocturnas, ${nomina.horasExtraFeriado}h feriado)`} value={nomina.horasExtrasCents} />}
              {nomina.comisionesCents > 0 && <Row label="Comisiones" value={nomina.comisionesCents} />}
              {nomina.bonosCents > 0 && <Row label="Bonos" value={nomina.bonosCents} />}
              {nomina.propinaCents > 0 && <Row label="Propinas" value={nomina.propinaCents} />}
              {nomina.otrosIngresosCents > 0 && <Row label="Otros Ingresos" value={nomina.otrosIngresosCents} />}
              <TotalRow label="TOTAL DEVENGADO" value={nomina.totalDevengadoCents} />
            </tbody>

            {/* Deducciones */}
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider" colSpan={2}>Deducciones</th>
              </tr>
            </thead>
            <tbody>
              <Row label="SFS — Seguro Familiar de Salud" value={nomina.sfsCents} negative />
              <Row label="AFP — Fondo de Pensión" value={nomina.afpCents} negative />
              {nomina.isrCents > 0 && <Row label="ISR — Impuesto Sobre la Renta" value={nomina.isrCents} negative />}
              {nomina.adelantoCents > 0 && <Row label="Adelanto de Salario" value={nomina.adelantoCents} negative />}
              {nomina.otrasDeduccionesCents > 0 && <Row label="Otras Deducciones" value={nomina.otrasDeduccionesCents} negative />}
              <TotalRow label="TOTAL DEDUCCIONES" value={nomina.totalDeduccionesCents} negative />
            </tbody>

            {/* Neto */}
            <tbody>
              <tr className="bg-emerald-50 print:bg-emerald-50">
                <td className="px-3 py-3 font-black text-base text-emerald-900 border-t-2 border-emerald-300">SALARIO NETO A PAGAR</td>
                <td className="px-3 py-3 text-right font-black text-xl text-emerald-800 border-t-2 border-emerald-300">{formatRD(nomina.salarioNetoCents)}</td>
              </tr>
            </tbody>
          </table>

          {/* Employer Contributions (info) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6 text-xs">
            <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              Aportes Patronales (Información — No se descuentan al empleado)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-slate-100">
              <InfoCell label="SFS Patronal" value={nomina.sfsPatronalCents} />
              <InfoCell label="AFP Patronal" value={nomina.afpPatronalCents} />
              <InfoCell label="SRL" value={nomina.srlCents} />
              <InfoCell label="INFOTEP" value={nomina.infotepCents} />
            </div>
            <div className="bg-purple-50 px-3 py-1.5 border-t border-slate-200 flex justify-between font-bold text-purple-800">
              <span>Total Costo Patronal</span>
              <span>{formatRD(nomina.totalPatronalCents)}</span>
            </div>
          </div>

          {/* Notes */}
          {nomina.notas && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
              <strong>Notas:</strong> {nomina.notas}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-12 pt-4">
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-2">
                <p className="text-sm font-bold text-slate-700">Empleador</p>
                <p className="text-xs text-slate-400">{businessName}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-2">
                <p className="text-sm font-bold text-slate-700">Empleado</p>
                <p className="text-xs text-slate-400">{emp.nombre} {emp.apellido}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            <p>Este documento es un comprobante de pago. Conserve para sus registros.</p>
            <p className="mt-1">Generado el {new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:p-6 { padding: 1.5rem !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:bg-emerald-50 { background-color: #ecfdf5 !important; }
          @page { margin: 1cm; size: letter; }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className="px-3 py-2 text-slate-700">{label}</td>
      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${negative ? 'text-red-600' : 'text-slate-900'}`}>
        {negative ? '-' : ''}{formatRD(value)}
      </td>
    </tr>
  )
}

function TotalRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <tr className={`${negative ? 'bg-red-50/50' : 'bg-blue-50/50'} font-bold`}>
      <td className={`px-3 py-2.5 border-t border-slate-200 ${negative ? 'text-red-700' : 'text-blue-800'}`}>{label}</td>
      <td className={`px-3 py-2.5 text-right border-t border-slate-200 tabular-nums ${negative ? 'text-red-700' : 'text-blue-800'}`}>
        {negative ? '-' : ''}{formatRD(value)}
      </td>
    </tr>
  )
}

function InfoCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-2 text-center">
      <div className="text-slate-400">{label}</div>
      <div className="font-bold text-slate-700">{formatRD(value)}</div>
    </div>
  )
}
