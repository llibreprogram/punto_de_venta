import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const BACKUPS_DIR = process.env.BACKUPS_DIR || '/opt/punto_de_venta/backups'

export async function GET() {
  try {
    const entries = await fs.readdir(BACKUPS_DIR, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile() && e.name.endsWith('.tar.gz'))
      .map(e => e.name)
      .sort()
    let totalBytes = 0
    let last: { file: string; bytes: number; mtime: string } | null = null
    for (const name of files) {
      const fp = path.join(BACKUPS_DIR, name)
      const st = await fs.stat(fp)
      totalBytes += st.size
      if (!last || st.mtimeMs > Date.parse(last.mtime)) {
        last = { file: name, bytes: st.size, mtime: st.mtime.toISOString() }
      }
    }
    return NextResponse.json({ count: files.length, totalBytes, last })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: 'unavailable', message }, { status: 200 })
  }
}
