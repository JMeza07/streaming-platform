import { AuditCategory, AuditSeverity } from '@prisma/client';

export interface CreateAuditLogDto {
  accion: string;
  modulo?: AuditCategory;
  severidad?: AuditSeverity;
  descripcion: string;
  detalles?: Record<string, any> | null;
  /** Estado del registro ANTES del cambio (SRS RF-037) */
  valoresAnteriores?: Record<string, any> | null;
  /** Estado del registro DESPUÉS del cambio (SRS RF-037) */
  valoresNuevos?: Record<string, any> | null;
  ip?: string;
  userAgent?: string;
  entidadTipo?: string;
  entidad?: string;
  entidadId?: string;
  exito?: boolean;
  errorMensaje?: string;
  usuarioId?: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
  usuarioRol?: string;
}
