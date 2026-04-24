import AdminLayout from '@/components/AdminLayout'
import { ButtonsRow } from './widgets'

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function Page() {
  const [health, ready, backups] = await Promise.all([
    fetchJson<{ ok: boolean; db: string; time: string }>(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/health`),
    fetchJson<{ ready: boolean; time?: string }>(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/ready`),
    fetchJson<{ count: number; totalBytes: number; last: { file: string; bytes: number; mtime: string } | null }>(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/backups/status`),
  ])

  const fmtBytes = (n?: number) => {
    if (!n && n !== 0) return '—'
    const units = ['B','KB','MB','GB','TB']
    let i = 0
    let v = n
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
    return `${v.toFixed(1)} ${units[i]}`
  }

  return (
    <AdminLayout title="Salud del sistema">
      <div className="grid gap-4 md:grid-cols-3">
        <section className="p-4 border rounded-lg bg-background/50">
          <h2 className="font-semibold mb-2">Base de datos</h2>
          <p>Health: <span className={health?.db === 'ok' ? 'text-green-600' : 'text-red-600'}>{health?.db ?? '—'}</span></p>
          <p>Ready: <span className={ready?.ready ? 'text-green-600' : 'text-red-600'}>{String(ready?.ready ?? false)}</span></p>
          <div className="mt-2 text-sm opacity-70">Hora: {health?.time ?? '—'}</div>
        </section>
        <section className="p-4 border rounded-lg bg-background/50">
          <h2 className="font-semibold mb-2">Backups</h2>
          <p>Cantidad: {backups?.count ?? '—'}</p>
          <p>Total: {fmtBytes(backups?.totalBytes)}</p>
          <p>Último: {backups?.last?.file ?? '—'} ({fmtBytes(backups?.last?.bytes)})</p>
          <div className="mt-2 text-sm opacity-70">Fecha: {backups?.last?.mtime ?? '—'}</div>
        </section>
        <section className="p-4 border rounded-lg bg-background/50">
          <h2 className="font-semibold mb-2">Sistema</h2>
          <ul className="text-sm">
            <li>Hora servidor: {new Date().toLocaleString()}</li>
            <li>Versión app: {process.env.npm_package_version ?? '—'}</li>
            <li>Node: {process.version}</li>
          </ul>
        </section>
      </div>
      <ButtonsRow />
    </AdminLayout>
  )
}

