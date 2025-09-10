import crypto from 'crypto'
import prisma from './db'

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'))
}

export async function createSession(userId: number, ttlHours = 12) {
  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000)
  await prisma.session.create({ data: { token, userId, expiresAt } })
  return { token, expiresAt }
}

export async function getSession(token?: string) {
  if (!token) return null
  const session = await prisma.session.findFirst({ where: { token, expiresAt: { gt: new Date() } }, include: { user: true } })
  return session
}

export async function destroySession(token?: string) {
  if (!token) return
  await prisma.session.deleteMany({ where: { token } })
}
