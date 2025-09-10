#!/usr/bin/env tsx
import prisma from '../src/lib/db'

async function main() {
  const before = await prisma.session.count()
  await prisma.session.deleteMany()
  const after = await prisma.session.count()
  console.log(`Sesiones eliminadas: ${before - after} (total ahora: ${after})`)
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
