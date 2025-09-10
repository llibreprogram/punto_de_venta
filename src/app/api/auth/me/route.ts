import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json(null)
  const { user } = session
  return NextResponse.json({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol })
}
