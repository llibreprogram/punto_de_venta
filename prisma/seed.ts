import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Solo crear datos demo si es la PRIMERA instalación (0 categorías)
  // Esto evita re-crear categorías y productos que el admin borró intencionalmente
  const totalCategorias = await prisma.categoria.count()
  if (totalCategorias === 0) {
    const categoriasNombres = ['Hamburguesas', 'Combos', 'Bebidas', 'Acompañantes', 'Postres']
    for (const nombre of categoriasNombres) {
      await prisma.categoria.create({ data: { nombre } }).catch(() => {})
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
      if (p.categoriaId) await prisma.producto.create({ data: p }).catch(() => {})
    }

    // Mesas ejemplo
    const mesas = ['Barra', 'Mesa 1', 'Mesa 2', 'Delivery']
    for (const nombre of mesas) {
      const exists = await prisma.mesa.findUnique({ where: { nombre } })
      if (!exists) await prisma.mesa.create({ data: { nombre } })
    }
    console.log('Datos demo creados (primera instalación)')
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

  // --- SEED CONTABILIDAD ---
  const totalCuentas = await prisma.cuentaContable.count()
  if (totalCuentas === 0) {
    console.log('Sembrando Catálogo de Cuentas Contables...')
    
    const cuentasSemilla = [
      { codigo: '1', nombre: 'Activos', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: null },
      { codigo: '1.1', nombre: 'Activos Corrientes', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1' },
      { codigo: '1.1.01', nombre: 'Efectivo y Equivalentes', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.1' },
      { codigo: '1.1.01.01', nombre: 'Caja Chica', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.1.01' },
      { codigo: '1.1.01.02', nombre: 'Banco Popular', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.1.01' },
      { codigo: '1.1.02', nombre: 'Cuentas por Cobrar', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.1' },
      { codigo: '1.1.02.01', nombre: 'Cuentas por Cobrar Clientes', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.1.02' },
      { codigo: '1.1.04', nombre: 'Inventarios', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.1' },
      { codigo: '1.1.04.01', nombre: 'Inventario de Insumos', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.1.04' },
      { codigo: '1.2', nombre: 'Activos No Corrientes', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1' },
      { codigo: '1.2.01', nombre: 'Propiedad, Planta y Equipos', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.2' },
      { codigo: '1.2.01.01', nombre: 'Mobiliario y Equipos', tipo: 'ACTIVO', naturaleza: 'DEBITO', padreCodigo: '1.2.01' },

      { codigo: '2', nombre: 'Pasivos', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: null },
      { codigo: '2.1', nombre: 'Pasivos Corrientes', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2' },
      { codigo: '2.1.01', nombre: 'Cuentas por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1' },
      { codigo: '2.1.01.01', nombre: 'Cuentas por Pagar Proveedores', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1.01' },
      { codigo: '2.1.02', nombre: 'Impuestos por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1' },
      { codigo: '2.1.02.01', nombre: 'ITBIS por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1.02' },
      { codigo: '2.1.02.02', nombre: 'Propina Legal 10% por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1.02' },
      { codigo: '2.1.03', nombre: 'Retenciones por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1' },
      { codigo: '2.1.03.01', nombre: 'Retenciones TSS por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1.03' },
      { codigo: '2.1.03.02', nombre: 'Retenciones ISR por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1.03' },
      { codigo: '2.1.03.03', nombre: 'Retenciones INFOTEP por Pagar', tipo: 'PASIVO', naturaleza: 'CREDITO', padreCodigo: '2.1.03' },

      { codigo: '3', nombre: 'Patrimonio', tipo: 'PATRIMONIO', naturaleza: 'CREDITO', padreCodigo: null },
      { codigo: '3.1', nombre: 'Capital Contable', tipo: 'PATRIMONIO', naturaleza: 'CREDITO', padreCodigo: '3' },
      { codigo: '3.1.01', nombre: 'Capital Social', tipo: 'PATRIMONIO', naturaleza: 'CREDITO', padreCodigo: '3.1' },
      { codigo: '3.1.01.01', nombre: 'Capital Social Autorizado', tipo: 'PATRIMONIO', naturaleza: 'CREDITO', padreCodigo: '3.1.01' },

      { codigo: '4', nombre: 'Ingresos', tipo: 'INGRESO', naturaleza: 'CREDITO', padreCodigo: null },
      { codigo: '4.1', nombre: 'Ingresos Operacionales', tipo: 'INGRESO', naturaleza: 'CREDITO', padreCodigo: '4' },
      { codigo: '4.1.01', nombre: 'Ventas', tipo: 'INGRESO', naturaleza: 'CREDITO', padreCodigo: '4.1' },
      { codigo: '4.1.01.01', nombre: 'Ventas de Alimentos y Bebidas', tipo: 'INGRESO', naturaleza: 'CREDITO', padreCodigo: '4.1.01' },

      { codigo: '5', nombre: 'Costos', tipo: 'COSTO', naturaleza: 'DEBITO', padreCodigo: null },
      { codigo: '5.1', nombre: 'Costo de Ventas', tipo: 'COSTO', naturaleza: 'DEBITO', padreCodigo: '5' },
      { codigo: '5.1.01', nombre: 'Costos Operativos', tipo: 'COSTO', naturaleza: 'DEBITO', padreCodigo: '5.1' },
      { codigo: '5.1.01.01', nombre: 'Costo de Alimentos y Bebidas Vendidos', tipo: 'COSTO', naturaleza: 'DEBITO', padreCodigo: '5.1.01' },

      { codigo: '6', nombre: 'Gastos', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: null },
      { codigo: '6.1', nombre: 'Gastos Operativos', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6' },
      { codigo: '6.1.01', nombre: 'Gastos de Personal', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6.1' },
      { codigo: '6.1.01.01', nombre: 'Gasto de Sueldos y Salarios', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6.1.01' },
      { codigo: '6.1.01.02', nombre: 'Gasto de TSS Patronal', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6.1.01' },
      { codigo: '6.1.01.03', nombre: 'Gasto de INFOTEP Patronal', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6.1.01' },
      { codigo: '6.1.02', nombre: 'Gastos de Servicios', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6.1' },
      { codigo: '6.1.02.01', nombre: 'Gasto de Alquileres', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6.1.02' },
      { codigo: '6.1.02.02', nombre: 'Gasto de Servicios Públicos (Agua, Luz, Teléfono)', tipo: 'GASTO', naturaleza: 'DEBITO', padreCodigo: '6.1.02' }
    ]

    const codeToId: Record<string, number> = {}
    const ordenadas = [...cuentasSemilla].sort((a, b) => a.codigo.length - b.codigo.length)

    for (const c of ordenadas) {
      const padreId = c.padreCodigo ? codeToId[c.padreCodigo] : null
      const creada = await prisma.cuentaContable.create({
        data: {
          codigo: c.codigo,
          nombre: c.nombre,
          tipo: c.tipo,
          naturaleza: c.naturaleza,
          padreId: padreId || undefined
        }
      })
      codeToId[c.codigo] = creada.id
    }
    console.log('Catálogo de Cuentas Contables sembrado con éxito.')
  }

  // --- SEED NCF SECUENCIAS ---
  const totalNcfSecuencias = await prisma.secuenciaNcf.count()
  if (totalNcfSecuencias === 0) {
    console.log('Sembrando Secuencias NCF por defecto...')
    
    const secuenciasNcf = [
      { tipo: 'B01', prefijo: 'B', tipoCodigo: '01', inicio: 1, fin: 500, actual: 0, vencimiento: new Date('2027-12-31T23:59:59Z'), descripcion: 'Crédito Fiscal (Físico)' },
      { tipo: 'B02', prefijo: 'B', tipoCodigo: '02', inicio: 1, fin: 10000, actual: 0, vencimiento: new Date('2027-12-31T23:59:59Z'), descripcion: 'Consumo (Físico)' },
      { tipo: 'B14', prefijo: 'B', tipoCodigo: '14', inicio: 1, fin: 100, actual: 0, vencimiento: new Date('2027-12-31T23:59:59Z'), descripcion: 'Regímenes Especiales' },
      { tipo: 'B15', prefijo: 'B', tipoCodigo: '15', inicio: 1, fin: 100, actual: 0, vencimiento: new Date('2027-12-31T23:59:59Z'), descripcion: 'Gubernamental' }
    ]

    for (const s of secuenciasNcf) {
      await prisma.secuenciaNcf.create({
        data: s
      })
    }
    console.log('Secuencias NCF sembradas con éxito.')
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
