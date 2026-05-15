import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import ProveedoresClient from './ProveedoresClient'

export const metadata = { title: 'Proveedores - Punto de Venta' }

export default async function ProveedoresPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-dvh">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Directorio de Proveedores</h1>
        <p className="text-slate-500 mt-1">Gestiona las empresas que suplen tu inventario.</p>
      </div>
      <ProveedoresClient />
    </div>
  )
}
