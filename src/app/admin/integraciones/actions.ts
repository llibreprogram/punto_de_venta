'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function saveIntegrationMapping(productoId: number, platform: string, externalItemId: string) {
  if (!externalItemId) {
    // Delete mapping if empty
    await prisma.integrationMapping.deleteMany({
      where: { productoId, platform }
    })
  } else {
    // Upsert mapping
    const existing = await prisma.integrationMapping.findFirst({
      where: { productoId, platform }
    })

    if (existing) {
      await prisma.integrationMapping.update({
        where: { id: existing.id },
        data: { externalItemId }
      })
    } else {
      await prisma.integrationMapping.create({
        data: {
          productoId,
          platform,
          externalItemId
        }
      })
    }
  }

  revalidatePath('/admin/integraciones')
  return { success: true }
}
