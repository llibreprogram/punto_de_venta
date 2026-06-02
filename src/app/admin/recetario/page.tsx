import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import RecetarioClient from './RecetarioClient'
import prisma from '@/lib/db'

export const metadata = { title: 'Recetario - Punto de Venta' }

export default async function RecetarioPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') redirect('/login')

  const productos = await prisma.producto.findMany({
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, requiereCocina: true, costoCents: true }
  })
  
  const insumos = await prisma.insumo.findMany({
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, unidadMedida: true, costoCents: true, stockActual: true }
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-dvh">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Recetario (Fichas Técnicas)</h1>
        <p className="text-slate-500 mt-1">Configura las porciones de insumos para cada plato de tu menú.</p>
      </div>
      <RecetarioClient productosRaw={productos} insumosRaw={insumos} />
    </div>
  )
}
