// Utilidad simple para generar una representación ESC/POS (texto plano con secuencias básicas)
// Nota: El envío a la impresora depende del entorno (USB/Ethernet/Serial). Aquí solo generamos el payload.

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
  items: { nombre:string; cantidad:number; unit:string; total:string }[]
  subtotal: string
  itebis?: string
  propina?: string
  impuesto?: string
  descuento?: string
  total: string
  footer?: string
}) {
  const { business, address, rnc, phone, numero, fecha, mesa, subCuenta, nombreCuenta, items, subtotal, itebis, propina, impuesto, descuento, total, footer } = opts
  let out = ''
  out += escposHeader(business)
  if (rnc) out += `RNC: ${rnc}\n`
  if (address) out += `${address}\n`
  if (phone) out += `Tel: ${phone}\n`
  if (rnc || address || phone) out += '\n'
  out += `Ticket #${numero}` + (mesa ? `  Mesa: ${mesa}${nombreCuenta ? ` - ${nombreCuenta}` : (subCuenta ? ` C${subCuenta}` : '')}` : '') + "\n" + fecha + "\n\n"
  out += escposSeparator()
  for (const it of items) {
    out += it.nombre + "\n"
    out += escposLine(`  x${it.cantidad} · ${it.unit}`, it.total)
  }
  out += escposSeparator()
  out += escposLine('Subtotal', subtotal)
  if (itebis) out += escposLine('ITEBIS', itebis)
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
