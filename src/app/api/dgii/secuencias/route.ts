/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/dgii/secuencias
export async function GET() {
  try {
    const secuencias = await prisma.secuenciaNcf.findMany({
      orderBy: { tipo: 'asc' },
    })
    return NextResponse.json({ ok: true, secuencias })
  } catch (error: any) {
    console.error('Error al obtener secuencias NCF:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST /api/dgii/secuencias
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, prefijo, tipoCodigo, inicio, fin, actual, vencimiento, descripcion } = body

    if (
      !tipo ||
      !prefijo ||
      !tipoCodigo ||
      inicio === undefined ||
      fin === undefined ||
      actual === undefined ||
      !vencimiento
    ) {
      return NextResponse.json({ ok: false, error: 'Todos los campos son obligatorios.' }, { status: 400 })
    }

    const secuencia = await prisma.secuenciaNcf.create({
      data: {
        tipo,
        prefijo,
        tipoCodigo,
        inicio: parseInt(inicio, 10),
        fin: parseInt(fin, 10),
        actual: parseInt(actual, 10),
        vencimiento: new Date(vencimiento),
        descripcion,
        activa: true,
      },
    })

    return NextResponse.json({ ok: true, secuencia })
  } catch (error: any) {
    console.error('Error al crear secuencia NCF:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/dgii/secuencias/[id] (simplificado en el route para no crear archivo extra)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, activa, actual, fin, vencimiento } = body

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID de secuencia es obligatorio.' }, { status: 400 })
    }

    const updateData: any = {}
    if (activa !== undefined) updateData.activa = activa
    if (actual !== undefined) updateData.actual = parseInt(actual, 10)
    if (fin !== undefined) updateData.fin = parseInt(fin, 10)
    if (vencimiento !== undefined) updateData.vencimiento = new Date(vencimiento)

    const secuencia = await prisma.secuenciaNcf.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    })

    return NextResponse.json({ ok: true, secuencia })
  } catch (error: any) {
    console.error('Error al actualizar secuencia NCF:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
