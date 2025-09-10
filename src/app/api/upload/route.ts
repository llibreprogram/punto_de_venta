import { NextResponse, type NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  const bytes = new Uint8Array(await file.arrayBuffer())
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadDir, { recursive: true })
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_')}`
  const filepath = path.join(uploadDir, filename)
  await fs.writeFile(filepath, bytes)
  return NextResponse.json({ url: `/uploads/${filename}` })
}
