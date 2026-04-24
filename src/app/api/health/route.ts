import prisma from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  let db = 'error'
  try {
    // Lightweight ping: count on a tiny table; fallback to raw query if needed
    await prisma.$queryRaw`SELECT 1`
    db = 'ok'
  } catch {
    db = 'error'
  }
  return NextResponse.json({ ok: true, db, time: new Date().toISOString() })
}
