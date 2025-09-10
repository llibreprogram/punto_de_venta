import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  const mesas = await prisma.mesa.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } })
  return NextResponse.json(mesas)
}
