#!/usr/bin/env tsx
/**
 * Script para resetear la contraseña de un usuario.
 * Uso:
 *   npx tsx scripts/reset-user-password.ts email@n dominio NuevaClave123
 *   npm run user:reset -- email@local NuevaClave123
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

async function main() {
  const [,, emailArg, newPass] = process.argv
  if (!emailArg || !newPass) {
    console.error('Uso: npx tsx scripts/reset-user-password.ts <email> <nuevaClave>')
    process.exit(1)
  }
  const prisma = new PrismaClient()
  try {
    const user = await prisma.usuario.findUnique({ where: { email: emailArg } })
    if (!user) {
      console.error('Usuario no encontrado:', emailArg)
      process.exit(2)
    }
    await prisma.usuario.update({ where: { email: emailArg }, data: { passwordHash: hashPassword(newPass), activo: true } })
    console.log('Contraseña actualizada para', emailArg)
  } finally {
    await Promise.resolve().then(()=>{})
  }
}

main()
