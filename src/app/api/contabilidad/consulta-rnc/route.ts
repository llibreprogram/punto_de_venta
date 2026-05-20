/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rnc = searchParams.get('rnc')
    if (!rnc || (rnc.length !== 9 && rnc.length !== 11)) {
      return NextResponse.json({ error: 'El RNC/Cédula debe tener 9 u 11 dígitos' }, { status: 400 })
    }

    const res = await fetch(`https://api-dgii.dominicantechnology.com/api/v1/rnc/${rnc}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 } // Cachear por 24 horas
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'El servicio de consulta DGII no respondió correctamente' }, { status: 502 })
    }

    const data = await res.json()
    if (!data.exito || !data.data) {
      return NextResponse.json({ error: data.error || 'RNC/Cédula no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      rnc: data.data.rnc,
      razonSocial: data.data.razon_social || data.data.razonSocial,
      estado: data.data.estado
    })
  } catch (err) {
    console.error('Error en consulta-rnc proxy:', err)
    return NextResponse.json({ error: 'Error interno al consultar RNC' }, { status: 500 })
  }
}
