/**
 * Motor de Cálculo de Nómina — República Dominicana
 * Implementa toda la lógica fiscal conforme al Código de Trabajo (Ley 16-92),
 * SDSS (Seguridad Social) y DGII (ISR).
 * 
 * Todos los montos se manejan en centavos (Int) para evitar problemas de punto flotante.
 */

// Tipos para la configuración
export interface ConfigNominaData {
  sfsPct: number;
  afpPct: number;
  sfsPatronalPct: number;
  afpPatronalPct: number;
  srlPct: number;
  infotepPct: number;
  topeSfsCents: number;
  topeAfpCents: number;
  topeSrlCents: number;
  isrExentoCents: number;
  isrTramo1LimiteCents: number;
  isrTramo2LimiteCents: number;
  isrTramo1Pct: number;
  isrTramo2Pct: number;
  isrTramo3Pct: number;
  isrTramo1FijoCents: number;
  isrTramo2FijoCents: number;
  recargoExtraDiurna: number;
  recargoExtraNocturna: number;
  recargoFeriado: number;
  horasSemanales: number;
  horasDiarias: number;
  propinaDistribucion: Record<string, number>; // {"Servicio":40,"Cocina":35,...}
}

// Valores por defecto (2026)
export const CONFIG_DEFAULTS: ConfigNominaData = {
  sfsPct: 3.04,
  afpPct: 2.87,
  sfsPatronalPct: 7.09,
  afpPatronalPct: 7.10,
  srlPct: 1.00,
  infotepPct: 1.00,
  topeSfsCents: 23223000,   // RD$ 232,230.00
  topeAfpCents: 46446000,   // RD$ 464,460.00
  topeSrlCents: 9289200,    // RD$ 92,892.00
  isrExentoCents: 41622000,   // RD$ 416,220.00
  isrTramo1LimiteCents: 62432900, // RD$ 624,329.00
  isrTramo2LimiteCents: 86712300, // RD$ 867,123.00
  isrTramo1Pct: 15,
  isrTramo2Pct: 20,
  isrTramo3Pct: 25,
  isrTramo1FijoCents: 3121600,  // RD$ 31,216.00
  isrTramo2FijoCents: 7977600,  // RD$ 79,776.00
  recargoExtraDiurna: 35,
  recargoExtraNocturna: 54,
  recargoFeriado: 100,
  horasSemanales: 44,
  horasDiarias: 8,
  propinaDistribucion: { Servicio: 40, Cocina: 35, Barra: 15, Auxiliar: 10 },
};

export interface TSSResult {
  sfsCents: number;
  afpCents: number;
  totalCents: number;
}

export interface PatronalResult {
  sfsPatronalCents: number;
  afpPatronalCents: number;
  srlCents: number;
  infotepCents: number;
  totalCents: number;
}

export interface HorasExtrasResult {
  totalCents: number;
  detalle: {
    diurnasCents: number;
    nocturnasCents: number;
    feriadoCents: number;
  };
}

export interface NominaCalculada {
  // Ingresos salariales (base para TSS/ISR)
  salarioBaseCents: number;
  horasExtrasCents: number;
  comisionesCents: number;
  bonosCents: number;
  otrosIngresosCents: number;
  totalDevengadoSalarialCents: number; // Solo ingresos salariales (sin propina)
  // Propina legal (Art. 228 CT — NO es salario, Art. 197 CT)
  propinaCents: number;
  // Total devengado (incluye propina para referencia)
  totalDevengadoCents: number;
  // Deducciones legales (calculadas SOLO sobre totalDevengadoSalarialCents)
  sfsCents: number;
  afpCents: number;
  isrCents: number;
  totalDeduccionesLegalesCents: number;
  // Deducciones voluntarias
  adelantoCents: number;
  otrasDeduccionesCents: number;
  totalDeduccionesCents: number;
  // Patronal (calculado SOLO sobre base salarial)
  sfsPatronalCents: number;
  afpPatronalCents: number;
  srlCents: number;
  infotepCents: number;
  totalPatronalCents: number;
  // Netos
  salarioNetoCents: number;         // Salario neto sin propina (ingresos salariales - deducciones)
  totalRecibirCents: number;        // Salario neto + propina = lo que recibe el empleado
  // Horas extras desglose
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasExtraFeriado: number;
}

