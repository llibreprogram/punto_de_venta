import prisma from '@/lib/db'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const wantsHtml = req.nextUrl.searchParams.get('html') === '1' || (req.headers.get('accept') || '').includes('text/html')
  try {
    await prisma.$queryRaw`SELECT 1`
    if (!wantsHtml) return NextResponse.json({ ready: true, time: new Date().toISOString() })
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ready</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;padding:2rem;color:#111}.ok{color:#16a34a}.err{color:#dc2626}.card{border:1px solid #e5e7eb;border-radius:12px;padding:1rem;max-width:560px}</style></head><body><div class="card"><h1 class="ok">Listo</h1><p>La aplicación está lista y la base de datos responde.</p><p><small>${new Date().toLocaleString()}</small></p><p><a href="/admin/salud">Ir a Salud</a></p></div></body></html>`
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch {
    if (!wantsHtml) return NextResponse.json({ ready: false, error: 'db_unreachable' }, { status: 503 })
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>No listo</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;padding:2rem;color:#111}.err{color:#dc2626}.card{border:1px solid #fecaca;background:#fef2f2;border-radius:12px;padding:1rem;max-width:560px}</style></head><body><div class="card"><h1 class="err">No listo</h1><p>No se pudo contactar la base de datos.</p><p><small>${new Date().toLocaleString()}</small></p></div></body></html>`
    return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}
