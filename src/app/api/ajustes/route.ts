import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let a = await prisma.ajustes.findUnique({ where: { id: 1 } })
  if (!a) a = await prisma.ajustes.create({ data: { id: 1 } })
  return NextResponse.json(a)
}

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as Partial<{ locale:string; currency:string; taxPct:number; businessName:string; ticketFooter:string; logoUrl:string; printerIp:string|null; printerPort:number|null; serialBaud:number|null; autoKitchenOnCreate:boolean; autoKitchenOnReady:boolean; touchMode:boolean }>
  const data: Partial<{ locale:string; currency:string; taxPct:number; businessName:string; ticketFooter:string; logoUrl:string; printerIp:string|null; printerPort:number|null; serialBaud:number|null; autoKitchenOnCreate:boolean; autoKitchenOnReady:boolean; touchMode:boolean }> = {}
  if (typeof body.locale === 'string') data.locale = body.locale
  if (typeof body.currency === 'string') data.currency = body.currency
  if (typeof body.taxPct === 'number' && Number.isFinite(body.taxPct)) data.taxPct = Math.max(0, Math.round(body.taxPct))
  if (typeof body.businessName === 'string') data.businessName = body.businessName
  if (typeof body.ticketFooter === 'string') data.ticketFooter = body.ticketFooter
  if (typeof body.logoUrl === 'string') data.logoUrl = body.logoUrl
  if (typeof body.printerIp === 'string' || body.printerIp === null) data.printerIp = body.printerIp ?? null
  if (typeof body.printerPort === 'number' && Number.isFinite(body.printerPort)) data.printerPort = Math.max(1, Math.round(body.printerPort))
  if (typeof body.serialBaud === 'number' && Number.isFinite(body.serialBaud)) data.serialBaud = Math.max(1, Math.round(body.serialBaud))
  if (typeof body.autoKitchenOnCreate === 'boolean') data.autoKitchenOnCreate = body.autoKitchenOnCreate
  if (typeof body.autoKitchenOnReady === 'boolean') data.autoKitchenOnReady = body.autoKitchenOnReady
  if (typeof body.touchMode === 'boolean') data.touchMode = body.touchMode
  const a = await prisma.ajustes.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data })
  return NextResponse.json(a)
}