export interface PrestacionesResult {
  regaliaProporcionalCents: number;
  vacacionesCents: number;
  preaviso: { dias: number; montoCents: number };
  cesantia: { dias: number; montoCents: number };
  totalCents: number;
  detalles: {
    antiguedadAnios: number;
    antiguedadMeses: number;
    salarioDiarioCents: number;
    diasVacaciones: number;
  };
}

/**
 * Auto-clasificación de empresa según cantidad de empleados
 */
export type ClasificacionEmpresa = 'MICRO' | 'PEQUENA' | 'MEDIANA' | 'GRANDE';

export function clasificarEmpresa(cantidadEmpleados: number): ClasificacionEmpresa {
  if (cantidadEmpleados <= 10) return 'MICRO';
  if (cantidadEmpleados <= 50) return 'PEQUENA';
  if (cantidadEmpleados <= 150) return 'MEDIANA';
  return 'GRANDE';
}

export function salarioMinimoRD(clasificacion: ClasificacionEmpresa): number {
  // Salarios mínimos 2026 en centavos
  const minimos: Record<ClasificacionEmpresa, number> = {
    'MICRO': 1699320,   // RD$ 16,993.20
    'PEQUENA': 1842120, // RD$ 18,421.20
    'MEDIANA': 2748960, // RD$ 27,489.60
    'GRANDE': 2998800,  // RD$ 29,988.00
  };
  return minimos[clasificacion];
}

/**
 * Calcula la retención de TSS del empleado (SFS + AFP)
 * Respeta los topes de cotización vigentes.
 */
export function calcularTSS(salarioMensualCents: number, config: ConfigNominaData): TSSResult {
  // SFS: 3.04% con tope
  const baseSfs = Math.min(salarioMensualCents, config.topeSfsCents);
  const sfsCents = Math.round(baseSfs * config.sfsPct / 100);

  // AFP: 2.87% con tope
  const baseAfp = Math.min(salarioMensualCents, config.topeAfpCents);
  const afpCents = Math.round(baseAfp * config.afpPct / 100);

  return {
    sfsCents,
    afpCents,
    totalCents: sfsCents + afpCents,
  };
}

/**
 * Calcula el ISR mensual aplicando la escala progresiva.
 * Base imponible = Salario Bruto Mensual - TSS (SFS + AFP)
 */
export function calcularISR(salarioMensualBrutoCents: number, tssTotalCents: number, config: ConfigNominaData): number {
  const baseImponibleAnual = (salarioMensualBrutoCents - tssTotalCents) * 12;

  if (baseImponibleAnual <= config.isrExentoCents) {
    return 0;
  }

  let isrAnual: number;

  if (baseImponibleAnual <= config.isrTramo1LimiteCents) {
    // Tramo 1: 15% sobre excedente de exento
    isrAnual = Math.round((baseImponibleAnual - config.isrExentoCents) * config.isrTramo1Pct / 100);
  } else if (baseImponibleAnual <= config.isrTramo2LimiteCents) {
    // Tramo 2: Fijo + 20% sobre excedente
    isrAnual = config.isrTramo1FijoCents + Math.round((baseImponibleAnual - config.isrTramo1LimiteCents) * config.isrTramo2Pct / 100);
  } else {
    // Tramo 3: Fijo + 25% sobre excedente
    isrAnual = config.isrTramo2FijoCents + Math.round((baseImponibleAnual - config.isrTramo2LimiteCents) * config.isrTramo3Pct / 100);
  }

  // Retorno mensual (dividido entre 12)
  return Math.round(isrAnual / 12);
}

/**
 * Calcula los aportes patronales
 */
