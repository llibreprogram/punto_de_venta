import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    // Evitar ataques de Directory Traversal
    const safeFilename = path.basename(filename)
    const filepath = path.join(process.cwd(), 'public', 'uploads', safeFilename)
    
    const fileBuffer = await fs.readFile(filepath)
    
    // Determinar el Content-Type según la extensión
    let contentType = 'application/octet-stream'
    const ext = path.extname(safeFilename).toLowerCase()
    if (ext === '.png') contentType = 'image/png'
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
    else if (ext === '.gif') contentType = 'image/gif'
    else if (ext === '.svg') contentType = 'image/svg+xml'
    else if (ext === '.webp') contentType = 'image/webp'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    return new NextResponse('File not found', { status: 404 })
  }
}
