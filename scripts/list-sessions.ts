#!/usr/bin/env tsx
import prisma from '../src/lib/db'

async function main() {
  const sessions = await prisma.session.findMany({ include: { user: true }, orderBy: { expiresAt: 'asc' } })
  if (!sessions.length) {
    console.log('No hay sesiones activas')
    return
  }
  const now = Date.now()
  console.table(sessions.map(s => ({
    id: s.id,
    user: s.user.email,
    rol: s.user.rol,
    expira: s.expiresAt.toISOString(),
    minutosRestantes: Math.max(0, Math.round((s.expiresAt.getTime() - now)/60000)),
    tokenPrefijo: s.token.slice(0,8)
  })))
  console.log('Total:', sessions.length)
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
