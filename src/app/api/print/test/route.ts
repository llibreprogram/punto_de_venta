import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { escposTicket, getLogoEscposBuffer } from '@/lib/escpos'
import { toCurrency, LOCALE, CURRENCY } from '@/lib/money'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || (session.user.rol !== 'admin' && session.user.rol !== 'cajero'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } })
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

  let finalBuffer: Buffer
  if (logoBuffer) {
    const drawerKick = ticketBuffer.subarray(0, 10)
    const rest = ticketBuffer.subarray(10)
    finalBuffer = Buffer.concat([drawerKick, logoBuffer, rest])
  } else {
    finalBuffer = ticketBuffer
  }

  return new NextResponse(finalBuffer as any, { headers: { 'Content-Type': 'application/octet-stream' } })
}
