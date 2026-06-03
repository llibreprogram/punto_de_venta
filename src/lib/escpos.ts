import { promises as fs } from 'fs'
import path from 'path'

// Utilidad simple para generar una representación ESC/POS (texto plano con secuencias básicas)
// Nota: El envío a la impresora depende del entorno (USB/Ethernet/Serial). Aquí solo generamos el payload.

export async function getLogoEscposBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  const fsSync = require('fs')
  const debugPath = path.join(process.cwd(), 'public', 'print_debug.log')
  let logContent = `--- Print Debug (${new Date().toISOString()}) ---\n`
  logContent += `Input logoUrl: "${logoUrl}"\n`

  try {
    if (!logoUrl) {
      logContent += `Result: No logoUrl provided. Returning NV logo fallback buffer.\n`
      fsSync.writeFileSync(debugPath, logContent)
      return Buffer.from([0x1B, 0x61, 0x01, 0x1C, 0x70, 0x01, 0x00, 0x0A, 0x1B, 0x61, 0x00])
    }

    let imageBuffer: Buffer
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      if (logoUrl.includes('/uploads/')) {
        const parts = logoUrl.split('/uploads/')
        const filename = parts[parts.length - 1]
        const localPath = path.join(process.cwd(), 'public', 'uploads', filename)
        logContent += `Detected local upload via URL. Reading from: "${localPath}"\n`
        imageBuffer = await fs.readFile(localPath)
      } else {
        logContent += `Fetching logo from URL: "${logoUrl}"\n`
        const res = await fetch(logoUrl)
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        imageBuffer = Buffer.from(await res.arrayBuffer())
      }
    } else {
      const cleanPath = logoUrl.startsWith('/') ? logoUrl.substring(1) : logoUrl
      const platformPath = cleanPath.split('/').join(path.sep)
      const localPath = path.join(process.cwd(), 'public', platformPath)
      logContent += `Reading logo from local path: "${localPath}"\n`
      imageBuffer = await fs.readFile(localPath)
    }

    logContent += `Successfully read image file. Buffer size: ${imageBuffer.length} bytes.\n`

    // Procesar la imagen con sharp
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default || sharpModule
    const { data, info } = await sharp(imageBuffer)
      .resize({ width: 200 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    logContent += `Sharp processed image: width=${info.width}, height=${info.height}\n`

    const bytesWidth = Math.ceil(info.width / 8)
    const totalBytes = bytesWidth * info.height
    const escposData = Buffer.alloc(totalBytes)

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const grayscaleValue = data[y * info.width + x]
        if (grayscaleValue < 128) {
          const byteIndex = y * bytesWidth + Math.floor(x / 8)
          const bitIndex = 7 - (x % 8)
          escposData[byteIndex] |= (1 << bitIndex)
        }
      }
    }

    const header = Buffer.from([
      0x1D, 0x76, 0x30, 0,
      bytesWidth % 256, Math.floor(bytesWidth / 256),
      info.height % 256, Math.floor(info.height / 256)
    ])

    const alignCenter = Buffer.from([0x1B, 0x61, 0x01])
    const alignLeft = Buffer.from([0x1B, 0x61, 0x00])
    const lineFeeds = Buffer.from("\n\n")

    const finalBuffer = Buffer.concat([alignCenter, header, escposData, lineFeeds, alignLeft])
    logContent += `Result: Success. Dynamic ESC/POS raster image generated. Total buffer size: ${finalBuffer.length} bytes.\n`
    fsSync.writeFileSync(debugPath, logContent)

    return finalBuffer
  } catch (e: any) {
    logContent += `Result: Error caught. Message: "${e.message}"\nStack: ${e.stack}\nReturning NV logo fallback buffer.\n`
    fsSync.writeFileSync(debugPath, logContent)
    return Buffer.from([0x1B, 0x61, 0x01, 0x1C, 0x70, 0x01, 0x00, 0x0A, 0x1B, 0x61, 0x00])
  }
}

export function escposHeader(business: string) {
  const ESC = "\x1B"
  return (
    ESC+"@" +               // Initialize
    ESC+"!"+"\x38" +        // Double height & width, bold
    business + "\n" +
    ESC+"!"+"\x00" +        // Normal
    "\n"
  )
}

export function escposLine(left: string, right: string, width = 42) {
  const l = left.length
  const r = right.length
  const spaces = Math.max(1, width - l - r)
  return left + ' '.repeat(spaces) + right + '\n'
}

export function escposSeparator(width=42) {
  return '-'.repeat(width) + '\n'
}

export function escposCut() {
  const GS = "\x1D"; return GS+"V\x00"
}

export function escposTicket(opts: {
  business: string
  address?: string | null
  rnc?: string | null
  phone?: string | null
  numero: number
  fecha: string
  mesa?: string | null
  subCuenta?: number
  nombreCuenta?: string | null
  tipo?: string | null
  ncf?: string | null
  ncfTipo?: string | null
  clienteRnc?: string | null
  clienteNombre?: string | null
  items: { nombre:string; cantidad:number; unit:string; total:string }[]
  subtotal: string
  itebis?: string
  propina?: string
  impuesto?: string
  descuento?: string
  total: string
  footer?: string
}) {
  const { business, address, rnc, phone, numero, fecha, mesa, subCuenta, nombreCuenta, tipo, ncf, ncfTipo, clienteRnc, clienteNombre, items, subtotal, itebis, propina, impuesto, descuento, total, footer } = opts
  let out = ''

  // Comando ESC/POS para abrir el cajón de dinero (Pin 2 y Pin 5)
  out += "\x1B\x70\x00\x1E\x78"
  out += "\x1B\x70\x01\x1E\x78"

  out += escposHeader(business)
  if (rnc) out += `RNC: ${rnc}\n`
  if (address) out += `${address}\n`
  if (phone) out += `Tel: ${phone}\n`
  if (rnc || address || phone) out += '\n'

  let infoCuenta = ''
  if (mesa) {
    infoCuenta = `  Mesa: ${mesa}${nombreCuenta ? ` - ${nombreCuenta}` : (subCuenta ? ` C${subCuenta}` : '')}`
  } else {
    const labelTipo = tipo === 'Delivery' ? 'Delivery' : 'Mostrador'
    infoCuenta = `  ${labelTipo}${nombreCuenta ? `: ${nombreCuenta}` : ''}`
  }
  out += `Ticket #${numero}${infoCuenta}\n${fecha}\n\n`
  
  if (ncf) {
    out += escposSeparator()
    out += ncfTipo === 'B01' ? "FACTURA DE CREDITO FISCAL\n" : "CONSUMIDOR FINAL\n"
    out += `NCF: ${ncf}\n`
    if (clienteRnc) out += `RNC Cliente: ${clienteRnc}\n`
    if (clienteNombre) out += `Razon Social: ${clienteNombre}\n`
    out += escposSeparator()
  }

  out += escposSeparator()
  for (const it of items) {
    out += it.nombre + "\n"
    out += escposLine(`  x${it.cantidad} · ${it.unit}`, it.total)
  }
  out += escposSeparator()
  out += escposLine('Subtotal', subtotal)
  if (itebis) out += escposLine('ITBIS', itebis)
  if (propina) out += escposLine('Propina', propina)
  if (!itebis && !propina && impuesto) out += escposLine('Impuesto', impuesto)
  if (descuento) out += escposLine('Descuento', '-'+descuento)
  out += escposLine('Total', total)
  out += "\n"
  if (footer) out += footer + "\n"
  out += "\n\n"
  out += escposCut()
  return out
}
