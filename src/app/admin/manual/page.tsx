import AdminLayout from '@/components/AdminLayout'
import { promises as fs } from 'fs'
import path from 'path'
import { marked } from 'marked'

export default async function Page() {
  // Try to read manual from repo root
  const root = process.cwd()
  const manualPath = path.join(root, 'MANUAL_DE_USUARIO.md')
  let html = '<p>No se encontró el manual.</p>'
  try {
    const md = await fs.readFile(manualPath, 'utf8')
    html = await marked.parse(md)
  } catch {/* ignore */}
  return (
    <AdminLayout title="Manual de Usuario">
      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </AdminLayout>
  )
}
