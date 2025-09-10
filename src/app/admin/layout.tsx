import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') redirect('/login?next=/admin')
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-white/80 backdrop-blur px-4 py-2 flex gap-4 text-sm">
        <Link href="/admin/categorias" className="hover:underline">Categorías</Link>
        <Link href="/admin/productos" className="hover:underline">Productos</Link>
        <Link href="/admin/usuarios" className="hover:underline">Usuarios</Link>
        <Link href="/admin/mesas" className="hover:underline">Mesas</Link>
        <Link href="/configuracion" className="ml-auto hover:underline">Configuración</Link>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  )
}
