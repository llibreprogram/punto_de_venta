import prisma from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ready: true, time: new Date().toISOString() })
  } catch {
    return NextResponse.json({ ready: false, error: 'db_unreachable' }, { status: 503 })
  }
}
