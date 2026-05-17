import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/nomina/nominas — Lista nóminas con filtros
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo')
  const empleadoId = searchParams.get('empleadoId')
  const estado = searchParams.get('estado')

  const where: Record<string, unknown> = {}
  if (periodo) where.periodo = periodo
  if (empleadoId) where.empleadoId = Number(empleadoId)
  if (estado) where.estado = estado

  const nominas = await prisma.nomina.findMany({
    where,
    include: { empleado: { select: { id: true, codigo: true, nombre: true, apellido: true, cargo: true, cedula: true } } },
    orderBy: [{ periodo: 'desc' }, { empleado: { nombre: 'asc' } }],
  })

  // Totals for the filtered set
  const totals = nominas.reduce(
    (acc, n) => ({
      totalDevengado: acc.totalDevengado + n.totalDevengadoCents,
      totalDeducciones: acc.totalDeducciones + n.totalDeduccionesCents,
      totalNeto: acc.totalNeto + n.salarioNetoCents,
      totalPatronal: acc.totalPatronal + n.totalPatronalCents,
    }),
    { totalDevengado: 0, totalDeducciones: 0, totalNeto: 0, totalPatronal: 0 }
  )

  return NextResponse.json({ nominas, totals, count: nominas.length })
}