export function calcularPatronal(salarioMensualCents: number, config: ConfigNominaData): PatronalResult {
  const baseSfs = Math.min(salarioMensualCents, config.topeSfsCents);
  const baseAfp = Math.min(salarioMensualCents, config.topeAfpCents);
  const baseSrl = Math.min(salarioMensualCents, config.topeSrlCents);

  const sfsPatronalCents = Math.round(baseSfs * config.sfsPatronalPct / 100);
  const afpPatronalCents = Math.round(baseAfp * config.afpPatronalPct / 100);
  const srlCents = Math.round(baseSrl * config.srlPct / 100);
  const infotepCents = Math.round(salarioMensualCents * config.infotepPct / 100);

  return {
    sfsPatronalCents,
    afpPatronalCents,
    srlCents,
    infotepCents,
    totalCents: sfsPatronalCents + afpPatronalCents + srlCents + infotepCents,
  };
}

/**
 * Calcula el valor de las horas extras según tipo
 */
export function calcularHorasExtras(
  salarioMensualCents: number,
  horasDiurnas: number,
  horasNocturnas: number,
  horasFeriado: number,
  config: ConfigNominaData
): HorasExtrasResult {
  // Valor hora normal = salario mensual / (horas semanales * 4.33)
  const horasMensuales = config.horasSemanales * 4.33;
  const valorHoraCents = salarioMensualCents / horasMensuales;

  const diurnasCents = Math.round(horasDiurnas * valorHoraCents * (1 + config.recargoExtraDiurna / 100));
  const nocturnasCents = Math.round(horasNocturnas * valorHoraCents * (1 + config.recargoExtraNocturna / 100));
  const feriadoCents = Math.round(horasFeriado * valorHoraCents * (1 + config.recargoFeriado / 100));

  return {
    totalCents: diurnasCents + nocturnasCents + feriadoCents,
    detalle: {
      diurnasCents,
      nocturnasCents,
      feriadoCents,
    },
  };
}

interface ExtrasNomina {
  horasExtraDiurnas?: number;
  horasExtraNocturnas?: number;
  horasExtraFeriado?: number;
  comisionesCents?: number;
  bonosCents?: number;
  propinaCents?: number;
  otrosIngresosCents?: number;
  adelantoCents?: number;
  otrasDeduccionesCents?: number;
}

/**
 * Calcula una nómina QUINCENAL completa para un empleado.
 * Las retenciones de TSS e ISR se calculan sobre la base mensual
 * y luego se dividen entre 2 para el periodo quincenal.
 */
