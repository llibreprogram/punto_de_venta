import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { generarSugerenciasCompra } from '@/lib/inventoryPredictor'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    console.log('[PREDICTOR] Ejecutando motor predictivo...')
    const sugerencias = await generarSugerenciasCompra()
    console.log(`[PREDICTOR] Resultado: ${sugerencias.length} sugerencias generadas`)
    if (sugerencias.length === 0) {
      // Diagnóstico: verificar qué hay en la base de datos
      const { PrismaClient } = require('@prisma/client')
      const db = new PrismaClient()
      const todos = await db.insumo.findMany({ where: { activo: true }, select: { id: true, nombre: true, stockActual: true, stockMinimo: true } })
      console.log('[PREDICTOR] Insumos activos en DB:', JSON.stringify(todos))
      const bajos = todos.filter((i: any) => i.stockActual <= i.stockMinimo)
      console.log('[PREDICTOR] Insumos bajo mínimo:', JSON.stringify(bajos))
      await db.$disconnect()
    }
    return NextResponse.json(sugerencias)
  } catch (error) {
    console.error('[PREDICTOR] ERROR:', error)
    return NextResponse.json({ error: 'Error calculando sugerencias' }, { status: 500 })
  }
}
