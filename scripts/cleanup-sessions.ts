#!/usr/bin/env tsx
import prisma from '../src/lib/db'

async function main() {
  const before = await prisma.session.count()
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  const after = await prisma.session.count()
  console.log(`Sesiones antes: ${before} | después: ${after} | eliminadas: ${before-after}`)
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
