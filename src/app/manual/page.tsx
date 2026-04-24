import { promises as fs } from 'fs'
import path from 'path'
import { marked } from 'marked'

export default async function Page() {
  const root = process.cwd()
  const manualPath = path.join(root, 'MANUAL_DE_USUARIO.md')
  let html = '<p>No se encontró el manual.</p>'
  try {
    const md = await fs.readFile(manualPath, 'utf8')
    html = await marked.parse(md)
  } catch { /* ignore */ }
  return (
    <main className="p-4 mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">Manual de Usuario</h1>
      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  )
}
