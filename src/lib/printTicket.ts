/**
 * Imprime un ticket usando un iframe oculto en vez de abrir una ventana nueva.
 * Después de imprimir (o cancelar), el iframe se elimina automáticamente.
 */
export function printTicketUrl(url: string) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'

  // Quitar el parámetro print=1 para que el ticket no auto-imprima dentro del iframe
  // (nosotros controlaremos la impresión desde fuera)
  const printUrl = url.replace(/([?&])print=1(&|$)/, (_, p1, p2) => p2 ? p1 : '')
    .replace(/[?&]$/, '')

  iframe.src = printUrl

  const cleanup = () => {
    try { document.body.removeChild(iframe) } catch {}
  }

  iframe.onload = () => {
    try {
      // Esperar un poco para que el contenido se renderice completamente
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.onafterprint = cleanup
          iframe.contentWindow.print()
          // Fallback: limpiar después de 60s por si afterprint no se dispara
          setTimeout(cleanup, 60000)
        } else {
          cleanup()
        }
      }, 300)
    } catch {
      // Si hay error de CORS (signed links externas), fallback a window.open
      window.open(url, '_blank')
      cleanup()
    }
  }

  iframe.onerror = () => {
    window.open(url, '_blank')
    cleanup()
  }

  document.body.appendChild(iframe)
}

export async function printReceipt(pedidoId: number, ajustes: any) {
  if (ajustes?.printerIp) {
    try {
      const payloadRes = await fetch(`/api/print/ticket/${pedidoId}`, { cache: 'no-store' })
      if (payloadRes.ok) {
        const arrayBuffer = await payloadRes.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        let binaryStr = ''
        for (let i = 0; i < uint8.length; i++) {
          binaryStr += String.fromCharCode(uint8[i])
        }
        const base64Payload = 'base64:' + btoa(binaryStr)

        const sendRes = await fetch('/api/print/network', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: ajustes.printerIp,
            port: ajustes.printerPort || 9100,
            payload: base64Payload
          })
        })
        if (sendRes.ok) {
          return true // Direct network print successful
        }
        console.error('Error de impresión de red:', await sendRes.json().catch(() => ({})))
      }
    } catch (e) {
      console.error('Error de red al intentar imprimir:', e)
    }
  }

  // Fallback to browser print using iframe
  try {
    const linkRes = await fetch(`/api/tickets/signed-link/${pedidoId}`)
    if (linkRes.ok) {
      const j = await linkRes.json()
      printTicketUrl(j.url + (j.url.includes('?') ? '&' : '?') + 'print=1')
    } else {
      printTicketUrl(`/ticket/${pedidoId}?print=1`)
    }
  } catch {
    printTicketUrl(`/ticket/${pedidoId}?print=1`)
  }
  return false
}
