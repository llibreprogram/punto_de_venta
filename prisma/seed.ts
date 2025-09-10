import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Categorías (upsert para evitar duplicados)
  const categoriasNombres = ['Hamburguesas', 'Combos', 'Bebidas', 'Acompañantes', 'Postres']
  for (const nombre of categoriasNombres) {
    await prisma.categoria.upsert({
      where: { id: 0 }, // no hay unique por nombre, usamos findFirst abajo
      update: {},
      create: { nombre },
    }).catch(async () => {
      const exists = await prisma.categoria.findFirst({ where: { nombre } })
      if (!exists) {
        await prisma.categoria.create({ data: { nombre } })
      }
    })
  }

  const categoriasDb = await prisma.categoria.findMany()
  const map: Record<string, number> = Object.fromEntries(
    categoriasDb.map((c: { nombre: string; id: number }) => [c.nombre, c.id])
  )

  const productos = [
    { nombre: 'Hamburguesa Clásica', precioCents: 599, costoCents: 30000, categoriaId: map['Hamburguesas'] },
    { nombre: 'Hamburguesa Doble', precioCents: 799, costoCents: 40000, categoriaId: map['Hamburguesas'] },
    { nombre: 'Combo Clásico', precioCents: 899, costoCents: 50000, categoriaId: map['Combos'] },
    { nombre: 'Papas Fritas', precioCents: 249, costoCents: 15000, categoriaId: map['Acompañantes'] },
    { nombre: 'Refresco 500ml', precioCents: 199, costoCents: 10000, categoriaId: map['Bebidas'] },
    { nombre: 'Helado Vainilla', precioCents: 149, costoCents: 8000, categoriaId: map['Postres'] },
  ]
  for (const p of productos) {
    const exists = await prisma.producto.findFirst({ where: { nombre: p.nombre, categoriaId: p.categoriaId } })
    if (!exists) await prisma.producto.create({ data: p })
  }

  // Mesas ejemplo
  const mesas = ['Barra', 'Mesa 1', 'Mesa 2', 'Delivery']
  for (const nombre of mesas) {
    const exists = await prisma.mesa.findUnique({ where: { nombre } })
    if (!exists) await prisma.mesa.create({ data: { nombre } })
  }

  // Usuarios iniciales
  // Permitir override mediante variables de entorno
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const cajeroEmail = process.env.CAJERO_EMAIL || 'cajero@local'
  const cajeroPassword = process.env.CAJERO_PASSWORD || 'cajero123'
  const admin = await prisma.usuario.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    await prisma.usuario.create({ data: { nombre: 'Administrador', email: adminEmail, rol: 'admin', passwordHash: hashPassword(adminPassword) } })
  }
  const cajero = await prisma.usuario.findUnique({ where: { email: cajeroEmail } })
  if (!cajero) {
    await prisma.usuario.create({ data: { nombre: 'Cajero', email: cajeroEmail, rol: 'cajero', passwordHash: hashPassword(cajeroPassword) } })
  }

  console.log('Seed completado')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
