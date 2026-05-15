import prisma from './src/lib/db'

async function run() {
  const insumos = await prisma.insumo.findMany()
  console.log("All Insumos:", insumos.map(i => ({ id: i.id, stock: i.stockActual, min: i.stockMinimo })))
}
run()
