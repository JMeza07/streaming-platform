import { AuditCategory, AuditSeverity } from '@prisma/client';

export interface CreateAuditLogDto {
  accion: string;
  modulo?: AuditCategory;
  severidad?: AuditSeverity;
  descripcion: string;
  detalles?: Record<string, any> | null;
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
