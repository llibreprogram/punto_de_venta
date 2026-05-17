import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { clasificarEmpresa, salarioMinimoRD } from '@/lib/payroll-engine'

// GET /api/nomina/empleados — Lista todos los empleados
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const activo = searchParams.get('activo')
  const buscar = searchParams.get('buscar')

  const where: Record<string, unknown> = {}
  if (activo !== null) where.activo = activo === 'true'
  if (buscar) {
    where.OR = [
      { nombre: { contains: buscar } },
      { apellido: { contains: buscar } },
      { cedula: { contains: buscar } },
      { codigo: { contains: buscar } },
      { cargo: { contains: buscar } },
    ]
  }

  const empleados = await prisma.empleado.findMany({
    where,
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { nominas: true } } },
  })

  // Auto-clasificación
  const totalActivos = await prisma.empleado.count({ where: { activo: true } })
  const clasificacion = clasificarEmpresa(totalActivos)
  const salarioMinimo = salarioMinimoRD(clasificacion)

  return NextResponse.json({
    empleados,
    meta: { total: empleados.length, totalActivos, clasificacion, salarioMinimoCents: salarioMinimo },
  })
}

// POST /api/nomina/empleados — Crear nuevo empleado
export async function POST(req: Request) {
  const body = await req.json()

  // Auto-generar código si no viene
  if (!body.codigo) {
    const count = await prisma.empleado.count()
    body.codigo = `EMP-${String(count + 1).padStart(3, '0')}`
  }

  // Validar cédula única
  if (body.cedula) {
    const existe = await prisma.empleado.findUnique({ where: { cedula: body.cedula } })
    if (existe) return NextResponse.json({ error: 'Ya existe un empleado con esta cédula' }, { status: 400 })
  }

  const empleado = await prisma.empleado.create({
    data: {
      codigo: body.codigo,
      nombre: body.nombre,
      apellido: body.apellido,
      cedula: body.cedula,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      sexo: body.sexo || null,
      direccion: body.direccion || null,
      telefono: body.telefono || null,
      email: body.email || null,
      cargo: body.cargo,
      departamento: body.departamento || 'Operaciones',
      tipoContrato: body.tipoContrato || 'INDEFINIDO',
      fechaIngreso: new Date(body.fechaIngreso),
      salarioBaseCents: body.salarioBaseCents,
      tipoSalario: body.tipoSalario || 'QUINCENAL',
      cuentaBanco: body.cuentaBanco || null,
      banco: body.banco || null,
      nss: body.nss || null,
      afpId: body.afpId || null,
    },
  })

  return NextResponse.json(empleado, { status: 201 })
}
