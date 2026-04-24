import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || (session.user.rol !== 'admin' && session.user.rol !== 'cajero')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const abiertos = await prisma.pedido.findMany({ where: { estado: 'ABIERTO', mesaId: { not: null } }, include: { items: true } })
  const groups = new Map<string, typeof abiertos>()
  for (const p of abiertos) {
    const key = `${p.mesaId}-${(p as { subCuenta?: number }).subCuenta || 1}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  const merged: Array<{ mesaId:number|null; subCuenta:number; kept:number; removed:number[] }> = []
  for (const [, list] of groups) {
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
  merged.push({ mesaId: keep.mesaId, subCuenta: (keep as { subCuenta?: number }).subCuenta || 1, kept: keep.id, removed: merge.map(m=>m.id) })
  }
  return NextResponse.json({ ok: true, merged })
}
