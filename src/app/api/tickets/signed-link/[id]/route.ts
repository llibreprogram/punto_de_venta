import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { generateSignedTicketUrl } from '@/lib/ticketSign'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const pid = Number(id)
  if (!Number.isFinite(pid) || pid <= 0) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(session.user.rol === 'admin' || session.user.rol === 'cajero')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const ttlParam = req.nextUrl.searchParams.get('ttl')
  const ttlSeconds = Math.min(3600, Math.max(60, Number(ttlParam) || 600)) // 1–60 min limit
  try {
    const url = generateSignedTicketUrl(pid, { hostOrigin: req.nextUrl.origin, ttlSeconds })
    return NextResponse.json({ ok: true, url, exp: Math.floor(Date.now()/1000)+ttlSeconds })
  } catch (e) {
    console.error('[signed-link] error', e)
    return NextResponse.json({ error: 'No se pudo generar enlace' }, { status: 500 })
  }
}
