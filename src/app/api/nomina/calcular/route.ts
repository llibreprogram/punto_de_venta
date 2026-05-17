import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcularNominaQuincenal, type ConfigNominaData, CONFIG_DEFAULTS, generarPeriodoQuincenal } from '@/lib/payroll-engine'

async function getConfig(): Promise<ConfigNominaData> {
  const cfg = await prisma.configNomina.findUnique({ where: { id: 1 } })
  if (!cfg) return CONFIG_DEFAULTS
  return cfg as unknown as ConfigNominaData
}

// POST /api/nomina/calcular — Calcula nómina quincenal
// Body: { periodo?: string, empleadoId?: number, extras?: {...} }
// Si no se pasa periodo, se calcula el actual
// Si no se pasa empleadoId, se calculan todos los activos
export async function POST(req: Request) {
  const body = await req.json()
  const config = await getConfig()
  const periodo = body.periodo || generarPeriodoQuincenal(new Date())
  const extras = body.extras || {}

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
