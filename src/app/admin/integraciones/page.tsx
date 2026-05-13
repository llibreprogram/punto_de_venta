import { prisma } from '@/lib/db'
import IntegracionesClient from './IntegracionesClient'

export const dynamic = 'force-dynamic'

export default async function IntegracionesPage() {
  const productos = await prisma.producto.findMany({
    include: {
      categoria: true,
      integrationMappings: true
    },
    orderBy: {
      categoriaId: 'asc'
    }
  })

  // Format data for the client
  const items = productos.map(p => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria.nombre,
    precioCents: p.precioCents,
    ubereatsId: p.integrationMappings.find(m => m.platform === 'ubereats')?.externalItemId || '',
    pedidosyaId: p.integrationMappings.find(m => m.platform === 'pedidosya')?.externalItemId || ''
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-black text-slate-800">Mapeo de Menú (Integraciones API)</h1>
        <p className="text-slate-500 mt-2">
          Para que los webhooks funcionen correctamente, debes enlazar el ID interno de tus productos con los IDs que te proveen los portales de desarrollo de UberEats y PedidosYa.
        </p>
      </div>

      <IntegracionesClient initialItems={items} />
    </div>
  )
}
