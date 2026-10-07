/**
 * Utilidad de cálculo de estados operativos SGVS (SRS Oasis Virtual Store 2026 - Regla RN-004 y F1.4.1)
 *
 * Estados:
 *  - LIBRE: Cuenta/perfil sin cliente activo o vencida con clave rotada, disponible para venta.
 *  - VENDIDA: Cliente con servicio activo vigente y credenciales al día.
 *  - CORTAR: Pago vencido (FALTAN_DIAS <= 0) y clave aún no cambiada (requiere suspensión/corte de acceso).
 *  - ERROR: Inconsistencia operativa que requiere revisión manual.
 */

export interface SgvsStateInput {
  fechaVencimiento: Date | string;
  fechaInicio?: Date | string;
  fechaUltimoCambioClave?: Date | string | null;
  estadoSuscripcion?: string;
}

export interface SgvsStateResult {
  faltanDias: number;
  estadoPago: 'Ok' | 'Pagar';
  accionClave: 'Ok' | 'Cambiar Clave';
  estadoLibre: 'LIBRE' | 'VENDIDA' | 'CORTAR' | 'ERROR';
  esVencido: boolean;
  requiereCambioClave: boolean;
}

export function calculateSgvsState(input: SgvsStateInput): SgvsStateResult {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const vence = new Date(input.fechaVencimiento);
  vence.setHours(0, 0, 0, 0);

  // Cálculo de días restantes (positivo = vigente, <= 0 = vencido/pagar)
  const diffTime = vence.getTime() - now.getTime();
  const faltanDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const estadoPago: 'Ok' | 'Pagar' = faltanDias > 0 ? 'Ok' : 'Pagar';

  // Regla ACCION = 'Cambiar Clave' cuando la fecha de vencimiento es posterior a la última fecha de cambio de clave
  const fechaCambio = input.fechaUltimoCambioClave ? new Date(input.fechaUltimoCambioClave) : null;
  let accionClave: 'Ok' | 'Cambiar Clave' = 'Ok';

  if (!fechaCambio || vence.getTime() > fechaCambio.getTime()) {
    accionClave = 'Cambiar Clave';
  } else {
    accionClave = 'Ok';
  }

  // Regla RN-004 del SRS:
  // ESTADO='Pagar' AND ACCION='Ok'           => LIBRE
  // ESTADO='Pagar' AND ACCION='Cambiar Clave' => CORTAR
  // ESTADO='Ok'    AND ACCION='Cambiar Clave' => VENDIDA
  // ESTADO='Ok'    AND ACCION='Ok'           => VENDIDA (o OK)
  let estadoLibre: 'LIBRE' | 'VENDIDA' | 'CORTAR' | 'ERROR' = 'ERROR';

  if (estadoPago === 'Pagar' && accionClave === 'Ok') {
    estadoLibre = 'LIBRE';
  } else if (estadoPago === 'Pagar' && accionClave === 'Cambiar Clave') {
    estadoLibre = 'CORTAR';
  } else if (estadoPago === 'Ok' && accionClave === 'Cambiar Clave') {
    estadoLibre = 'VENDIDA';
  } else if (estadoPago === 'Ok' && accionClave === 'Ok') {
    estadoLibre = 'VENDIDA';
  }

  return {
    faltanDias,
    estadoPago,
    accionClave,
    estadoLibre,
    esVencido: faltanDias <= 0,
    requiereCambioClave: accionClave === 'Cambiar Clave',
  };
}
