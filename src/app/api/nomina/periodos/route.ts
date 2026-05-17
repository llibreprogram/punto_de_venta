import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/nomina/periodos — Lista periodos con resumen
export async function GET() {
  // Get all unique periods
  const nominas = await prisma.nomina.findMany({
    select: {
      periodo: true,
      tipo: true,
      estado: true,
      salarioNetoCents: true,
      totalDevengadoCents: true,
      totalDeduccionesCents: true,
      totalPatronalCents: true,
    },
    orderBy: { periodo: 'desc' },
  })

  // Group by period
  const periodosMap = new Map<string, {
    periodo: string;
    empleados: number;
    totalBrutoCents: number;
    totalNetoCents: number;
    totalDeduccionesCents: number;
    totalPatronalCents: number;
    estados: Record<string, number>;
  }>()

  for (const n of nominas) {
    const key = `${n.periodo}-${n.tipo}`
    if (!periodosMap.has(key)) {
      periodosMap.set(key, {
        periodo: n.periodo,
        empleados: 0,
        totalBrutoCents: 0,
        totalNetoCents: 0,
        totalDeduccionesCents: 0,
        totalPatronalCents: 0,
        estados: {},
      })
    }
    const p = periodosMap.get(key)!
    p.empleados++
    p.totalBrutoCents += n.totalDevengadoCents
    p.totalNetoCents += n.salarioNetoCents
    p.totalDeduccionesCents += n.totalDeduccionesCents
    p.totalPatronalCents += n.totalPatronalCents
    p.estados[n.estado] = (p.estados[n.estado] || 0) + 1
  }

  const periodos = Array.from(periodosMap.values())
    .sort((a, b) => b.periodo.localeCompare(a.periodo))

  return NextResponse.json({ periodos })
}
