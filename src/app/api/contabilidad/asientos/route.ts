/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { crearAsiento } from '@/lib/accounting'

// GET /api/contabilidad/asientos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')
    const origen = searchParams.get('origen')

    const whereClause: any = {}

    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      }
    }

    if (origen) {
      whereClause.origen = origen
    }

    const asientos = await prisma.transaccionContable.findMany({
      where: whereClause,
      include: {
        apuntes: {
          include: {
            cuenta: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
    })

    return NextResponse.json({ ok: true, asientos })
  } catch (error: any) {
    console.error('Error al obtener asientos contables:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST /api/contabilidad/asientos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fecha, descripcion, referencia, origen, apuntes } = body

    if (!fecha || !descripcion || !apuntes || !Array.isArray(apuntes) || apuntes.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Fecha, descripción y apuntes (lista) son campos obligatorios.' },
        { status: 400 }
      )
    }

    const asientoCreado = await crearAsiento(
      new Date(fecha),
      descripcion,
      referencia || '',
      origen || 'MANUAL',
      apuntes
    )

    return NextResponse.json({ ok: true, asiento: asientoCreado })
  } catch (error: any) {
    console.error('Error al crear asiento contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }
}
