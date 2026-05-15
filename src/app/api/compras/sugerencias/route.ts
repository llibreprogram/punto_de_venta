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
    const sugerencias = await generarSugerenciasCompra()
    return NextResponse.json(sugerencias)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error calculando sugerencias' }, { status: 500 })
  }
}
