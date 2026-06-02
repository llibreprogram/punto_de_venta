import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

// Utilidad simple para generar una representación ESC/POS (texto plano con secuencias básicas)
// Nota: El envío a la impresora depende del entorno (USB/Ethernet/Serial). Aquí solo generamos el payload.

export async function getLogoEscposBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  // Si no hay logoUrl configurado, devolver el comando para el logo NV de la impresora (posición 1)
  if (!logoUrl) {
    return Buffer.from([0x1B, 0x61, 0x01, 0x1C, 0x70, 0x01, 0x00, 0x0A, 0x1B, 0x61, 0x00])
  }
  try {
    let imageBuffer: Buffer
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      // Si contiene /uploads/ lo leemos localmente para evitar problemas de red local
      if (logoUrl.includes('/uploads/')) {
        const parts = logoUrl.split('/uploads/')
        const filename = parts[parts.length - 1]
        const localPath = path.join(process.cwd(), 'public', 'uploads', filename)
        imageBuffer = await fs.readFile(localPath)
      } else {
        const res = await fetch(logoUrl)
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        imageBuffer = Buffer.from(await res.arrayBuffer())
      }
    } else {
      const cleanPath = logoUrl.startsWith('/') ? logoUrl.substring(1) : logoUrl
      // Compatibilidad con rutas de Windows/Linux reemplazando / con el separador de plataforma
      const platformPath = cleanPath.split('/').join(path.sep)
      const localPath = path.join(process.cwd(), 'public', platformPath)
      imageBuffer = await fs.readFile(localPath)
    }

    // Procesar la imagen con sharp: redimensionar a 200px de ancho, aplanar fondo transparente a blanco y pasar a escala de grises
    const { data, info } = await sharp(imageBuffer)
      .resize({ width: 200 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const bytesWidth = Math.ceil(info.width / 8)
    const totalBytes = bytesWidth * info.height
    const escposData = Buffer.alloc(totalBytes)

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const grayscaleValue = data[y * info.width + x]
        // Umbral de 128 (valores inferiores a 128 se consideran negro)
        if (grayscaleValue < 128) {
          const byteIndex = y * bytesWidth + Math.floor(x / 8)
          const bitIndex = 7 - (x % 8)
          escposData[byteIndex] |= (1 << bitIndex)
        }
      }
    }

    // Comando ESC/POS para imprimir imagen en modo rastro (GS v 0)
    const header = Buffer.from([
      0x1D, 0x76, 0x30, 0,
      bytesWidth % 256, Math.floor(bytesWidth / 256),
      info.height % 256, Math.floor(info.height / 256)
    ])

    // Alinear al centro (ESC a 1), imprimir imagen, salto de línea, restablecer a izquierda (ESC a 0)
    const alignCenter = Buffer.from([0x1B, 0x61, 0x01])
    const alignLeft = Buffer.from([0x1B, 0x61, 0x00])
    const lineFeeds = Buffer.from("\n\n")

    return Buffer.concat([alignCenter, header, escposData, lineFeeds, alignLeft])
  } catch (e) {
    console.error("Error al procesar logo dinámico con sharp (usando fallback de logo NV):", e)
    // En caso de fallo al leer/procesar la imagen, retornamos el comando del logo NV en memoria 1
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
  const { business, address, rnc, phone, numero, fecha, mesa, subCuenta, nombreCuenta, ncf, ncfTipo, clienteRnc, clienteNombre, items, subtotal, itebis, propina, impuesto, descuento, total, footer } = opts
  let out = ''

  // Comando ESC/POS para abrir el cajón de dinero (Pin 2 y Pin 5)
  out += "\x1B\x70\x00\x1E\x78"
  out += "\x1B\x70\x01\x1E\x78"

  out += escposHeader(business)
  if (rnc) out += `RNC: ${rnc}\n`
  if (address) out += `${address}\n`
  if (phone) out += `Tel: ${phone}\n`
  if (rnc || address || phone) out += '\n'
  out += `Ticket #${numero}` + (mesa ? `  Mesa: ${mesa}${nombreCuenta ? ` - ${nombreCuenta}` : (subCuenta ? ` C${subCuenta}` : '')}` : '') + "\n" + fecha + "\n\n"
  
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
