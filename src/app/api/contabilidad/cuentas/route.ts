/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/contabilidad/cuentas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tree = searchParams.get('tree') === 'true'
    const movimientos = searchParams.get('movimientos') === 'true'
    const idParam = searchParams.get('id')

    if (movimientos && idParam) {
      const cuentaId = parseInt(idParam, 10)
      const apuntes = await prisma.apunteContable.findMany({
        where: {
          cuentaId,
          transaccion: {
            estado: 'POSTEADO'
          }
        },
        include: {
          transaccion: {
            select: {
              numero: true,
              descripcion: true,
              fecha: true,
              referencia: true
            }
          }
        },
        orderBy: {
          transaccion: {
            fecha: 'desc'
          }
        }
      })
      return NextResponse.json({ ok: true, movimientos: apuntes })
    }

    const cuentas = await prisma.cuentaContable.findMany({
      orderBy: { codigo: 'asc' },
      include: tree ? {
        apuntes: {
          where: { transaccion: { estado: 'POSTEADO' } },
          select: { debitoCents: true, creditoCents: true },
        },
      } : undefined,
    })

    if (!tree) {
      return NextResponse.json({ ok: true, cuentas })
    }

    // Convertir a estructura de árbol jerárquico con saldos
    const mapaCuentas: Record<number, any> = {}
    const raices: any[] = []

    cuentas.forEach((c) => {
      const apuntes = (c as any).apuntes || []
      const totalDebito = apuntes.reduce((s: number, a: any) => s + a.debitoCents, 0)
      const totalCredito = apuntes.reduce((s: number, a: any) => s + a.creditoCents, 0)
      const saldo = c.naturaleza === 'DEBITO' ? totalDebito - totalCredito : totalCredito - totalDebito

      const { apuntes: _, ...cuentaSin } = c as any
      mapaCuentas[c.id] = { ...cuentaSin, subCuentas: [], saldoCents: saldo }
    })

    cuentas.forEach((c) => {
      const cuentaEnMapa = mapaCuentas[c.id]
      if (c.padreId) {
        const padre = mapaCuentas[c.padreId]
        if (padre) {
          padre.subCuentas.push(cuentaEnMapa)
        } else {
          raices.push(cuentaEnMapa)
        }
      } else {
        raices.push(cuentaEnMapa)
      }
    })

    return NextResponse.json({ ok: true, cuentas: raices })
  } catch (error: any) {
    console.error('Error al obtener cuentas contables:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST /api/contabilidad/cuentas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo, nombre, padreId } = body

    if (!codigo || !nombre) {
      return NextResponse.json({ ok: false, error: 'Código y nombre son obligatorios.' }, { status: 400 })
    }

    // Verificar si ya existe el código
    const existe = await prisma.cuentaContable.findUnique({
      where: { codigo },
    })

    if (existe) {
      return NextResponse.json({ ok: false, error: `El código ${codigo} ya está en uso.` }, { status: 400 })
    }

    let tipo = body.tipo
    let naturaleza = body.naturaleza

    // Si tiene padre, heredar tipo y naturaleza
    if (padreId) {
      const padre = await prisma.cuentaContable.findUnique({
        where: { id: parseInt(padreId, 10) },
      })
      if (!padre) {
        return NextResponse.json({ ok: false, error: 'La cuenta padre especificada no existe.' }, { status: 400 })
      }
      tipo = padre.tipo
      naturaleza = padre.naturaleza
    } else {
      // Si no tiene padre, tipo y naturaleza son obligatorios
      if (!tipo || !naturaleza) {
        return NextResponse.json(
          { ok: false, error: 'Para cuentas de primer nivel, el tipo y naturaleza son obligatorios.' },
          { status: 400 }
        )
      }
    }

    const nuevaCuenta = await prisma.cuentaContable.create({
      data: {
        codigo,
        nombre,
        tipo,
        naturaleza,
        padreId: padreId ? parseInt(padreId, 10) : null,
      },
    })

    return NextResponse.json({ ok: true, cuenta: nuevaCuenta })
  } catch (error: any) {
    console.error('Error al crear cuenta contable:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
