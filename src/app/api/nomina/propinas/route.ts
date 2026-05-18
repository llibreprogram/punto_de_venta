import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parsearPeriodo } from '@/lib/payroll-engine'

/**
 * GET /api/nomina/propinas?periodo=2026-05-Q1
 * Calcula el total de propinas recaudadas en un periodo desde los pedidos pagados.
 * La propina legal del 10% (Art. 228 CT) se registra en cada pedido.
 * 
 * Query params:
 *   - periodo: string (ej: "2026-05-Q1")
 *   - detalle: "true" para desglose diario
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo')
  const detalle = searchParams.get('detalle') === 'true'

  if (!periodo) {
    return NextResponse.json({ error: 'Periodo requerido (ej: 2026-05-Q1)' }, { status: 400 })
  }

  try {
    const { inicio, fin } = parsearPeriodo(periodo)
    // Extend fin to end of day
    fin.setHours(23, 59, 59, 999)

    // Sum all propinaCents from paid orders in the period
    const result = await prisma.pedido.aggregate({
      _sum: { propinaCents: true },
      _count: { id: true },
      where: {
        estado: 'PAGADO',
        createdAt: { gte: inicio, lte: fin },
        propinaCents: { gt: 0 },
      },
    })

    const totalPropinaCents = result._sum.propinaCents || 0
    const totalPedidos = result._count.id || 0

    // If detail requested, group by day
    let desgloseDiario: { fecha: string; totalCents: number; pedidos: number }[] = []
    if (detalle) {
      const pedidos = await prisma.pedido.findMany({
        where: {
          estado: 'PAGADO',
          createdAt: { gte: inicio, lte: fin },
          propinaCents: { gt: 0 },
        },
        select: { propinaCents: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })

      const porDia: Record<string, { totalCents: number; pedidos: number }> = {}
      for (const p of pedidos) {
        const dia = p.createdAt.toISOString().split('T')[0]
        if (!porDia[dia]) porDia[dia] = { totalCents: 0, pedidos: 0 }
        porDia[dia].totalCents += p.propinaCents
        porDia[dia].pedidos += 1
      }

      desgloseDiario = Object.entries(porDia).map(([fecha, data]) => ({
        fecha,
        ...data,
      }))
    }

    // Get tip distribution config
    const config = await prisma.configNomina.findUnique({ where: { id: 1 } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawConfig = config as any
    let distribucion: Record<string, number> = { Servicio: 40, Cocina: 35, Barra: 15, Auxiliar: 10 }
    if (rawConfig?.propinaDistribucion) {
      try {
        distribucion = JSON.parse(rawConfig.propinaDistribucion)
      } catch { /* use defaults */ }
    }

    // Get active employees and calculate per-department distribution
    const empleados = await prisma.empleado.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, apellido: true, cargo: true, departamento: true },
    })

    // Map department to distribution key
    const DEPT_MAP: Record<string, string> = {
      'Servicio': 'Servicio',
      'Cocina': 'Cocina',
      'Barra': 'Barra',
      'Auxiliar': 'Auxiliar',
      'Operaciones': 'Servicio', // default
    }

    // Excluded departments (admin/gerencia don't get tips per law)
    const EXCLUDED = ['Administración', 'Admin', 'Gerencia', 'Contabilidad']

    // Group employees by distribution category (excluding admin)
    const empleadosPorCategoria: Record<string, typeof empleados> = {}
    const empleadosExcluidos: typeof empleados = []

    for (const emp of empleados) {
      const isExcluded = EXCLUDED.some(ex => 
        emp.departamento.toLowerCase().includes(ex.toLowerCase()) ||
        emp.cargo.toLowerCase().includes(ex.toLowerCase())
      )
      if (isExcluded) {
        empleadosExcluidos.push(emp)
        continue
      }
      const cat = DEPT_MAP[emp.departamento] || 'Auxiliar'
      if (!empleadosPorCategoria[cat]) empleadosPorCategoria[cat] = []
      empleadosPorCategoria[cat].push(emp)
    }

    // Calculate per-employee tip distribution
    const distribucionEmpleados: {
      empleadoId: number
      nombre: string
      categoria: string
      porcentajeCategoria: number
      montoCents: number
    }[] = []

    for (const [cat, emps] of Object.entries(empleadosPorCategoria)) {
      const pctCategoria = distribucion[cat] || 0
      const montoCategoriaCents = Math.round(totalPropinaCents * pctCategoria / 100)
      const montoPorEmpleado = emps.length > 0 ? Math.round(montoCategoriaCents / emps.length) : 0

      for (const emp of emps) {
        distribucionEmpleados.push({
          empleadoId: emp.id,
          nombre: `${emp.nombre} ${emp.apellido}`,
          categoria: cat,
          porcentajeCategoria: pctCategoria,
          montoCents: montoPorEmpleado,
        })
      }
    }

    return NextResponse.json({
      periodo,
      totalPropinaCents,
      totalPedidos,
      configuracionDistribucion: distribucion,
      distribucionEmpleados,
      empleadosExcluidos: empleadosExcluidos.map(e => ({
        id: e.id,
        nombre: `${e.nombre} ${e.apellido}`,
        cargo: e.cargo,
        razon: 'Personal administrativo/gerencial excluido (Art. 228 CT)',
      })),
      ...(detalle ? { desgloseDiario } : {}),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}
