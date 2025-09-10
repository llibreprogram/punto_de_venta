export const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'es-ES'
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'EUR'

export function toCurrency(cents: number, locale = LOCALE, currency = CURRENCY) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
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
