"use client"
import { useToast } from '@/components/ui/Providers'

export function CopySignedLinkButton({ id }: { id: number }) {
  const { push } = useToast()
  const handleClick = async () => {
    try {
      const res = await fetch(`/api/tickets/signed-link/${id}`)
      if (!res.ok) { push('No se pudo generar enlace', 'error'); return }
      const j = await res.json()
      if (!j?.url) { push('Respuesta inválida', 'error'); return }
      await navigator.clipboard.writeText(j.url)
      push('Enlace copiado (válido temporalmente)', 'success')
    } catch {
      push('Error copiando enlace', 'error')
    }
  }
  return (
    <button className="border px-3 py-2 rounded" onClick={handleClick}>Link firmado</button>
  )
}
