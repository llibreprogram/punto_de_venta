import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import ComprasClient from './ComprasClient'

export const metadata = { title: 'Órdenes de Compra - Punto de Venta' }

export default async function ComprasPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-dvh">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Órdenes de Compra</h1>
        <p className="text-slate-500 mt-1">Genera sugerencias automáticas de compra (JIT) y gestiona tus pedidos a proveedores.</p>
      </div>
      <ComprasClient />
    </div>
  )
}