export function calcularNominaQuincenal(
  salarioMensualCents: number,
  extras: ExtrasNomina,
  config: ConfigNominaData
): NominaCalculada {
  // Salario quincenal base
  const salarioQuincenalBase = Math.round(salarioMensualCents / 2);

  // Horas extras (se calculan sobre base mensual)
  const horasExtrasResult = calcularHorasExtras(
    salarioMensualCents,
    extras.horasExtraDiurnas || 0,
    extras.horasExtraNocturnas || 0,
    extras.horasExtraFeriado || 0,
    config
  );

  // Ingresos salariales (sin propina)
  const comisionesCents = extras.comisionesCents || 0;
  const bonosCents = extras.bonosCents || 0;
  const otrosIngresosCents = extras.otrosIngresosCents || 0;

  // PROPINA LEGAL — Art. 228 Código de Trabajo
  // NO es salario (Art. 197 CT) — NO cotiza TSS, NO genera ISR, NO entra en prestaciones
  const propinaCents = extras.propinaCents || 0;

  // Total devengado SALARIAL (base para TSS/ISR — SIN propina)
  const totalDevengadoSalarialCents = salarioQuincenalBase
    + horasExtrasResult.totalCents
    + comisionesCents
    + bonosCents
    + otrosIngresosCents;

  // Total devengado completo (con propina, solo para referencia)
  const totalDevengadoCents = totalDevengadoSalarialCents + propinaCents;

  // Para TSS e ISR: proyectar a mensual SOLO la base salarial (excluyendo propinas)
  const salarioBrutoMensualEstimado = salarioMensualCents + (horasExtrasResult.totalCents * 2) + (comisionesCents * 2);

  // TSS sobre base salarial mensual, luego quincenal
  const tss = calcularTSS(salarioBrutoMensualEstimado, config);
  const sfsCentsQuincenal = Math.round(tss.sfsCents / 2);
  const afpCentsQuincenal = Math.round(tss.afpCents / 2);

  // ISR sobre base salarial mensual, luego quincenal
  const isrMensual = calcularISR(salarioBrutoMensualEstimado, tss.totalCents, config);
  const isrQuincenal = Math.round(isrMensual / 2);

  const totalDeduccionesLegalesCents = sfsCentsQuincenal + afpCentsQuincenal + isrQuincenal;

  // Deducciones voluntarias
  const adelantoCents = extras.adelantoCents || 0;
  const otrasDeduccionesCents = extras.otrasDeduccionesCents || 0;

  const totalDeduccionesCents = totalDeduccionesLegalesCents + adelantoCents + otrasDeduccionesCents;

  // Aportes patronales (calculados sobre base salarial, sin propina)
  const patronal = calcularPatronal(salarioBrutoMensualEstimado, config);

  // Salario neto (sin propina)
  const salarioNetoCents = totalDevengadoSalarialCents - totalDeduccionesCents;

  // Total a recibir = salario neto + propina
  const totalRecibirCents = salarioNetoCents + propinaCents;

  return {
    salarioBaseCents: salarioQuincenalBase,
    horasExtrasCents: horasExtrasResult.totalCents,
    comisionesCents,
    bonosCents,
    otrosIngresosCents,
    totalDevengadoSalarialCents,
    propinaCents,
    totalDevengadoCents,
    sfsCents: sfsCentsQuincenal,
    afpCents: afpCentsQuincenal,
    isrCents: isrQuincenal,
    totalDeduccionesLegalesCents,
    adelantoCents,
    otrasDeduccionesCents,
    totalDeduccionesCents,
    sfsPatronalCents: Math.round(patronal.sfsPatronalCents / 2),
    afpPatronalCents: Math.round(patronal.afpPatronalCents / 2),
    srlCents: Math.round(patronal.srlCents / 2),
    infotepCents: Math.round(patronal.infotepCents / 2),
    totalPatronalCents: Math.round(patronal.totalCents / 2),
    salarioNetoCents,
    totalRecibirCents,
    horasExtraDiurnas: extras.horasExtraDiurnas || 0,
    horasExtraNocturnas: extras.horasExtraNocturnas || 0,
    horasExtraFeriado: extras.horasExtraFeriado || 0,
  };
}

/**
 * Calcula prestaciones laborales (liquidación) de un empleado.
 * @param salarioMensualCents - Salario mensual base en centavos
 * @param fechaIngreso - Fecha de inicio del contrato
 * @param fechaSalida - Fecha de terminación
 * @param tipoTerminacion - "DESAHUCIO" (el empleador despide sin causa),
 *                          "DESPIDO" (el empleador despide con causa),
 *                          "RENUNCIA" (el empleado renuncia),
 *                          "MUTUO_ACUERDO"
 */
