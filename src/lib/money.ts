/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'es-ES'
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'EUR'

export function toCurrency(cents: number, locale = LOCALE, currency = CURRENCY) {
  let formatted = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
  if (currency === 'DOP') {
    formatted = formatted.replace(/DOP[\s\u00A0]*/, 'RD$').replace(/RD\$[\s\u00A0]*/, 'RD$')
  }
  return formatted
}

export function sumCents(values: number[]) {
  return values.reduce((acc, v) => acc + v, 0)
}

export function toCents(value: number | string): number {
  if (typeof value === 'number') return Math.round(value * 100)
  const clean = value.replace(/[^0-9.,-]/g, '').replace(',', '.')
  const num = Number(clean)
  if (!isFinite(num)) return 0
  return Math.round(num * 100)
}
