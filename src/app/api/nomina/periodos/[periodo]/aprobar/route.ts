import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/nomina/periodos/[periodo]/aprobar — Aprobar y/o pagar un periodo
export async function POST(req: Request, { params }: { params: Promise<{ periodo: string }> }) {
  const { periodo } = await params
  const body = await req.json()
  const nuevoEstado = body.estado || 'APROBADA' // APROBADA or PAGADA

  const nominas = await prisma.nomina.findMany({
    where: { periodo, estado: { in: ['CALCULADA', 'APROBADA'] } },
  })

  if (nominas.length === 0) {
    return NextResponse.json({ error: 'No hay nóminas calculadas para este periodo' }, { status: 400 })
  }

  const updated = await prisma.nomina.updateMany({
    where: { periodo, estado: { in: ['CALCULADA', 'APROBADA'] } },
    data: {
      estado: nuevoEstado,
      ...(nuevoEstado === 'PAGADA' ? { fechaPago: new Date() } : {}),
    },
  })

  return NextResponse.json({ ok: true, actualizadas: updated.count, periodo, estado: nuevoEstado })
}