export function calcularPrestaciones(
  salarioMensualCents: number,
  fechaIngreso: Date,
  fechaSalida: Date,
  tipoTerminacion: 'DESAHUCIO' | 'DESPIDO' | 'RENUNCIA' | 'MUTUO_ACUERDO'
): PrestacionesResult {
  const msEnDia = 1000 * 60 * 60 * 24;
  const diasTotales = Math.floor((fechaSalida.getTime() - fechaIngreso.getTime()) / msEnDia);
  const meses = diasTotales / 30.44;
  const anios = meses / 12;
  const aniosCompletos = Math.floor(anios);

  const salarioDiarioCents = Math.round(salarioMensualCents / 23.83); // Días laborables promedio

  // --- Vacaciones proporcionales ---
  const diasVacaciones = aniosCompletos >= 5 ? 18 : 14;
  // Proporcional al tiempo trabajado en el último año
  const mesesUltimoAnio = meses - (aniosCompletos * 12);
  const vacacionesProporcionales = mesesUltimoAnio >= 5 ? Math.round(diasVacaciones * mesesUltimoAnio / 12) : 0;
  const vacacionesCents = vacacionesProporcionales * salarioDiarioCents;

  // --- Regalía pascual proporcional ---
  // 1/12 del salario ordinario devengado durante el año en curso
  const mesesAnioActual = fechaSalida.getMonth(); // Meses transcurridos del año
  const regaliaProporcionalCents = Math.round(salarioMensualCents * mesesAnioActual / 12);

  // --- Preaviso (solo en DESAHUCIO y RENUNCIA) ---
  let preaviso = { dias: 0, montoCents: 0 };
  if (tipoTerminacion === 'DESAHUCIO' || tipoTerminacion === 'RENUNCIA') {
    let diasPreaviso = 0;
    if (meses >= 3 && meses < 6) diasPreaviso = 7;
    else if (meses >= 6 && meses < 12) diasPreaviso = 14;
    else if (meses >= 12) diasPreaviso = 28;

    preaviso = {
      dias: diasPreaviso,
      montoCents: diasPreaviso * salarioDiarioCents,
    };
  }

  // --- Cesantía (solo en DESAHUCIO) ---
  let cesantia = { dias: 0, montoCents: 0 };
  if (tipoTerminacion === 'DESAHUCIO') {
    let diasCesantia = 0;
    if (meses >= 3 && meses < 6) {
      diasCesantia = 6;
    } else if (meses >= 6 && meses < 12) {
      diasCesantia = 13;
    } else if (aniosCompletos >= 1 && aniosCompletos <= 5) {
      diasCesantia = 21 * aniosCompletos;
    } else if (aniosCompletos > 5) {
      diasCesantia = 23 * aniosCompletos;
    }

    cesantia = {
      dias: diasCesantia,
      montoCents: diasCesantia * salarioDiarioCents,
    };
  }

  const totalCents = regaliaProporcionalCents + vacacionesCents + preaviso.montoCents + cesantia.montoCents;

  return {
    regaliaProporcionalCents,
    vacacionesCents,
    preaviso,
    cesantia,
    totalCents,
    detalles: {
      antiguedadAnios: aniosCompletos,
      antiguedadMeses: Math.floor(meses),
      salarioDiarioCents,
      diasVacaciones: vacacionesProporcionales,
    },
  };
}

/**
 * Calcula la regalía pascual (salario de navidad) para un año dado.
 * Es la doceava parte (1/12) del salario ordinario devengado en el año.
 */
export function calcularRegaliaPascual(
  salarioMensualCents: number,
  mesesTrabajadosEnAnio: number
): number {
  // Salario devengado en el año = salario mensual * meses trabajados
  const devengadoAnual = salarioMensualCents * mesesTrabajadosEnAnio;
  return Math.round(devengadoAnual / 12);
}

/**
 * Formato RD$ para mostrar centavos como moneda
 */
export function formatRD(cents: number): string {
  const value = cents / 100;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Genera el código del periodo quincenal
 * Q1 = 1-15, Q2 = 16-fin de mes
 */
export function generarPeriodoQuincenal(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const quincena = fecha.getDate() <= 15 ? 'Q1' : 'Q2';
  return `${year}-${month}-${quincena}`;
}

/**
 * Parsea un periodo quincenal a sus fechas de inicio y fin
 */
export function parsearPeriodo(periodo: string): { inicio: Date; fin: Date } {
  const [yearStr, monthStr, quincena] = periodo.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-indexed

  if (quincena === 'Q1') {
    return {
      inicio: new Date(year, month, 1),
      fin: new Date(year, month, 15),
    };
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      inicio: new Date(year, month, 16),
      fin: new Date(year, month, lastDay),
    };
  }
}
