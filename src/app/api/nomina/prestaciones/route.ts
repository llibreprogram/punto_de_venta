import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcularPrestaciones, calcularRegaliaPascual, formatRD } from '@/lib/payroll-engine'

// POST /api/nomina/prestaciones — Calcular prestaciones laborales
// Body: { empleadoId: number, tipoTerminacion: string, fechaSalida?: string }
export async function POST(req: Request) {
  const body = await req.json()

  const empleado = await prisma.empleado.findUnique({ where: { id: body.empleadoId } })
  if (!empleado) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })

  const fechaSalida = body.fechaSalida ? new Date(body.fechaSalida) : new Date()
  const tipoTerminacion = body.tipoTerminacion || 'DESAHUCIO'

  const prestaciones = calcularPrestaciones(
    empleado.salarioBaseCents,
    empleado.fechaIngreso,
    fechaSalida,
    tipoTerminacion
  )

  // Regalía pascual proyectada para el año completo
  const mesesAnio = fechaSalida.getMonth() + 1
  const regaliaPascual = calcularRegaliaPascual(empleado.salarioBaseCents, Math.min(mesesAnio, 12))

  return NextResponse.json({
    empleado: {
      id: empleado.id,
      nombre: `${empleado.nombre} ${empleado.apellido}`,
      cargo: empleado.cargo,
      salario: formatRD(empleado.salarioBaseCents),
      fechaIngreso: empleado.fechaIngreso,
    },
    tipoTerminacion,
    fechaSalida,
    prestaciones,
    regaliaPascual: {
      mesesAnio,
      montoCents: regaliaPascual,
    },
  })
}
