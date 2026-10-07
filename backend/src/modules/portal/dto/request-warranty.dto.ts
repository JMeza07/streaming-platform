import { IsUUID, IsString, IsOptional, IsIn } from 'class-validator';

export class RequestWarrantyDto {
  @IsUUID()
  subscriptionId: string;

  @IsString()
  @IsIn([
    'clave_incorrecta',
    'pantalla_bloqueada',
    'perfil_borrado',
    'error_sistema',
    'otro'
  ])
  motivoReporte: string;

  @IsOptional()
  @IsString()
  descripcionAdicional?: string;

  @IsOptional()
  @IsString()
  evidenciaUrl?: string; // URL de la imagen/video del error

  @IsOptional()
  @IsString()
  claveReportada?: string; // Clave ingresada por el cliente para verificar coincidencia

  @IsOptional()
  @IsString()
  tipoError?: string; // Clasificación detallada del error (RF-020)
}