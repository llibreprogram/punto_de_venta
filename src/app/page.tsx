import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  // Validar sesión contra DB
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) redirect('/login?next=/')
  const me = { nombre: session.user.nombre, rol: session.user.rol }
  const isAdmin = me.rol === 'admin'
  const canVentas = me.rol === 'admin' || me.rol === 'cajero'
  const isLogged = true
  const pages = [
    { href:'/pos', title:'POS', desc:'Pantalla principal de ventas rápidas.' },
    { href:'/ventas', title:'Ventas', desc:'Historial de ventas con filtros por fecha.', sensitive:true },
    { href:'/ticket/1', title:'Ejemplo de Ticket', desc:'Vista imprimible del ticket (reemplaza el ID por uno real).' },
  { href:'/admin/productos', title:'Productos (Admin)', desc:'Gestión de imágenes y datos de productos.', sensitive:true },
  { href:'/admin/categorias', title:'Categorías (Admin)', desc:'Alta, edición y activación de categorías.', sensitive:true },
  { href:'/admin/usuarios', title:'Usuarios (Admin)', desc:'Altas de operarios y administradores.', sensitive:true },
    { href:'/reportes', title:'Reportes (Admin)', desc:'Resumen por día, categoría o producto.', sensitive:true },
    { href:'/configuracion', title:'Configuración (Admin)', desc:'Ajustes globales del sistema.', sensitive:true },
  ]
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto grid gap-6">
        <header className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Punto de Venta - Restaurante</h1>
          <div className="ml-auto text-sm">
            {isLogged ? (
              <span>Hola, {me.nombre} ({me.rol})</span>
            ) : (
              <a className="underline" href="/login">Iniciar sesión</a>
            )}
          </div>
        </header>
        <p className="muted">Selecciona una página:</p>
        <ul className="grid gap-3">
          {pages.map(p => {
            if (p.href==='/ventas' && !canVentas) return null
            if (p.sensitive && !isAdmin) return null
            return (
        <li key={p.href} className="card rounded p-4 flex items-center gap-3 hover:shadow-md">
                <div className="grid">
          <a className="text-lg font-semibold underline" href={p.href}>{p.title}</a>
          <span className="text-sm muted">{p.desc}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
