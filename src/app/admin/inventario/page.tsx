import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import InventarioClient from './InventarioClient'

export const metadata = { title: 'Inventario - Punto de Venta' }

export default async function InventarioPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-dvh">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Inventario de Insumos</h1>
          <p className="text-slate-500 mt-1">Controla la materia prima y registra entradas o salidas.</p>
        </div>
      </div>
      <InventarioClient />
    </div>
  )
}
