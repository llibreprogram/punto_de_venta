import { NextResponse, type NextRequest } from 'next/server'
import net from 'net'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || (session.user.rol !== 'admin' && session.user.rol !== 'cajero'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ip, port, payload } = await req.json() as { ip?: string; port?: number; payload?: string }
  if (!payload) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  // Validar contra ajustes si hay IP configurada
  const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } })
  const configuredIp = ajustes?.printerIp?.trim()
  const targetIp = (ip || configuredIp || '').trim()
  if (!targetIp) return NextResponse.json({ error: 'Impresora no configurada' }, { status: 400 })
  if (configuredIp && targetIp !== configuredIp) return NextResponse.json({ error: 'IP de impresora no permitida' }, { status: 403 })

  const printerPort = Number(port) || 9100

  const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(8000)
    socket.once('timeout', () => { socket.destroy(); resolve({ ok: false, error: 'Timeout' }) })
    socket.once('error', (err) => { resolve({ ok: false, error: err.message }) })
    socket.connect(printerPort, targetIp, () => {
      socket.write(payload, 'utf-8', () => {
        // Opcional: enviar corte
        socket.end()
      })
    })
    socket.once('close', () => resolve({ ok: true }))
  })

  if (!res.ok) return NextResponse.json({ error: res.error || 'Error' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
