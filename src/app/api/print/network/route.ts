import { NextResponse, type NextRequest } from 'next/server'
import net from 'net'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { escposTicket, getLogoEscposBuffer } from '@/lib/escpos'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || (session.user.rol !== 'admin' && session.user.rol !== 'cajero'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ip, port, pedidoId, test, payload } = await req.json() as {
    ip?: string
    port?: number
    pedidoId?: number
    test?: boolean
    payload?: string
  }

  // Validar contra ajustes si hay IP configurada
  const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } })
  const configuredIp = ajustes?.printerIp?.trim()
  const targetIp = (ip || configuredIp || '').trim()
  if (!targetIp) return NextResponse.json({ error: 'Impresora no configurada' }, { status: 400 })
  if (configuredIp && targetIp !== configuredIp) return NextResponse.json({ error: 'IP de impresora no permitida' }, { status: 403 })

  const printerPort = Number(port) || 9100

  let buffer: Buffer

  try {
    if (pedidoId) {
      const pedido = await prisma.pedido.findUnique({
        where: { id: Number(pedidoId) },
        include: { items: { include: { producto: true } } }
      })
      if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

      const locale = ajustes?.locale || LOCALE
      const currency = ajustes?.currency || CURRENCY
      const fecha = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(pedido.createdAt))
      const business = ajustes?.businessName || 'Mi Restaurante'
      const items = (pedido.items as unknown) as Array<{ cantidad:number; precioCents:number; totalCents:number; extras?: string[] | null; removidos?: string[] | null; notas?: string|null; producto:{ nombre:string } }>
      const mesaNombre = (pedido as { mesa?: { nombre?: string } | null }).mesa?.nombre
      const subCuenta: number | undefined = (pedido as unknown as { subCuenta?: number }).subCuenta
      const nombreCuenta: string | undefined | null = (pedido as unknown as { nombreCuenta?: string | null }).nombreCuenta
      const itebisCents: number = (pedido as unknown as { itebisCents?: number }).itebisCents ?? 0
      const propinaCents: number = (pedido as unknown as { propinaCents?: number }).propinaCents ?? 0
      const ncf: string | null = (pedido as any).ncf || null
      const ncfTipo: string | null = (pedido as any).ncfTipo || null
      const notasStr: string | null = (pedido as any).notas || null

      let clienteRnc: string | null = null
      let clienteNombre: string | null = null
      if (notasStr) {
        const rncMatch = notasStr.match(/RNC:\s*(\d+)/i)
        const nombreMatch = notasStr.match(/Nombre:\s*(.*)/i)
        if (rncMatch) {
          clienteRnc = rncMatch[1]
          clienteNombre = nombreMatch ? nombreMatch[1].trim() : null
        }
      }

      const ticketText = escposTicket({
        business,
        address: ajustes?.businessAddress,
        rnc: ajustes?.businessRnc,
        phone: ajustes?.businessPhone,
        numero: pedido.numero,
        fecha,
        mesa: mesaNombre,
        subCuenta,
        nombreCuenta,
        ncf,
        ncfTipo,
        clienteRnc,
        clienteNombre,
        items: items.map(it => ({ nombre: it.producto.nombre + (Array.isArray(it.extras) && it.extras.length? `\n  + ${it.extras.join(', ')}`:'' ) + (Array.isArray(it.removidos) && it.removidos.length? `\n  - Sin: ${it.removidos.join(', ')}`:'' ) + (it.notas? `\n  * ${it.notas}`:''), cantidad: it.cantidad, unit: toCurrency(it.precioCents, locale, currency), total: toCurrency(it.totalCents, locale, currency) })),
        subtotal: toCurrency(pedido.subtotalCents, locale, currency),
        itebis: itebisCents > 0 ? toCurrency(itebisCents, locale, currency) : undefined,
        propina: propinaCents > 0 ? toCurrency(propinaCents, locale, currency) : undefined,
        impuesto: (!itebisCents && !propinaCents && pedido.impuestoCents) ? toCurrency(pedido.impuestoCents, locale, currency) : undefined,
        descuento: pedido.descuentoCents ? toCurrency(pedido.descuentoCents, locale, currency) : undefined,
        total: toCurrency(pedido.totalCents, locale, currency),
        footer: ajustes?.ticketFooter
      })

      const logoBuffer = await getLogoEscposBuffer(ajustes?.logoUrl)
      const ticketBuffer = Buffer.from(ticketText, 'binary')

      if (logoBuffer) {
        const drawerKick = ticketBuffer.subarray(0, 10)
        const rest = ticketBuffer.subarray(10)
        buffer = Buffer.concat([drawerKick, logoBuffer, rest])
      } else {
        buffer = ticketBuffer
      }
    } else if (test) {
      const locale = ajustes?.locale || LOCALE
      const currency = ajustes?.currency || CURRENCY
      const business = ajustes?.businessName || 'Mi Restaurante'
      const fecha = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
      const items = [
        { nombre: 'Artículo de prueba A', cantidad: 1, unit: toCurrency(1999, locale, currency), total: toCurrency(1999, locale, currency) },
        { nombre: 'Artículo de prueba B', cantidad: 2, unit: toCurrency(500, locale, currency), total: toCurrency(1000, locale, currency) },
      ]
      const subtotal = 1999 + 1000
      const impuesto = Math.round(subtotal * (Number(ajustes?.taxPct || 0) / 100))
      const total = subtotal + impuesto
      const ticketText = escposTicket({
        business,
        numero: 0,
        fecha,
        items,
        subtotal: toCurrency(subtotal, locale, currency),
        impuesto: toCurrency(impuesto, locale, currency),
        total: toCurrency(total, locale, currency),
        footer: ajustes?.ticketFooter
      })

      const logoBuffer = await getLogoEscposBuffer(ajustes?.logoUrl)
      const ticketBuffer = Buffer.from(ticketText, 'binary')

      if (logoBuffer) {
        const drawerKick = ticketBuffer.subarray(0, 10)
        const rest = ticketBuffer.subarray(10)
        buffer = Buffer.concat([drawerKick, logoBuffer, rest])
      } else {
        buffer = ticketBuffer
      }
    } else if (payload) {
      if (payload.startsWith('base64:')) {
        buffer = Buffer.from(payload.substring(7), 'base64')
      } else {
        buffer = Buffer.from(payload, 'binary')
      }
    } else {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error generando ticket para impresión de red:', error)
    return NextResponse.json({ error: 'Error al generar ticket' }, { status: 500 })
  }

  const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(8000)
    socket.once('timeout', () => { socket.destroy(); resolve({ ok: false, error: 'Timeout' }) })
    socket.once('error', (err) => { resolve({ ok: false, error: err.message }) })
    socket.connect(printerPort, targetIp, () => {
      socket.write(buffer, () => {
        socket.end()
      })
    })
    socket.once('close', () => resolve({ ok: true }))
  })

  if (!res.ok) return NextResponse.json({ error: res.error || 'Error' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
