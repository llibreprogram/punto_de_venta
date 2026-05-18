import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CONFIG_DEFAULTS } from '@/lib/payroll-engine'

// GET /api/nomina/config — Obtener configuración actual
export async function GET() {
  let config = await prisma.configNomina.findUnique({ where: { id: 1 } })
  if (!config) {
    // Create with defaults
    config = await prisma.configNomina.create({
      data: { id: 1 },
    })
  }
  return NextResponse.json(config)
}

// PUT /api/nomina/config — Actualizar configuración
export async function PUT(req: Request) {
  const body = await req.json()

  // Build allowed fields from CONFIG_DEFAULTS + propinaDistribucion (stored as string)
  const allowedFields = Object.keys(CONFIG_DEFAULTS)
  const data: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      // propinaDistribucion: store as JSON string if it's an object
      if (key === 'propinaDistribucion' && typeof body[key] === 'object') {
        data[key] = JSON.stringify(body[key])
      } else {
        data[key] = body[key]
      }
    }
  }

  const config = await prisma.configNomina.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  })

  return NextResponse.json(config)
}
