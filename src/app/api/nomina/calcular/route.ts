import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcularNominaQuincenal, type ConfigNominaData, CONFIG_DEFAULTS, generarPeriodoQuincenal } from '@/lib/payroll-engine'

async function getConfig(): Promise<ConfigNominaData> {
  const cfg = await prisma.configNomina.findUnique({ where: { id: 1 } })
  if (!cfg) return CONFIG_DEFAULTS

  // Parse propinaDistribucion from JSON string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = cfg as any
  let propinaDistribucion = CONFIG_DEFAULTS.propinaDistribucion
  if (raw.propinaDistribucion) {
    try {
      propinaDistribucion = JSON.parse(raw.propinaDistribucion)
    } catch { /* use defaults */ }
  }

  return {
    ...raw as ConfigNominaData,
    propinaDistribucion,
  }
}

// POST /api/nomina/calcular — Calcula nómina quincenal
// Body: { periodo?: string, empleadoId?: number, extras?: {...}, incluirPropinas?: boolean }
// Si no se pasa periodo, se calcula el actual
// Si no se pasa empleadoId, se calculan todos los activos
export async function POST(req: Request) {
  const body = await req.json()
  const config = await getConfig()
  const periodo = body.periodo || generarPeriodoQuincenal(new Date())
  const extras = body.extras || {}
  const propinasDistribuidas = body.propinasDistribuidas || {} // { [empleadoId]: centavos }

  let empleados
  if (body.empleadoId) {
    const emp = await prisma.empleado.findUnique({ where: { id: body.empleadoId } })
    if (!emp) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    empleados = [emp]
  } else {
    empleados = await prisma.empleado.findMany({ where: { activo: true } })
  }

  const resultados = []

  for (const emp of empleados) {
    // Check if nomina already exists for this period
    const existente = await prisma.nomina.findUnique({
      where: { empleadoId_periodo_tipo: { empleadoId: emp.id, periodo, tipo: body.tipo || 'ORDINARIA' } },
    })

    // Use per-employee extras if provided, otherwise global extras
    const empExtras = extras[emp.id] || extras.global || {}

    // Add tip amount if distributed
    if (propinasDistribuidas[emp.id]) {
      empExtras.propinaCents = propinasDistribuidas[emp.id]
    }

    const calculo = calcularNominaQuincenal(emp.salarioBaseCents, empExtras, config)

    const data = {
      periodo,
      tipo: body.tipo || 'ORDINARIA',
      estado: 'CALCULADA',
      empleadoId: emp.id,
      ...calculo,
    }

    let nomina
    if (existente) {
      nomina = await prisma.nomina.update({ where: { id: existente.id }, data })
    } else {
      nomina = await prisma.nomina.create({ data })
    }

    resultados.push({ empleado: emp, nomina })
  }

  return NextResponse.json({ periodo, resultados, total: resultados.length })
}
