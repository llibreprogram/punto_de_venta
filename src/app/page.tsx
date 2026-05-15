import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

const PAGES = [
  { href:'/pos', title:'POS', desc:'Pantalla principal de ventas rápidas.', icon:'🖥️', color:'bg-orange-50 border-orange-200 text-orange-700' },
  { href:'/ventas', title:'Ventas', desc:'Historial de ventas con filtros por fecha.', icon:'📊', color:'bg-blue-50 border-blue-200 text-blue-700', sensitive:true },
  { href:'/kds', title:'Cocina (KDS)', desc:'Pantalla de estado de preparación.', icon:'👨‍🍳', color:'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { href:'/admin', title:'Dashboard', desc:'Resumen del rendimiento del negocio.', icon:'📈', color:'bg-violet-50 border-violet-200 text-violet-700', sensitive:true },
  { href:'/admin/productos', title:'Productos', desc:'Gestión de imágenes y datos de productos.', icon:'📦', color:'bg-amber-50 border-amber-200 text-amber-700', sensitive:true },
  { href:'/admin/categorias', title:'Categorías', desc:'Alta, edición y activación de categorías.', icon:'🏷️', color:'bg-teal-50 border-teal-200 text-teal-700', sensitive:true },
  { href:'/admin/usuarios', title:'Usuarios', desc:'Gestión de operarios y administradores.', icon:'👥', color:'bg-indigo-50 border-indigo-200 text-indigo-700', sensitive:true },
  { href:'/reportes', title:'Reportes', desc:'Resumen por día, categoría o producto.', icon:'📋', color:'bg-cyan-50 border-cyan-200 text-cyan-700', sensitive:true },
  { href:'/configuracion', title:'Configuración', desc:'Ajustes globales del sistema.', icon:'⚙️', color:'bg-slate-50 border-slate-200 text-slate-700', sensitive:true },
  { href:'/admin/salud', title:'Salud del Sistema', desc:'Estado de la base de datos y backups.', icon:'💚', color:'bg-green-50 border-green-200 text-green-700', sensitive:true },
]

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) redirect('/login?next=/')
  const me = { nombre: session.user.nombre, rol: session.user.rol }
  const isAdmin = me.rol === 'admin'
  const canVentas = me.rol === 'admin' || me.rol === 'cajero'
  const isCocinero = me.rol === 'cocinero'

  if (isCocinero) redirect('/kds')

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto grid gap-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <span className="text-xl">🍽️</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting}, {me.nombre}</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Rol: <span className="capitalize font-semibold text-slate-700">{me.rol}</span> · {now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <a href="/pos" className="px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all hover:shadow-xl active:scale-95"
            style={{ background: 'var(--gradient-brand)' }}
          >
            Ir al POS →
          </a>
        </header>

        {/* Modules Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {PAGES.map(p => {
            if (p.href==='/ventas' && !canVentas) return null
            if (p.href==='/pos' && isCocinero) return null
            if (p.sensitive && !isAdmin) return null
            return (
              <a 
                key={p.href} 
                href={p.href}
                className={`group rounded-xl border p-4 md:p-5 flex flex-col gap-2.5 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[.98] ${p.color}`}
              >
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <div className="font-bold text-sm">{p.title}</div>
                  <div className="text-xs opacity-70 mt-0.5 leading-relaxed">{p.desc}</div>
                </div>
              </a>
            )
          })}
        </div>

        <footer className="text-center text-xs text-slate-400 font-medium pt-4 border-t border-slate-200">
          © 2026 Rafael Llibre · Punto de Venta v2.0
        </footer>
      </div>
    </main>
  )
}
