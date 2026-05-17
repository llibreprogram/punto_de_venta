import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/nomina/empleados/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empleado = await prisma.empleado.findUnique({
    where: { id: Number(id) },
    include: {
      nominas: { orderBy: { periodo: 'desc' }, take: 12 },
      _count: { select: { nominas: true, asistencias: true } },
    },
  })
  if (!empleado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(empleado)
}

// PUT /api/nomina/empleados/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Check cédula uniqueness if changed
  if (body.cedula) {
    const existe = await prisma.empleado.findFirst({
      where: { cedula: body.cedula, NOT: { id: Number(id) } },
    })
    if (existe) return NextResponse.json({ error: 'Cédula duplicada' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  const fields = [
    'codigo', 'nombre', 'apellido', 'cedula', 'sexo', 'direccion', 'telefono',
    'email', 'cargo', 'departamento', 'tipoContrato', 'salarioBaseCents',
    'tipoSalario', 'cuentaBanco', 'banco', 'nss', 'afpId', 'activo',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  if (body.fechaNacimiento !== undefined) data.fechaNacimiento = body.fechaNacimiento ? new Date(body.fechaNacimiento) : null
  if (body.fechaIngreso) data.fechaIngreso = new Date(body.fechaIngreso)
  if (body.fechaSalida !== undefined) data.fechaSalida = body.fechaSalida ? new Date(body.fechaSalida) : null

  const empleado = await prisma.empleado.update({ where: { id: Number(id) }, data })
  return NextResponse.json(empleado)
}

// DELETE /api/nomina/empleados/[id] — Soft delete (desactivar)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.empleado.update({
    where: { id: Number(id) },
    data: { activo: false, fechaSalida: new Date() },
  })
  return NextResponse.json({ ok: true })
}
