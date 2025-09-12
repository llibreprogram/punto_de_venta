// Utility to generate signed ticket URLs with expiration.
// Server-side (Node) usage to create a link a kiosk / cliente puede abrir sin sesión.
// Signature format: HMAC-SHA256 over `${id}.${exp}` (exp = unix seconds expiration).
// URL params: ?exp=<unix>&sig=<base64url>

import crypto from 'crypto'

const SECRET = process.env.TICKET_SIGN_SECRET

if (!SECRET) {
  console.warn('[ticketSign] WARNING: TICKET_SIGN_SECRET is not set. Signed links generation will still work using a transient in-memory secret (NOT recommended for production).')
}

// Fallback (non persistent) secret for dev if not provided
const fallbackSecret = (() => crypto.randomBytes(32).toString('hex'))()
const activeSecret = SECRET || fallbackSecret

function base64Url(buf: Buffer) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function generateSignedTicketUrl(id: number, {
  hostOrigin,
  ttlSeconds = 600 // 10 minutes default
}: { hostOrigin: string; ttlSeconds?: number }) {
  if (!hostOrigin) throw new Error('hostOrigin required (e.g. https://pos.midominio.com)')
  if (!Number.isInteger(id)) throw new Error('id debe ser entero')
  const now = Math.floor(Date.now() / 1000)
  const exp = now + ttlSeconds
  const payload = `${id}.${exp}`
  const sig = base64Url(crypto.createHmac('sha256', activeSecret).update(payload).digest())
  return `${hostOrigin.replace(/\/$/, '')}/ticket/${id}?exp=${exp}&sig=${sig}`
}

export function verifySignatureNode(id: number, exp: number, sig: string): boolean {
  if (!Number.isInteger(id) || !Number.isInteger(exp) || !sig) return false
  const now = Math.floor(Date.now() / 1000)
  if (exp < now) return false // expired
  if (exp - now > 86400) return false // more than 24h in future → reject
  const payload = `${id}.${exp}`
  const expected = base64Url(crypto.createHmac('sha256', activeSecret).update(payload).digest())
  return timingSafeEqual(expected, sig)
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export type SignedTicketLinkOptions = {
  hostOrigin: string
  ttlSeconds?: number
}
