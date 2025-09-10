#!/usr/bin/env tsx
import prisma from '../src/lib/db'

async function main() {
  const users = await prisma.usuario.findMany({ select: { id: true, email: true, rol: true, activo: true, createdAt: true } })
  if (!users.length) {
    console.log('No hay usuarios.')
    return
  }
  console.table(users.map(u => ({ id: u.id, email: u.email, rol: u.rol, activo: u.activo, creado: u.createdAt.toISOString() })))
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
