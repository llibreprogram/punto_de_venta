#!/usr/bin/env ts-node
/**
 * Fusiona pedidos ABIERTO duplicados por mesaId y subCuenta, conservando el más antiguo
 * y moviendo sus items y sumando totales.
 * Uso: npx ts-node scripts/merge-duplicate-open-orders.ts
 */
import prisma from '@/lib/db'

async function main() {
  const abiertos = await prisma.pedido.findMany({ where: { estado: 'ABIERTO', mesaId: { not: null } }, include: { items: true } })
  const groups = new Map<string, typeof abiertos>()
  for (const p of abiertos) {
    const key = `${p.mesaId}-${(p as any).subCuenta || 1}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  for (const [key, list] of groups) {
    if (list.length < 2) continue
    list.sort((a,b)=> a.createdAt.getTime() - b.createdAt.getTime())
    const keep = list[0]
    const merge = list.slice(1)
    for (const m of merge) {
      await prisma.pedidoItem.updateMany({ where: { pedidoId: m.id }, data: { pedidoId: keep.id } })
      keep.subtotalCents += m.subtotalCents
      keep.impuestoCents += m.impuestoCents
      keep.descuentoCents += m.descuentoCents
      keep.totalCents += m.totalCents
      await prisma.pedido.delete({ where: { id: m.id } })
    }
    await prisma.pedido.update({ where: { id: keep.id }, data: {
      subtotalCents: keep.subtotalCents,
      impuestoCents: keep.impuestoCents,
      descuentoCents: keep.descuentoCents,
      totalCents: keep.totalCents,
    } })
    console.log(`Fusionados ${merge.length} duplicados -> pedido final ${keep.id} (${key})`)
  }
  console.log('Proceso completado')
}

main().catch(e=>{ console.error(e); process.exit(1) }).then(()=> process.exit(0))
