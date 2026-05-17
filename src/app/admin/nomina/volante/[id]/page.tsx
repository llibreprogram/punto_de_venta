import { notFound } from 'next/navigation'
import prisma from '@/lib/db'
import VolanteClient from './volanteClient'

export default async function VolantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) notFound()

  const nomina = await prisma.nomina.findUnique({
    where: { id },
    include: {
      empleado: {
        select: {
          id: true, codigo: true, nombre: true, apellido: true,
          cedula: true, cargo: true, departamento: true,
          salarioBaseCents: true, nss: true, banco: true, cuentaBanco: true,
        },
      },
    },
  })

  if (!nomina) notFound()

  const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } })

  return <VolanteClient nomina={nomina} ajustes={ajustes} />
}
