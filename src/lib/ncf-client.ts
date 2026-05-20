/**
 * © 2026 Rafael Llibre. Todos los derechos reservados.
 * Contacto: haciendallibre@gmail.com
 * Prohibida la reproducción sin autorización del propietario.
 * Protegido por Ley 65-00 (Rep. Dominicana).
 */

/**
 * Valida matemáticamente una Cédula dominicana utilizando el algoritmo del dígito verificador.
 */
export function validarCedula(cedula: string): boolean {
  const clean = cedula.replace(/[^0-9]/g, '')
  if (clean.length !== 11) return false

  const verificador = parseInt(clean[10], 10)
  let suma = 0
  const pesos = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2]

  for (let i = 0; i < 10; i++) {
    let mult = parseInt(clean[i], 10) * pesos[i]
    if (mult > 9) {
      mult = Math.floor(mult / 10) + (mult % 10)
    }
    suma += mult
  }

  const esperado = (10 - (suma % 10)) % 10
  return esperado === verificador
}

// Lista de RNCs especiales que no cumplen la regla matemática pero son válidos según la DGII
const RNC_WHITELIST = new Set([
  '101581601', '101582245', '101595422', '101595785', '10233317', 
  '131188691', '401007374', '501341601', '501378067', '501620371', 
  '501651319', '501651823', '501651845', '501651926', '501656006', 
  '501658167', '501670785', '501676936', '501680158', '504654542', 
  '504680029', '504681442', '505038691'
])

/**
 * Valida matemáticamente un RNC dominicano utilizando el algoritmo de pesos específicos.
 */
export function validarRnc(rnc: string): boolean {
  const clean = rnc.replace(/[^0-9]/g, '')
  if (clean.length !== 9) return false
  if (RNC_WHITELIST.has(clean)) return true

  const verificador = parseInt(clean[8], 10)
  let suma = 0
  const pesos = [7, 9, 8, 6, 5, 4, 3, 2]

  for (let i = 0; i < 8; i++) {
    suma += parseInt(clean[i], 10) * pesos[i]
  }

  const resto = suma % 11
  const esperado = ((10 - resto) % 9) + 1

  return esperado === verificador
}

/**
 * Valida un documento de identidad y retorna su tipo.
 */
export function validarDocumentoIdentidad(documento: string): {
  valido: boolean
  tipo: 'RNC' | 'CEDULA' | 'DESCONOCIDO'
} {
  const clean = documento.replace(/[^0-9]/g, '')
  if (clean.length === 9) {
    return { valido: validarRnc(clean), tipo: 'RNC' }
  } else if (clean.length === 11) {
    return { valido: validarCedula(clean), tipo: 'CEDULA' }
  }
  return { valido: false, tipo: 'DESCONOCIDO' }
}
