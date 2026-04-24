import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { promisify } from 'node:util'
import { execFile as _execFile } from 'node:child_process'
import path from 'node:path'
import { promises as fs } from 'node:fs'

const execFile = promisify(_execFile)
const BACKUPS_DIR = process.env.BACKUPS_DIR || '/opt/punto_de_venta/backups'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await getSession(token)
  if (!session || session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve backup script path
  const candidates = [
    path.resolve(process.cwd(), 'scripts', 'backup.sh'),
    '/opt/punto_de_venta/scripts/backup.sh',
  ]
  let scriptPath: string | null = null
  for (const c of candidates) {
    try { await fs.access(c); scriptPath = c; break } catch { /* ignore */ }
  }
  if (!scriptPath) {
    return NextResponse.json({ error: 'script_not_found', tried: candidates }, { status: 500 })
  }

  try {
    const { stdout, stderr } = await execFile('/usr/bin/env', ['bash', scriptPath], {
      cwd: process.cwd(),
      timeout: 10 * 60 * 1000,
      env: process.env,
      maxBuffer: 5 * 1024 * 1024,
    })
    // Inspect latest backup
    let last: { file: string; bytes: number; mtime: string } | null = null
    try {
      const entries = await fs.readdir(BACKUPS_DIR, { withFileTypes: true })
      const files = entries.filter(e => e.isFile() && e.name.endsWith('.tar.gz')).map(e => e.name)
      for (const name of files) {
        const fp = path.join(BACKUPS_DIR, name)
        const st = await fs.stat(fp)
        if (!last || st.mtimeMs > Date.parse(last.mtime)) {
          last = { file: name, bytes: st.size, mtime: st.mtime.toISOString() }
        }
      }
    } catch { /* ignore listing errors */ }
    return NextResponse.json({ ok: true, output: (stdout + (stderr || '')).trim(), last })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    // Attempt to include partial output if available (NodeExecError)
    const stdout = (e as { stdout?: string } | undefined)?.stdout || ''
    const stderr = (e as { stderr?: string } | undefined)?.stderr || ''
    const output = [stdout, stderr].filter(Boolean).join('\n').trim()
    return NextResponse.json({ ok: false, error: 'exec_failed', message: msg, output }, { status: 500 })
  }
}
