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
}